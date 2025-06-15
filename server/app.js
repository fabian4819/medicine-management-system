const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const http = require('http');
require('dotenv').config();

// Import database connection
const { pool, testConnection, initializeDatabase } = require('./config/database');

// Import routes
const patientRoutes = require('./routes/patients');
const medicineRoutes = require('./routes/medicines');

const app = express();
const server = http.createServer(app);

// Environment variables
const PORT = process.env.PORT || process.env.APP_PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

console.log(`🚀 Starting server in ${NODE_ENV} mode on port ${PORT}`);

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
    max: isProduction ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
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
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'https://medicine-management-doxgglywi-fabian4819s-projects.vercel.app'
    ],
    credentials: true
}));

app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

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
            uptime: process.uptime(),
            environment: NODE_ENV,
            version: process.env.npm_package_version || '1.0.0'
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
            uptime: process.uptime(),
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

// Catch-all handler for SPA (Single Page Application)
app.get('*', (req, res) => {
    // Handle API 404s
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            error: 'API endpoint tidak ditemukan',
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
        });
    }
    
    // Serve index.html for all other routes (SPA)
    res.sendFile(path.join(__dirname, '../public/index.html'));
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

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
    console.log(`📴 Received ${signal}. Shutting down gracefully...`);
    
    server.close(() => {
        console.log('📴 HTTP server closed');
        
        pool.end(() => {
            console.log('📴 Database pool closed');
            process.exit(0);
        });
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Server startup function
async function startServer() {
    try {
        console.log('🚀 Starting Medicine Management System...');
        console.log(`📊 Environment: ${NODE_ENV}`);
        
        // Test database connection
        console.log('🔗 Testing database connection...');
        await testConnection();
        console.log('✅ Database connection established');
        
        // Initialize database
        console.log('🔧 Initializing database...');
        await initializeDatabase();
        console.log('✅ Database initialization completed');
        
        // Start HTTP server
        server.listen(PORT, () => {
            console.log(`🌐 Server running on port ${PORT} in ${NODE_ENV} mode`);
            console.log(`📡 API available at http://localhost:${PORT}/api/v1`);
            console.log(`📱 Web interface available at http://localhost:${PORT}`);
            console.log('✅ System ready for use!');
            
            if (!isProduction) {
                console.log('🧪 Debug endpoints:');
                console.log(`   http://localhost:${PORT}/test`);
                console.log(`   http://localhost:${PORT}/api/health`);
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        
        // Try to start server in limited mode
        try {
            server.listen(PORT, () => {
                console.log(`🌐 Server running on port ${PORT} (Limited Mode)`);
                console.log('⚠️  Some features may not work due to database issues');
            });
        } catch (serverError) {
            console.error('❌ Failed to start server completely:', serverError.message);
            process.exit(1);
        }
    }
}

// Export for Vercel
module.exports = app;

// Start server if this file is run directly
if (require.main === module) {
    startServer();
}