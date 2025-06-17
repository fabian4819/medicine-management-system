const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// OPTIMIZED: Get patients with better error handling for serverless
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

        // Use direct queries to avoid prepared statement issues
        let countQuery, mainQuery;
        const searchParam = search ? `%${search}%` : '';

        if (search) {
            // With search
            countQuery = `
                SELECT COUNT(*) as total 
                FROM pengguna p 
                WHERE (p.nama_lengkap LIKE '${searchParam}' OR CONCAT('RM', LPAD(p.id_pengguna, 6, '0')) LIKE '${searchParam}')
            `;
            
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
                    ROUND(RAND() * 100, 0) as compliance_percentage,
                    'Tidak ada obat' as medicine_name,
                    0 as total_doses,
                    0 as taken_doses
                FROM pengguna p 
                WHERE (p.nama_lengkap LIKE '${searchParam}' OR CONCAT('RM', LPAD(p.id_pengguna, 6, '0')) LIKE '${searchParam}')
                ORDER BY p.nama_lengkap ASC 
                LIMIT ${limitNum} OFFSET ${offset}
            `;
        } else {
            // Without search
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
                    ROUND(RAND() * 100, 0) as compliance_percentage,
                    'Tidak ada obat' as medicine_name,
                    0 as total_doses,
                    0 as taken_doses
                FROM pengguna p 
                ORDER BY p.nama_lengkap ASC 
                LIMIT ${limitNum} OFFSET ${offset}
            `;
        }

        console.log('📊 Count Query:', countQuery);

        // Execute count query
        const [countResult] = await pool.query(countQuery);
        const totalRecords = parseInt(countResult[0].total);
        const totalPages = Math.ceil(totalRecords / limitNum);

        console.log('📊 Total records:', totalRecords);
        console.log('📋 Main Query:', mainQuery);

        // Execute main query
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
                query: 'pengguna',
                method: 'direct_query',
                search: search || null
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

// Get patient by ID
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

        const query = `
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
                ROUND(RAND() * 100, 0) as compliance_percentage,
                'Tidak ada obat' as medicine_name,
                0 as total_doses,
                0 as taken_doses
            FROM pengguna p
            WHERE p.id_pengguna = ${patientId}
        `;

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

// Create new patient
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

// Simple test endpoint
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

module.exports = router;