const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration menggunakan tabel yang sudah ada
const aivenMySQLConfig = {
    host: process.env.DB_HOST || 'your-aiven-mysql-host.aivencloud.com',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASSWORD || 'your-password',
    database: process.env.DB_NAME || 'defaultdb',
    ssl: {
        rejectUnauthorized: false,
        ca: process.env.DB_SSL_CA
    },
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    multipleStatements: false,
    dateStrings: true,
    charset: 'utf8mb4'
};

const localMySQLConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'medicine_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
};

const isProduction = process.env.NODE_ENV === 'production';
const useAiven = process.env.USE_AIVEN === 'true' || isProduction;

const pool = mysql.createPool(useAiven ? aivenMySQLConfig : localMySQLConfig);

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        // FIXED: Remove 'as current_time' alias yang menyebabkan error
        const [rows] = await connection.execute('SELECT NOW()');
        connection.release();
        console.log(`MySQL connection successful (${useAiven ? 'Aiven' : 'Local'})`);
        console.log('Current time:', rows[0]['NOW()']);
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
}

async function createCompatibilityViews() {
    const views = [
        // FIXED: View untuk patients - simple mapping tanpa issues
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

        // FIXED: View untuk medicines dengan proper grouping
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

        // FIXED: View untuk prescriptions - simplified
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
        WHERE r.id_pengguna IS NOT NULL`,

        // FIXED: View untuk medicine_consumption
        `CREATE OR REPLACE VIEW medicine_consumption AS
        SELECT 
            npo.id_notifikasi_pengingat_obat as id,
            COALESCE(rpm.id_resep, 1) as prescription_id,
            npo.tanggal_konsumsi as scheduled_time,
            CASE 
                WHEN npo.keterangan_konsumsi = 'Dikonsumsi' THEN npo.tanggal_konsumsi
                ELSE NULL
            END as actual_time,
            CASE 
                WHEN npo.keterangan_konsumsi = 'Dikonsumsi' THEN 'taken'
                WHEN npo.keterangan_konsumsi = 'Tidak Dikonsumsi' THEN 'missed'
                WHEN npo.keterangan_konsumsi = 'Tunda' THEN 'skipped'
                ELSE 'scheduled'
            END as status,
            COALESCE(npo.catatan, '') as notes,
            npo.created_at
        FROM notifikasi_pengingat_obat npo
        LEFT JOIN riwayat_pemantauan_minum_obat rpm ON npo.id_notifikasi_pengingat_obat = rpm.id_notifikasi_pengingat_obat`
    ];

    // Execute views one by one with better error handling
    for (let i = 0; i < views.length; i++) {
        try {
            await pool.execute(views[i]);
            console.log(`✅ View ${i + 1}/${views.length} created successfully`);
        } catch (error) {
            console.error(`❌ Error creating view ${i + 1}:`, error.message);
            console.log(`Continuing with next view...`);
        }
    }
}

function createSimplePatientQuery() {
    return `
        SELECT DISTINCT
            p.id,
            p.rm_number,
            p.name,
            p.birth_date,
            p.gender,
            p.phone,
            p.address,
            p.created_at,
            COALESCE(
                (SELECT ROUND(AVG(rpm.persentase_konsumsi), 2)
                 FROM riwayat_pemantauan_minum_obat rpm 
                 JOIN resep r ON rpm.id_resep = r.id_resep 
                 WHERE r.id_pengguna = p.id), 
                0
            ) as compliance_percentage,
            COALESCE(
                (SELECT npo.nama_obat 
                 FROM notifikasi_pengingat_obat npo 
                 JOIN riwayat_pemantauan_minum_obat rpm ON npo.id_notifikasi_pengingat_obat = rpm.id_notifikasi_pengingat_obat 
                 JOIN resep r ON rpm.id_resep = r.id_resep 
                 WHERE r.id_pengguna = p.id 
                 ORDER BY npo.created_at DESC 
                 LIMIT 1),
                'Tidak ada obat'
            ) as medicine_name,
            DATE(p.created_at) as prescription_date,
            7 as duration_days,
            0 as total_doses,
            0 as taken_doses
        FROM patients p
    `;
}

// FIXED: Improved sample data insertion with better error handling
async function insertSampleData() {
    try {
        console.log('Checking and inserting sample data into existing tables...');

        // Check if data already exists
        let penggunaCount = 0;
        try {
            const [pengguna] = await pool.execute('SELECT COUNT(*) as count FROM pengguna');
            penggunaCount = pengguna[0].count;
        } catch (error) {
            console.log('Table pengguna might not exist, skipping sample data insertion');
            return;
        }
        
        if (penggunaCount > 0) {
            console.log('Sample data already exists, skipping...');
            return;
        }

        // Sample pengguna
        const penggunaData = [
            ['$2b$10$hashedpassword1', 'Amirul Azmi', '1990-05-15', 'Laki-Laki'],
            ['$2b$10$hashedpassword2', 'Siti Nurhaliza', '1985-08-22', 'Perempuan'],
            ['$2b$10$hashedpassword3', 'Ahmad Rizki', '1992-12-10', 'Laki-Laki'],
            ['$2b$10$hashedpassword4', 'Maria Sari', '1988-03-18', 'Perempuan'],
            ['$2b$10$hashedpassword5', 'Budi Santoso', '1995-07-25', 'Laki-Laki']
        ];

        for (const pengguna of penggunaData) {
            try {
                await pool.execute(
                    'INSERT INTO pengguna (password, nama_lengkap, tanggal_lahir, jenis_kelamin) VALUES (?, ?, ?, ?)',
                    pengguna
                );
                console.log(`✅ Inserted user: ${pengguna[1]}`);
            } catch (error) {
                console.log(`❌ Failed to insert user ${pengguna[1]}: ${error.message}`);
            }
        }

        // Sample resep (only if pengguna table has data)
        try {
            const resepData = [
                [null, 1, '30 tablet', 150000],
                [null, 2, '60 tablet', 250000],
                [null, 3, '21 kapsul', 180000]
            ];

            for (const resep of resepData) {
                try {
                    await pool.execute(
                        'INSERT INTO resep (id_pemeriksaan, id_pengguna, jumlah_obat, harga_obat) VALUES (?, ?, ?, ?)',
                        resep
                    );
                    console.log(`✅ Inserted prescription for user ID: ${resep[1]}`);
                } catch (error) {
                    console.log(`❌ Failed to insert prescription: ${error.message}`);
                }
            }
        } catch (error) {
            console.log('Resep table might not exist or have constraints, skipping resep data');
        }

        console.log('✅ Sample data insertion completed');
    } catch (error) {
        console.error('❌ Error in sample data insertion:', error.message);
        console.log('Some sample data might not be inserted due to constraints or missing tables');
    }
}

// FIXED: Better database initialization with comprehensive error handling
async function initializeDatabase() {
    try {
        console.log('🔄 Starting database initialization...');
        console.log('📝 NOTE: Working with existing database structure');
        
        // Check existing tables first
        await checkExistingTables();
        
        // Create compatibility views
        console.log('🔧 Creating compatibility views...');
        await createCompatibilityViews();
        
        // Insert sample data if tables are empty
        console.log('📊 Checking and inserting sample data...');
        await insertSampleData();
        
        console.log('✅ Database initialization completed successfully');
        console.log('✅ Views created for compatibility with existing code');
        console.log('✅ Sample data added if tables were empty');
    } catch (error) {
        console.error('❌ Failed to initialize database:', error.message);
        console.log('⚠️  Application will continue but some features may not work properly');
        // Don't throw error to allow server to start
    }
}

// FIXED: Improved table checking with better error handling
async function checkExistingTables() {
    try {
        const tables = [
            'pengguna',
            'penerimaan_obat', 
            'catatan_pengingat_obat',
            'notifikasi_pengingat_obat',
            'riwayat_pemantauan_minum_obat',
            'resep'
        ];

        console.log('🔍 Checking existing tables...');
        const tableStatus = [];
        
        for (const table of tables) {
            try {
                const [rows] = await pool.execute(`SELECT COUNT(*) as count FROM \`${table}\``);
                console.log(`✅ Table '${table}' exists with ${rows[0].count} records`);
                tableStatus.push({ table, exists: true, count: rows[0].count });
            } catch (error) {
                console.log(`❌ Table '${table}' not accessible: ${error.message}`);
                tableStatus.push({ table, exists: false, error: error.message });
            }
        }
        
        return tableStatus;
    } catch (error) {
        console.error('❌ Error checking tables:', error.message);
        return [];
    }
}

// FIXED: Add missing table creation for development
async function createMissingTablesForDev() {
    if (useAiven) {
        console.log('📝 Production mode - skipping table creation');
        return;
    }
    
    try {
        console.log('🔧 Creating missing tables for development...');
        
        // Create basic pengguna table if it doesn't exist
        const createPenggunaTable = `
            CREATE TABLE IF NOT EXISTS pengguna (
                id_pengguna INT AUTO_INCREMENT PRIMARY KEY,
                password VARCHAR(255) NOT NULL,
                nama_lengkap VARCHAR(255) NOT NULL,
                tanggal_lahir DATE,
                jenis_kelamin ENUM('Laki-Laki', 'Perempuan'),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                updated_by VARCHAR(255) DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await pool.execute(createPenggunaTable);
        console.log('✅ Pengguna table created/verified');
        
        // Create basic resep table if it doesn't exist
        const createResepTable = `
            CREATE TABLE IF NOT EXISTS resep (
                id_resep INT AUTO_INCREMENT PRIMARY KEY,
                id_pemeriksaan INT DEFAULT NULL,
                id_pengguna INT,
                jumlah_obat VARCHAR(255) NOT NULL,
                harga_obat INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                updated_by VARCHAR(255) DEFAULT NULL,
                INDEX idx_pengguna (id_pengguna)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await pool.execute(createResepTable);
        console.log('✅ Resep table created/verified');
        
    } catch (error) {
        console.error('❌ Error creating development tables:', error.message);
    }
}

// Graceful shutdown
async function closeConnection() {
    try {
        await pool.end();
        console.log('📴 Database connection closed');
    } catch (error) {
        console.error('❌ Error closing database connection:', error);
    }
}

// Enhanced connection pool error handling
pool.on('error', (err) => {
    console.error('❌ Database pool error:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('🔄 Attempting to reconnect to database...');
    } else if (err.code === 'ER_CON_COUNT_ERROR') {
        console.log('⚠️  Too many database connections');
    } else if (err.code === 'ECONNREFUSED') {
        console.log('❌ Database connection refused');
    }
});

// Handle application termination
process.on('SIGINT', async () => {
    console.log('📴 Received SIGINT, closing database connection...');
    await closeConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('📴 Received SIGTERM, closing database connection...');
    await closeConnection();
    process.exit(0);
});

// Enhanced initialization for development
async function initializeDevelopment() {
    try {
        await createMissingTablesForDev();
        await initializeDatabase();
    } catch (error) {
        console.error('❌ Development initialization failed:', error.message);
    }
}

module.exports = {
    pool,
    testConnection,
    initializeDatabase,
    initializeDevelopment,
    insertSampleData,
    closeConnection,
    useAiven,
    checkExistingTables
};