const mysql = require('mysql2/promise');
require('dotenv').config();

// Enhanced database configuration untuk Aiven MySQL
const aivenMySQLConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 13595,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    },
    // FIXED: Remove invalid options untuk connection
    connectTimeout: 60000,
    charset: 'utf8mb4',
    timezone: '+00:00'
};

const localMySQLConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'medicine_management',
    charset: 'utf8mb4'
};

const isProduction = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
const useAiven = process.env.USE_AIVEN === 'true' || isProduction;

console.log('🔧 Database Configuration:', {
    isProduction,
    useAiven,
    host: useAiven ? process.env.DB_HOST : 'localhost',
    port: useAiven ? process.env.DB_PORT : '3306',
    database: useAiven ? process.env.DB_NAME : 'medicine_management'
});

// Create connection pool configuration dengan proper options
const poolConfig = useAiven ? {
    ...aivenMySQLConfig,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 3,
    queueLimit: 0,
    acquireTimeout: 30000,  // Pool-specific option
    timeout: 30000          // Pool-specific option
} : {
    ...localMySQLConfig,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
};

// Create connection pool dengan error handling
let pool;
try {
    pool = mysql.createPool(poolConfig);
    console.log(`✅ MySQL pool created (${useAiven ? 'Aiven' : 'Local'})`);
} catch (error) {
    console.error('❌ Failed to create MySQL pool:', error.message);
}

// Test connection function dengan better error handling
async function testConnection() {
    let connection;
    try {
        console.log('🔍 Testing database connection...');
        
        // Check if required env vars are set
        if (useAiven) {
            const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
            const missingVars = requiredVars.filter(varName => !process.env[varName]);
            
            if (missingVars.length > 0) {
                throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
            }
        }

        // Test connection
        connection = await pool.getConnection();
        console.log('✅ Got database connection from pool');
        
        // Simple query to test
        const [rows] = await connection.execute('SELECT NOW() as current_time, DATABASE() as current_db');
        console.log('✅ Test query executed successfully');
        console.log('Current time:', rows[0].current_time);
        console.log('Current database:', rows[0].current_db);
        
        return true;
    } catch (error) {
        console.error('❌ Database connection test failed:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
        
        // Enhanced error reporting
        if (error.code === 'ENOTFOUND') {
            console.error('❌ Host not found - check DB_HOST');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('❌ Connection refused - check DB_HOST and DB_PORT');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('❌ Access denied - check DB_USER and DB_PASSWORD');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('❌ Database not found - check DB_NAME');
        }
        
        throw error;
    } finally {
        if (connection) {
            connection.release();
            console.log('✅ Database connection released');
        }
    }
}

// Create a simple connection function for one-off queries
async function createConnection() {
    try {
        const connection = await mysql.createConnection(useAiven ? aivenMySQLConfig : localMySQLConfig);
        console.log('✅ Individual database connection created');
        return connection;
    } catch (error) {
        console.error('❌ Failed to create individual connection:', error.message);
        throw error;
    }
}

// Simple test function yang tidak menggunakan pool
async function simpleConnectionTest() {
    let connection;
    try {
        console.log('🧪 Running simple connection test...');
        
        const config = useAiven ? aivenMySQLConfig : localMySQLConfig;
        connection = await mysql.createConnection(config);
        
        const [rows] = await connection.execute('SELECT 1 as test');
        console.log('✅ Simple test passed:', rows[0]);
        
        return true;
    } catch (error) {
        console.error('❌ Simple connection test failed:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
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
            GROUP BY nama_obat`
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

// Enhanced connection pool error handling
if (pool) {
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
}

// Debug function untuk melihat environment variables
function debugEnvironment() {
    console.log('🔍 Environment Debug:', {
        NODE_ENV: process.env.NODE_ENV,
        APP_ENV: process.env.APP_ENV,
        USE_AIVEN: process.env.USE_AIVEN,
        PORT: process.env.PORT,
        DB_HOST: process.env.DB_HOST ? '✅ Set' : '❌ Missing',
        DB_PORT: process.env.DB_PORT ? '✅ Set' : '❌ Missing',
        DB_USER: process.env.DB_USER ? '✅ Set' : '❌ Missing',
        DB_PASSWORD: process.env.DB_PASSWORD ? '✅ Set' : '❌ Missing',
        DB_NAME: process.env.DB_NAME ? '✅ Set' : '❌ Missing',
        isProduction,
        useAiven
    });
}

// Initialize debug pada startup
debugEnvironment();

module.exports = {
    pool,
    testConnection,
    simpleConnectionTest,
    createConnection,
    createCompatibilityViews,
    debugEnvironment,
    useAiven,
    isProduction
};