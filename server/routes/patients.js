const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// FIXED: Completely avoid prepared statements for LIMIT/OFFSET issues
router.get('/', async (req, res) => {
    try {
        console.log('🔍 GET /patients called with query:', req.query);
        
        const {
            page = 1,
            limit = 10,
            search = ''
        } = req.query;

        // Validate and sanitize parameters
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(Math.max(1, parseInt(limit)), 100);
        const offset = (pageNum - 1) * limitNum;
        
        console.log('📝 Pagination:', { page: pageNum, limit: limitNum, offset });

        // Escape search term for SQL injection protection
        const escapedSearch = search ? pool.escape(`%${search}%`) : '';

        // Check if patients view exists
        let useView = true;
        try {
            await pool.query('SELECT 1 FROM patients LIMIT 1');
            console.log('✅ Using patients view');
        } catch (viewError) {
            console.log('⚠️ Patients view not available, using pengguna table');
            useView = false;
        }

        let countQuery, mainQuery;

        if (useView) {
            if (search) {
                countQuery = `SELECT COUNT(*) as total FROM patients p WHERE (p.name LIKE ${escapedSearch} OR p.rm_number LIKE ${escapedSearch})`;
                
                mainQuery = `
                    SELECT 
                        p.id,
                        p.rm_number,
                        p.name,
                        p.birth_date,
                        p.gender,
                        COALESCE(p.phone, '') as phone,
                        COALESCE(p.address, '') as address,
                        p.created_at,
                        DATE(p.created_at) as prescription_date,
                        7 as duration_days,
                        0 as compliance_percentage,
                        'Tidak ada obat' as medicine_name,
                        0 as total_doses,
                        0 as taken_doses
                    FROM patients p 
                    WHERE (p.name LIKE ${escapedSearch} OR p.rm_number LIKE ${escapedSearch})
                    ORDER BY p.name ASC 
                    LIMIT ${limitNum} OFFSET ${offset}
                `;
            } else {
                countQuery = `SELECT COUNT(*) as total FROM patients`;
                
                mainQuery = `
                    SELECT 
                        p.id,
                        p.rm_number,
                        p.name,
                        p.birth_date,
                        p.gender,
                        COALESCE(p.phone, '') as phone,
                        COALESCE(p.address, '') as address,
                        p.created_at,
                        DATE(p.created_at) as prescription_date,
                        7 as duration_days,
                        0 as compliance_percentage,
                        'Tidak ada obat' as medicine_name,
                        0 as total_doses,
                        0 as taken_doses
                    FROM patients p 
                    ORDER BY p.name ASC 
                    LIMIT ${limitNum} OFFSET ${offset}
                `;
            }
        } else {
            // Fallback to pengguna table
            if (search) {
                countQuery = `SELECT COUNT(*) as total FROM pengguna p WHERE (p.nama_lengkap LIKE ${escapedSearch} OR CONCAT('RM', LPAD(p.id_pengguna, 6, '0')) LIKE ${escapedSearch})`;
                
                mainQuery = `
                    SELECT 
                        p.id_pengguna as id,
                        CONCAT('RM', LPAD(p.id_pengguna, 6, '0')) as rm_number,
                        p.nama_lengkap as name,
                        p.tanggal_lahir as birth_date,
                        CASE 
                            WHEN p.jenis_kelamin = 'Laki-Laki' THEN 'L'
                            WHEN p.jenis_kelamin = 'Perempuan' THEN 'P'
                            ELSE 'L'
                        END as gender,
                        '' as phone,
                        '' as address,
                        p.created_at,
                        DATE(p.created_at) as prescription_date,
                        7 as duration_days,
                        0 as compliance_percentage,
                        'Tidak ada obat' as medicine_name,
                        0 as total_doses,
                        0 as taken_doses
                    FROM pengguna p 
                    WHERE (p.nama_lengkap LIKE ${escapedSearch} OR CONCAT('RM', LPAD(p.id_pengguna, 6, '0')) LIKE ${escapedSearch})
                    ORDER BY p.nama_lengkap ASC 
                    LIMIT ${limitNum} OFFSET ${offset}
                `;
            } else {
                countQuery = `SELECT COUNT(*) as total FROM pengguna`;
                
                mainQuery = `
                    SELECT 
                        p.id_pengguna as id,
                        CONCAT('RM', LPAD(p.id_pengguna, 6, '0')) as rm_number,
                        p.nama_lengkap as name,
                        p.tanggal_lahir as birth_date,
                        CASE 
                            WHEN p.jenis_kelamin = 'Laki-Laki' THEN 'L'
                            WHEN p.jenis_kelamin = 'Perempuan' THEN 'P'
                            ELSE 'L'
                        END as gender,
                        '' as phone,
                        '' as address,
                        p.created_at,
                        DATE(p.created_at) as prescription_date,
                        7 as duration_days,
                        0 as compliance_percentage,
                        'Tidak ada obat' as medicine_name,
                        0 as total_doses,
                        0 as taken_doses
                    FROM pengguna p 
                    ORDER BY p.nama_lengkap ASC 
                    LIMIT ${limitNum} OFFSET ${offset}
                `;
            }
        }

        console.log('📊 Count Query:', countQuery);

        // FIXED: Use pool.query() instead of pool.execute() to avoid prepared statement issues
        const [countResult] = await pool.query(countQuery);
        const totalRecords = parseInt(countResult[0].total);
        const totalPages = Math.ceil(totalRecords / limitNum);

        console.log('📊 Total records:', totalRecords);
        console.log('📋 Main Query:', mainQuery);

        // FIXED: Use pool.query() for main query too
        const [patients] = await pool.query(mainQuery);

        console.log('✅ Query executed successfully, got', patients.length, 'patients');

        res.json({
            success: true,
            data: {
                patients: patients,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalRecords,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            },
            meta: {
                useView: useView,
                query: useView ? 'patients' : 'pengguna',
                method: 'direct_query'
            }
        });

    } catch (error) {
        console.error('🚨 Get patients error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal mengambil data pasien',
            details: {
                message: error.message,
                code: error.code,
                errno: error.errno,
                sqlState: error.sqlState
            }
        });
    }
});

// FIXED: Get patient by ID - using pool.query()
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 GET /patients/:id called with id:', id);

        // Sanitize ID
        const patientId = parseInt(id);
        if (isNaN(patientId)) {
            return res.status(400).json({
                success: false,
                error: 'ID pasien tidak valid'
            });
        }

        let query;
        
        // Try patients view first
        try {
            await pool.query('SELECT 1 FROM patients LIMIT 1');
            query = `
                SELECT 
                    p.id,
                    p.rm_number,
                    p.name,
                    p.birth_date,
                    p.gender,
                    COALESCE(p.phone, '') as phone,
                    COALESCE(p.address, '') as address,
                    p.created_at,
                    DATE(p.created_at) as prescription_date,
                    7 as duration_days,
                    0 as compliance_percentage,
                    'Tidak ada obat' as medicine_name,
                    0 as total_doses,
                    0 as taken_doses
                FROM patients p
                WHERE p.id = ${patientId}
            `;
        } catch (viewError) {
            // Fallback to pengguna table
            query = `
                SELECT 
                    p.id_pengguna as id,
                    CONCAT('RM', LPAD(p.id_pengguna, 6, '0')) as rm_number,
                    p.nama_lengkap as name,
                    p.tanggal_lahir as birth_date,
                    CASE 
                        WHEN p.jenis_kelamin = 'Laki-Laki' THEN 'L'
                        WHEN p.jenis_kelamin = 'Perempuan' THEN 'P'
                        ELSE 'L'
                    END as gender,
                    '' as phone,
                    '' as address,
                    p.created_at,
                    DATE(p.created_at) as prescription_date,
                    7 as duration_days,
                    0 as compliance_percentage,
                    'Tidak ada obat' as medicine_name,
                    0 as total_doses,
                    0 as taken_doses
                FROM pengguna p
                WHERE p.id_pengguna = ${patientId}
            `;
        }

        const [patients] = await pool.query(query);

        if (patients.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Pasien tidak ditemukan'
            });
        }

        console.log('✅ Patient found:', patients[0].name);

        res.json({
            success: true,
            data: patients[0]
        });

    } catch (error) {
        console.error('🚨 Get patient by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal mengambil data pasien',
            details: error.message
        });
    }
});

// FIXED: Create new patient - using pool.execute() for INSERT (this usually works)
router.post('/', async (req, res) => {
    try {
        console.log('🔍 POST /patients called with body:', req.body);
        
        const {
            nama_lengkap,
            tanggal_lahir,
            jenis_kelamin,
            password = 'defaultpassword123'
        } = req.body;

        if (!nama_lengkap) {
            return res.status(400).json({
                success: false,
                error: 'Nama pasien wajib diisi'
            });
        }

        const query = `
            INSERT INTO pengguna (password, nama_lengkap, tanggal_lahir, jenis_kelamin)
            VALUES (?, ?, ?, ?)
        `;

        // INSERT usually works fine with execute()
        const [result] = await pool.execute(query, [
            password,
            nama_lengkap,
            tanggal_lahir || null,
            jenis_kelamin || 'Laki-Laki'
        ]);

        const newPatient = {
            id: result.insertId,
            rm_number: `RM${String(result.insertId).padStart(6, '0')}`,
            name: nama_lengkap,
            birth_date: tanggal_lahir,
            gender: jenis_kelamin === 'Laki-Laki' ? 'L' : 'P',
            phone: '',
            address: '',
            created_at: new Date().toISOString()
        };

        console.log('✅ Patient created:', newPatient);

        res.status(201).json({
            success: true,
            data: newPatient,
            message: 'Pasien berhasil ditambahkan'
        });

    } catch (error) {
        console.error('🚨 Create patient error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal menambahkan pasien',
            details: error.message
        });
    }
});

// FIXED: Simple test endpoint
router.get('/test/simple', async (req, res) => {
    try {
        console.log('🧪 Testing simple patient query...');

        // Test basic query without any prepared statements
        const query = `SELECT id_pengguna, nama_lengkap FROM pengguna LIMIT 5`;
        const [results] = await pool.query(query);

        res.json({
            success: true,
            message: 'Simple query successful',
            count: results.length,
            data: results
        });

    } catch (error) {
        console.error('🚨 Simple test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error
        });
    }
});

// FIXED: Test patients view
router.get('/test/view', async (req, res) => {
    try {
        console.log('🧪 Testing patients view...');

        // Test patients view
        const query = `SELECT id, rm_number, name FROM patients LIMIT 5`;
        const [results] = await pool.query(query);

        res.json({
            success: true,
            message: 'Patients view successful',
            count: results.length,
            data: results
        });

    } catch (error) {
        console.error('🚨 View test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error
        });
    }
});

module.exports = router;