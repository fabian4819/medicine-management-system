const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration menggunakan tabel yang sudah ada
const aivenMySQLConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false,
        ca: process.env.DB_SSL_CA
    },
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 5, // Reduced for serverless
    queueLimit: 0,
    multipleStatements: false,
    dateStrings: true,
    charset: 'utf8mb4',
    acquireTimeout: 30000, // Reduced timeout for serverless
    timeout: 30000
};

const localMySQLConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'medicine_management',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    charset: 'utf8mb4'
};

const isProduction = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
const useAiven = process.env.USE_AIVEN === 'true' || isProduction;

// Create connection pool
const pool = mysql.createPool(useAiven ? aivenMySQLConfig : localMySQLConfig);

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT NOW() as current_time');
        connection.release();
        console.log(`✅ MySQL connection successful (${useAiven ? 'Aiven' : 'Local'})`);
        console.log('Current time:', rows[0].current_time);
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        throw error;
    }
}

async function createCompatibilityViews() {
    try {
        console.log('🔧 Creating compatibility views...');
        
        const views = [
            // View untuk patients - simple mapping
            `CREATE OR REPLACE VIEW patients AS
            SELECT 
                id_pengguna as id,
                CONCAT('RM', LPAD(id_pengguna, 6, '0')) as rm_number,
                nama_lengkap as name,
                tanggal_lahir as birth_date,
                CASE 
                    WHEN jenis_kelamin = 'Laki-Laki' THEN 'L'
                    WHEN jenis_kelamin = 'Perempuan' THEN 'P'
                    ELSE 'L'
                END as gender,
                '' as phone,
                '' as address,
                created_at,
                updated_at
            FROM pengguna`,

            // View untuk medicines dengan proper grouping
            `CREATE OR REPLACE VIEW medicines AS
            SELECT 
                ROW_NUMBER() OVER (ORDER BY nama_obat) as id,
                nama_obat as name,
                'Obat' as type,
                '' as dosage,
                CONCAT('Obat ', nama_obat) as description,
                MIN(created_at) as created_at
            FROM penerimaan_obat
            WHERE nama_obat IS NOT NULL AND nama_obat != ''
            GROUP BY nama_obat`,

            // View untuk prescriptions - simplified
            `CREATE OR REPLACE VIEW prescriptions AS
            SELECT 
                r.id_resep as id,
                r.id_pengguna as patient_id,
                r.id_resep as medicine_id,
                'Dokter' as doctor_name,
                'Sesuai petunjuk dokter' as dosage_instruction,
                3 as frequency_per_day,
                7 as duration_days,
                DATE(r.created_at) as prescription_date,
                r.created_at
            FROM resep r
            WHERE r.id_pengguna IS NOT NULL`
        ];

        for (let i = 0; i < views.length; i++) {
            try {
                await pool.execute(views[i]);
                console.log(`✅ View ${i + 1}/${views.length} created successfully`);
            } catch (error) {
                console.log(`⚠️ View ${i + 1} creation warning:`, error.message);
                // Continue with next view
            }
        }
        
        console.log('✅ Compatibility views setup completed');
    } catch (error) {
        console.error('❌ Error creating compatibility views:', error.message);
        // Don't throw error, let the app continue
    }
}

// Initialize views on startup (but don't block)
if (isProduction) {
    createCompatibilityViews().catch(error => {
        console.log('⚠️ Views creation failed, but continuing:', error.message);
    });
}

// Enhanced connection pool error handling
pool.on('error', (err) => {
    console.error('❌ Database pool error:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('🔄 Attempting to reconnect to database...');
    } else if (err.code === 'ER_CON_COUNT_ERROR') {
        console.log('⚠️ Too many database connections');
    } else if (err.code === 'ECONNREFUSED') {
        console.log('❌ Database connection refused');
    }
});

// Graceful cleanup for serverless (not really needed but good practice)
process.on('SIGTERM', async () => {
    console.log('📴 Cleaning up database connections...');
    try {
        await pool.end();
    } catch (error) {
        console.error('Error closing pool:', error.message);
    }
});

module.exports = {
    pool,
    testConnection,
    createCompatibilityViews,
    useAiven,
    isProduction
};