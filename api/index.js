const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();

// Import our modular components
const { pool, testConnection } = require('../lib/database');
const patientRoutes = require('../lib/routes/patients');
const medicineRoutes = require('../lib/routes/medicines');

const app = express();

// Environment variables
const NODE_ENV = process.env.NODE_ENV || 'production';
const isProduction = NODE_ENV === 'production';

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
        'http://localhost:3000'
    ],
    credentials: true
}));

app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes with logging
app.use('/api/v1/patients', (req, res, next) => {
    console.log(`👥 Patient API: ${req.method} ${req.url}`);
    next();
}, patientRoutes);

app.use('/api/v1/medicines', (req, res, next) => {
    console.log(`💊 Medicine API: ${req.method} ${req.url}`);
    next();
}, medicineRoutes);

// Health check endpoints
app.get('/api/health', async (req, res) => {
    try {
        await testConnection();
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: 'Connected',
            environment: NODE_ENV,
            version: '1.0.0'
        });
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        res.status(503).json({
            status: 'Error',
            timestamp: new Date().toISOString(),
            database: 'Disconnected',
            error: isProduction ? 'Database connection failed' : error.message,
            environment: NODE_ENV
        });
    }
});

app.get('/api/v1/health', async (req, res) => {
    try {
        await testConnection();
        res.json({
            success: true,
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: 'Connected',
            environment: NODE_ENV
        });
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
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

// API info endpoint
app.get('/api/v1', (req, res) => {
    res.json({
        success: true,
        message: 'Medicine Management System API v1',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        endpoints: {
            patients: '/api/v1/patients',
            medicines: '/api/v1/medicines',
            health: '/api/v1/health'
        },
        documentation: {
            patients: {
                list: 'GET /api/v1/patients?page=1&limit=100&search=keyword',
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

// Test endpoint for debugging
app.get('/test', async (req, res) => {
    try {
        console.log('🧪 Testing database connection...');
        const [result] = await pool.execute('SELECT COUNT(*) as count FROM pengguna');
        
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            pengguna_count: result[0].count,
            database_type: 'MySQL',
            message: 'Database connection working perfectly'
        });
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