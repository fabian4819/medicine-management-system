const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();

// Import our modular components
const { 
    pool, 
    testConnection, 
    simpleConnectionTest, 
    createConnection, 
    debugEnvironment,
    useAiven,
    isProduction 
} = require('../lib/database');
const patientRoutes = require('../lib/routes/patients');
const medicineRoutes = require('../lib/routes/medicines');

const app = express();

// Environment variables
const NODE_ENV = process.env.NODE_ENV || 'production';

console.log('🚀 Starting Medicine Management API...');
console.log('📊 Environment:', NODE_ENV);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], 
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false,
}));

// Rate limiting for API endpoints
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 100 : 1000,
    message: {
        error: 'Terlalu banyak permintaan dari IP ini, coba lagi nanti.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// Basic middleware
app.use(compression());
app.use(cors({
    origin: [
        'https://medicine-management-system.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001'
    ],
    credentials: true
}));

app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes dengan logging
app.use('/api/v1/patients', (req, res, next) => {
    console.log(`👥 Patient API: ${req.method} ${req.url}`);
    next();
}, patientRoutes);

app.use('/api/v1/medicines', (req, res, next) => {
    console.log(`💊 Medicine API: ${req.method} ${req.url}`);
    next();
}, medicineRoutes);

// Enhanced health check endpoint dengan multiple tests
app.get('/api/health', async (req, res) => {
    const healthStatus = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        version: '1.0.0',
        database: 'Unknown',
        tests: {}
    };

    try {
        console.log('🏥 Running health check...');

        // Test 1: Environment check
        healthStatus.tests.environment = {
            useAiven,
            isProduction,
            hasRequiredEnvVars: !!(process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME)
        };

        // Test 2: Simple connection test
        try {
            await simpleConnectionTest();
            healthStatus.tests.simpleConnection = 'passed';
            healthStatus.database = 'Connected (Simple)';
        } catch (error) {
            healthStatus.tests.simpleConnection = `failed: ${error.message}`;
        }

        // Test 3: Pool connection test
        try {
            await testConnection();
            healthStatus.tests.poolConnection = 'passed';
            healthStatus.database = 'Connected (Pool)';
        } catch (error) {
            healthStatus.tests.poolConnection = `failed: ${error.message}`;
        }

        // Test 4: Basic query test
        try {
            const connection = await createConnection();
            const [result] = await connection.execute('SELECT COUNT(*) as count FROM pengguna');
            await connection.end();
            
            healthStatus.tests.queryTest = 'passed';
            healthStatus.tests.penggunaCount = result[0].count;
            healthStatus.database = 'Connected (Full)';
        } catch (error) {
            healthStatus.tests.queryTest = `failed: ${error.message}`;
        }

        // Determine overall status
        const hasAnySuccess = healthStatus.tests.simpleConnection === 'passed' || 
                             healthStatus.tests.poolConnection === 'passed' || 
                             healthStatus.tests.queryTest === 'passed';

        if (hasAnySuccess) {
            res.json(healthStatus);
        } else {
            healthStatus.status = 'Error';
            healthStatus.database = 'Disconnected';
            res.status(503).json(healthStatus);
        }

    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        
        healthStatus.status = 'Error';
        healthStatus.database = 'Disconnected';
        healthStatus.error = isProduction ? 'Database connection failed' : error.message;
        healthStatus.tests.exception = error.message;
        
        res.status(503).json(healthStatus);
    }
});

// V1 health check (simplified)
app.get('/api/v1/health', async (req, res) => {
    try {
        await simpleConnectionTest();
        res.json({
            success: true,
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: 'Connected',
            environment: NODE_ENV
        });
    } catch (error) {
        console.error('❌ V1 Health check failed:', error.message);
        res.status(503).json({
            success: false,
            status: 'Error',
            timestamp: new Date().toISOString(),
            database: 'Disconnected',
            error: isProduction ? 'Database connection failed' : error.message,
            environment: NODE_ENV
        });
    }
});

// Environment debug endpoint
app.get('/api/debug', (req, res) => {
    if (isProduction) {
        return res.status(403).json({
            error: 'Debug endpoint not available in production'
        });
    }

    debugEnvironment();
    
    res.json({
        success: true,
        timestamp: new Date().toISOString(),
        environment: {
            NODE_ENV: process.env.NODE_ENV,
            APP_ENV: process.env.APP_ENV,
            USE_AIVEN: process.env.USE_AIVEN,
            useAiven,
            isProduction
        },
        database: {
            host: process.env.DB_HOST ? 'SET' : 'MISSING',
            port: process.env.DB_PORT ? 'SET' : 'MISSING',
            user: process.env.DB_USER ? 'SET' : 'MISSING',
            password: process.env.DB_PASSWORD ? 'SET' : 'MISSING',
            name: process.env.DB_NAME ? 'SET' : 'MISSING'
        }
    });
});

// API info endpoint
app.get('/api/v1', (req, res) => {
    res.json({
        success: true,
        message: 'Medicine Management System API v1',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        database: useAiven ? 'Aiven MySQL' : 'Local MySQL',
        endpoints: {
            patients: '/api/v1/patients',
            medicines: '/api/v1/medicines',
            health: '/api/v1/health'
        },
        documentation: {
            patients: {
                list: 'GET /api/v1/patients?page=1&limit=10&search=keyword',
                detail: 'GET /api/v1/patients/:id',
                create: 'POST /api/v1/patients'
            },
            medicines: {
                list: 'GET /api/v1/medicines?page=1&limit=50',
                detail: 'GET /api/v1/medicines/:id'
            }
        }
    });
});

// Test endpoint for debugging dengan multiple test levels
app.get('/test', async (req, res) => {
    try {
        console.log('🧪 Running comprehensive database test...');
        
        const testResults = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            tests: {}
        };

        // Test 1: Simple connection
        try {
            await simpleConnectionTest();
            testResults.tests.simpleConnection = 'passed';
        } catch (error) {
            testResults.tests.simpleConnection = `failed: ${error.message}`;
        }

        // Test 2: Count query
        try {
            const connection = await createConnection();
            const [result] = await connection.execute('SELECT COUNT(*) as count FROM pengguna');
            await connection.end();
            
            testResults.tests.countQuery = 'passed';
            testResults.pengguna_count = result[0].count;
            testResults.database_type = 'MySQL';
            testResults.message = 'Database connection working perfectly';
        } catch (error) {
            testResults.tests.countQuery = `failed: ${error.message}`;
        }

        // Determine overall status
        if (testResults.tests.simpleConnection === 'passed' || testResults.tests.countQuery === 'passed') {
            res.json(testResults);
        } else {
            testResults.status = 'ERROR';
            res.status(500).json(testResults);
        }

    } catch (error) {
        console.error('🚨 Test endpoint error:', error);
        res.status(500).json({
            status: 'ERROR',
            error: isProduction ? 'Database test failed' : error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Handle API 404s
app.all('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint tidak ditemukan',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('🚨 Global error handler:', {
        message: error.message,
        stack: !isProduction ? error.stack : undefined,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    
    res.status(error.status || 500).json({
        success: false,
        error: isProduction 
            ? 'Terjadi kesalahan internal server' 
            : error.message,
        timestamp: new Date().toISOString(),
        details: !isProduction ? {
            stack: error.stack,
            sqlState: error.sqlState,
            errno: error.errno,
            code: error.code
        } : undefined
    });
});

// Export the Express API for Vercel
module.exports = app;