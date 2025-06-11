const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

// FIXED: Import database connection
const { pool, testConnection, initializeDatabase, initializeDevelopment } = require('./config/database');

// Import routes
const patientRoutes = require('./routes/patients');
const medicineRoutes = require('./routes/medicines');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Environment variables
const PORT = process.env.APP_PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// FIXED: Security middleware dengan CSP yang benar
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], 
            scriptSrcAttr: ["'unsafe-inline'"], // FIXED: Allow inline event handlers
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

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: 'Terlalu banyak permintaan dari IP ini, coba lagi nanti.'
    }
});
app.use('/api', limiter);

// Middleware
app.use(compression());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// FIXED: Debug middleware untuk patients API
app.use('/api/v1/patients', (req, res, next) => {
    console.log(`🔍 Patients API Call: ${req.method} ${req.url}`);
    console.log(`🔍 Query params:`, req.query);
    next();
});

// FIXED: Simple test endpoints
app.get('/test', async (req, res) => {
    try {
        console.log('🧪 Testing database connection...');
        const [result] = await pool.execute('SELECT COUNT(*) as count FROM pengguna');
        
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            pengguna_count: result[0].count,
            message: 'Database connection working'
        });
    } catch (error) {
        console.error('🚨 Test endpoint error:', error);
        res.status(500).json({
            status: 'ERROR',
            error: error.message,
            details: error
        });
    }
});

// FIXED: Test patients view specifically
app.get('/test-patients', async (req, res) => {
    try {
        console.log('🧪 Testing patients view...');
        
        // First test if view exists
        const [viewExists] = await pool.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.views 
            WHERE table_schema = DATABASE() 
            AND table_name = 'patients'
        `);
        
        if (viewExists[0].count === 0) {
            return res.json({
                status: 'WARNING',
                message: 'Patients view does not exist',
                fallback: 'Using pengguna table directly'
            });
        }
        
        // Test simple query
        const [count] = await pool.execute('SELECT COUNT(*) as count FROM patients');
        console.log('Patient count:', count[0].count);
        
        // Test the problematic query step by step
        const [patients] = await pool.execute(`
            SELECT
                p.id,
                p.rm_number,
                p.name,
                p.birth_date,
                p.gender
            FROM patients p
            ORDER BY p.name ASC
            LIMIT 3
        `);
        
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            patient_count: count[0].count,
            sample_patients: patients,
            message: 'Patients view working'
        });
    } catch (error) {
        console.error('🚨 Test patients endpoint error:', error);
        res.status(500).json({
            status: 'ERROR',
            error: error.message,
            sqlState: error.sqlState,
            errno: error.errno,
            code: error.code
        });
    }
});

// FIXED: Check view structure
app.get('/check-view', async (req, res) => {
    try {
        // Check if view exists
        const [viewExists] = await pool.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.views 
            WHERE table_schema = DATABASE() 
            AND table_name = 'patients'
        `);
        
        let viewStructure = null;
        if (viewExists[0].count > 0) {
            const [viewDef] = await pool.execute(`
                SELECT VIEW_DEFINITION 
                FROM information_schema.views 
                WHERE table_schema = DATABASE() 
                AND table_name = 'patients'
            `);
            viewStructure = viewDef[0].VIEW_DEFINITION;
        }
        
        // Get columns
        const [columns] = await pool.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM information_schema.columns 
            WHERE table_schema = DATABASE() 
            AND table_name = 'patients'
            ORDER BY ORDINAL_POSITION
        `);
        
        res.json({
            viewExists: viewExists[0].count > 0,
            viewDefinition: viewStructure,
            columns: columns,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            error: error.message,
            details: error
        });
    }
});

// FIXED: Debug test for problematic query
app.get('/debug-query', async (req, res) => {
    try {
        console.log('🔍 Testing the exact problematic query...');
        
        const page = 1;
        const limit = 5;
        const offset = (page - 1) * limit;
        
        // FIXED: Use direct query without prepared statements
        const query = `
            SELECT
                p.id,
                p.rm_number,
                p.name,
                p.birth_date,
                p.gender
            FROM patients p
            ORDER BY p.name ASC
            LIMIT ${limit} OFFSET ${offset}
        `;
        
        console.log('Query:', query);
        
        // FIXED: Use pool.query() instead of pool.execute()
        const [patients] = await pool.query(query);
        
        res.json({
            status: 'OK',
            method: 'direct_query',
            query: query,
            resultCount: patients.length,
            results: patients
        });
        
    } catch (error) {
        console.error('🚨 Debug query error:', error);
        res.status(500).json({
            status: 'ERROR',
            error: error.message,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState
        });
    }
});

// FIXED: Test simple query
app.get('/test-simple', async (req, res) => {
    try {
        console.log('🧪 Testing very simple query...');
        
        const query = `SELECT id_pengguna, nama_lengkap FROM pengguna LIMIT 3`;
        const [result] = await pool.query(query);
        
        res.json({
            status: 'OK',
            message: 'Simple query works',
            count: result.length,
            data: result
        });
    } catch (error) {
        console.error('🚨 Simple test error:', error);
        res.status(500).json({
            status: 'ERROR',
            error: error.message
        });
    }
});

// FIXED: Test patients view
app.get('/test-patients-view', async (req, res) => {
    try {
        console.log('🧪 Testing patients view directly...');
        
        const query = `SELECT id, rm_number, name FROM patients LIMIT 3`;
        const [result] = await pool.query(query);
        
        res.json({
            status: 'OK',
            message: 'Patients view works',
            count: result.length,
            data: result
        });
    } catch (error) {
        console.error('🚨 Patients view test error:', error);
        res.status(500).json({
            status: 'ERROR',
            error: error.message,
            details: error
        });
    }
});

// API Routes
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/medicines', medicineRoutes);

// FIXED: Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await testConnection();
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: 'Connected',
            uptime: process.uptime(),
            environment: NODE_ENV
        });
    } catch (error) {
        console.error('Health check failed:', error.message);
        res.status(503).json({
            status: 'Error',
            timestamp: new Date().toISOString(),
            database: 'Disconnected',
            error: error.message,
            environment: NODE_ENV
        });
    }
});

// FIXED: Basic API info endpoint
app.get('/api/v1', (req, res) => {
    res.json({
        success: true,
        message: 'Medicine Management System API v1',
        timestamp: new Date().toISOString(),
        endpoints: {
            patients: '/api/v1/patients',
            medicines: '/api/v1/medicines',
            health: '/api/health'
        },
        debug_endpoints: {
            test: '/test',
            testPatients: '/test-patients',
            checkView: '/check-view',
            debugQuery: '/debug-query'
        }
    });
});

// WebSocket handling
const clients = new Set();

wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');
    clients.add(ws);

    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Terhubung ke sistem real-time'
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleWebSocketMessage(ws, data);
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});

function handleWebSocketMessage(ws, data) {
    const { type, payload } = data;
    
    switch (type) {
        case 'subscribe':
            ws.subscriptions = payload.channels || [];
            break;
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        default:
            console.log('Unknown WebSocket message type:', type);
    }
}

function broadcastToClients(type, payload) {
    const message = JSON.stringify({ type, payload });
    
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Catch-all handler for SPA
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            error: 'API endpoint tidak ditemukan'
        });
    }
    
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// FIXED: Enhanced global error handler
app.use((error, req, res, next) => {
    console.error('🚨 Global error handler:', {
        message: error.message,
        stack: NODE_ENV === 'development' ? error.stack : undefined,
        url: req.url,
        method: req.method,
        query: req.query,
        params: req.params,
        sqlState: error.sqlState || 'N/A',
        errno: error.errno || 'N/A',
        code: error.code || 'N/A'
    });
    
    res.status(error.status || 500).json({
        success: false,
        error: NODE_ENV === 'production' 
            ? 'Terjadi kesalahan internal server' 
            : error.message,
        details: NODE_ENV === 'development' ? {
            stack: error.stack,
            sqlState: error.sqlState,
            errno: error.errno,
            code: error.code
        } : undefined
    });
});

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
    console.log(`📴 Received ${signal}. Shutting down gracefully...`);
    
    server.close(() => {
        console.log('📴 HTTP server closed');
        
        wss.clients.forEach(client => {
            client.terminate();
        });
        
        pool.end(() => {
            console.log('📴 Database pool closed');
            process.exit(0);
        });
    });
    
    setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
}

// FIXED: Enhanced server startup
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
        if (NODE_ENV === 'development') {
            await initializeDevelopment();
        } else {
            await initializeDatabase();
        }
        console.log('✅ Database initialization completed');
        
        // Start HTTP server
        server.listen(PORT, () => {
            console.log(`🌐 Server running on port ${PORT} in ${NODE_ENV} mode`);
            console.log(`📡 API available at http://localhost:${PORT}/api/v1`);
            console.log(`🔌 WebSocket available at ws://localhost:${PORT}/ws`);
            console.log(`📱 Web interface available at http://localhost:${PORT}`);
            console.log('🧪 Debug endpoints:');
            console.log(`   http://localhost:${PORT}/test`);
            console.log(`   http://localhost:${PORT}/test-patients`);
            console.log(`   http://localhost:${PORT}/check-view`);
            console.log(`   http://localhost:${PORT}/debug-query`);
            console.log('✅ System ready for use!');
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        console.error('Stack trace:', error.stack);
        
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

module.exports = { app, server };

if (require.main === module) {
    startServer();
}