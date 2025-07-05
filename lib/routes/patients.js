const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// OPTIMIZED: Get patients with real compliance percentage from database
// FILTERED: Only show patients who have monitoring data
// IMPROVED: Using direct id_pengguna from riwayat_pemantauan_minum_obat table
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

        // SIMPLIFIED Query using direct id_pengguna from riwayat_pemantauan_minum_obat
        let countQuery, mainQuery;
        const searchParam = search ? `%${search}%` : '';

        if (search) {
            // With search - ONLY patients with monitoring data (using direct connection)
            countQuery = `
                SELECT COUNT(DISTINCT p.id_pengguna) as total 
                FROM pengguna p 
                INNER JOIN riwayat_pemantauan_minum_obat rpo ON p.id_pengguna = rpo.id_pengguna
                LEFT JOIN penerimaan_obat po ON rpo.id_notifikasi_pengingat_obat IN (
                    SELECT npo.id_notifikasi_pengingat_obat 
                    FROM notifikasi_pengingat_obat npo
                    JOIN catatan_pengingat_obat cpo ON npo.id_catatan_obat = cpo.id_catatan_obat
                    WHERE cpo.id_penerimaan_obat = po.id_penerimaan_obat
                )
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
                    DATE(MIN(rpo.created_at)) as prescription_date,
                    7 as duration_days,
                    ROUND(AVG(rpo.persentase_konsumsi), 2) as compliance_percentage,
                    GROUP_CONCAT(DISTINCT COALESCE(po.nama_obat, 'Obat Tidak Diketahui') SEPARATOR ', ') as medicine_name,
                    COUNT(DISTINCT rpo.id_pemantauan_minum_obat) as total_doses,
                    COUNT(DISTINCT CASE WHEN rpo.persentase_konsumsi >= 80 THEN rpo.id_pemantauan_minum_obat END) as taken_doses
                FROM pengguna p 
                INNER JOIN riwayat_pemantauan_minum_obat rpo ON p.id_pengguna = rpo.id_pengguna
                LEFT JOIN penerimaan_obat po ON rpo.id_notifikasi_pengingat_obat IN (
                    SELECT npo.id_notifikasi_pengingat_obat 
                    FROM notifikasi_pengingat_obat npo
                    JOIN catatan_pengingat_obat cpo ON npo.id_catatan_obat = cpo.id_catatan_obat
                    WHERE cpo.id_penerimaan_obat = po.id_penerimaan_obat
                )
                WHERE (p.nama_lengkap LIKE '${searchParam}' OR CONCAT('RM', LPAD(p.id_pengguna, 6, '0')) LIKE '${searchParam}')
                GROUP BY p.id_pengguna, p.nama_lengkap, p.tanggal_lahir, p.jenis_kelamin, p.created_at
                HAVING COUNT(DISTINCT rpo.id_pemantauan_minum_obat) > 0
                ORDER BY AVG(rpo.persentase_konsumsi) DESC, p.nama_lengkap ASC 
                LIMIT ${limitNum} OFFSET ${offset}
            `;
        } else {
            // Without search - ONLY patients with monitoring data (using direct connection)
            countQuery = `
                SELECT COUNT(DISTINCT p.id_pengguna) as total 
                FROM pengguna p 
                INNER JOIN riwayat_pemantauan_minum_obat rpo ON p.id_pengguna = rpo.id_pengguna
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
                    DATE(MIN(rpo.created_at)) as prescription_date,
                    7 as duration_days,
                    ROUND(AVG(rpo.persentase_konsumsi), 2) as compliance_percentage,
                    GROUP_CONCAT(DISTINCT COALESCE(po.nama_obat, 'Obat Tidak Diketahui') SEPARATOR ', ') as medicine_name,
                    COUNT(DISTINCT rpo.id_pemantauan_minum_obat) as total_doses,
                    COUNT(DISTINCT CASE WHEN rpo.persentase_konsumsi >= 80 THEN rpo.id_pemantauan_minum_obat END) as taken_doses
                FROM pengguna p 
                INNER JOIN riwayat_pemantauan_minum_obat rpo ON p.id_pengguna = rpo.id_pengguna
                LEFT JOIN penerimaan_obat po ON rpo.id_notifikasi_pengingat_obat IN (
                    SELECT npo.id_notifikasi_pengingat_obat 
                    FROM notifikasi_pengingat_obat npo
                    JOIN catatan_pengingat_obat cpo ON npo.id_catatan_obat = cpo.id_catatan_obat
                    WHERE cpo.id_penerimaan_obat = po.id_penerimaan_obat
                )
                GROUP BY p.id_pengguna, p.nama_lengkap, p.tanggal_lahir, p.jenis_kelamin, p.created_at
                HAVING COUNT(DISTINCT rpo.id_pemantauan_minum_obat) > 0
                ORDER BY AVG(rpo.persentase_konsumsi) DESC, p.nama_lengkap ASC 
                LIMIT ${limitNum} OFFSET ${offset}
            `;
        }

        console.log('📊 Count Query:', countQuery);

        // Execute count query
        const [countResult] = await pool.query(countQuery);
        const totalRecords = parseInt(countResult[0].total);
        const totalPages = Math.ceil(totalRecords / limitNum);

        console.log('📊 Total records (with monitoring data):', totalRecords);
        console.log('📋 Main Query:', mainQuery);

        // Execute main query
        const [patients] = await pool.query(mainQuery);

        console.log('✅ Query executed successfully, got', patients.length, 'patients with monitoring data');

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
                query: 'pengguna_with_monitoring_data_direct_join',
                method: 'direct_id_pengguna_join',
                search: search || null,
                filter: 'only_patients_with_monitoring_data'
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

// Get patient by ID with detailed compliance data (SIMPLIFIED using direct join)
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

        // SIMPLIFIED: Direct join using id_pengguna from both tables
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
                DATE(MIN(rpo.created_at)) as prescription_date,
                7 as duration_days,
                ROUND(AVG(rpo.persentase_konsumsi), 2) as compliance_percentage,
                GROUP_CONCAT(DISTINCT COALESCE(po.nama_obat, 'Obat Tidak Diketahui') SEPARATOR ', ') as medicine_name,
                COUNT(DISTINCT rpo.id_pemantauan_minum_obat) as total_doses,
                COUNT(DISTINCT CASE WHEN rpo.persentase_konsumsi >= 80 THEN rpo.id_pemantauan_minum_obat END) as taken_doses
            FROM pengguna p
            INNER JOIN riwayat_pemantauan_minum_obat rpo ON p.id_pengguna = rpo.id_pengguna
            LEFT JOIN penerimaan_obat po ON rpo.id_notifikasi_pengingat_obat IN (
                SELECT npo.id_notifikasi_pengingat_obat 
                FROM notifikasi_pengingat_obat npo
                JOIN catatan_pengingat_obat cpo ON npo.id_catatan_obat = cpo.id_catatan_obat
                WHERE cpo.id_penerimaan_obat = po.id_penerimaan_obat
            )
            WHERE p.id_pengguna = ${patientId}
            GROUP BY p.id_pengguna, p.nama_lengkap, p.tanggal_lahir, p.jenis_kelamin, p.created_at
            HAVING COUNT(DISTINCT rpo.id_pemantauan_minum_obat) > 0
        `;

        const [patients] = await pool.query(query);

        if (patients.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Pasien tidak ditemukan atau tidak memiliki data pemantauan'
            });
        }

        console.log('✅ Patient found with monitoring data:', patients[0].name);

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

// Get detailed compliance history for a patient (SIMPLIFIED using direct join)
router.get('/:id/compliance-history', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 GET /patients/:id/compliance-history called with id:', id);

        const patientId = parseInt(id);
        if (isNaN(patientId)) {
            return res.status(400).json({
                success: false,
                error: 'ID pasien tidak valid'
            });
        }

        // SIMPLIFIED: Direct join using id_pengguna
        const query = `
            SELECT 
                rpo.created_at as consumption_date,
                rpo.persentase_konsumsi as compliance_percentage,
                COALESCE(po.nama_obat, 'Obat Tidak Diketahui') as medicine_name,
                COALESCE(npo.waktu_pengingat, '00:00:00') as reminder_time,
                CASE 
                    WHEN rpo.persentase_konsumsi >= 80 THEN 'Diminum'
                    WHEN rpo.persentase_konsumsi >= 50 THEN 'Terlambat'
                    ELSE 'Tidak Diminum'
                END as status,
                rpo.catatan as notes,
                DATEDIFF(rpo.created_at, COALESCE(po.created_at, rpo.created_at)) + 1 as day_number
            FROM riwayat_pemantauan_minum_obat rpo
            LEFT JOIN notifikasi_pengingat_obat npo ON rpo.id_notifikasi_pengingat_obat = npo.id_notifikasi_pengingat_obat
            LEFT JOIN catatan_pengingat_obat cpo ON npo.id_catatan_obat = cpo.id_catatan_obat
            LEFT JOIN penerimaan_obat po ON cpo.id_penerimaan_obat = po.id_penerimaan_obat
            WHERE rpo.id_pengguna = ${patientId}
            ORDER BY rpo.created_at DESC
            LIMIT 30
        `;

        const [history] = await pool.query(query);

        console.log('✅ Compliance history retrieved:', history.length, 'records');

        res.json({
            success: true,
            data: {
                patient_id: patientId,
                history: history
            }
        });

    } catch (error) {
        console.error('🚨 Get compliance history error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal mengambil riwayat kepatuhan',
            details: error.message
        });
    }
});

// Get compliance statistics (SIMPLIFIED using direct join)
router.get('/statistics/compliance', async (req, res) => {
    try {
        console.log('📊 GET /patients/statistics/compliance called');

        // SIMPLIFIED: Direct join using id_pengguna
        const query = `
            SELECT 
                COUNT(DISTINCT rpo.id_pengguna) as total_monitored_patients,
                COUNT(DISTINCT rpo.id_pemantauan_minum_obat) as total_monitoring_records,
                ROUND(AVG(rpo.persentase_konsumsi), 2) as average_compliance,
                COUNT(DISTINCT CASE WHEN rpo.persentase_konsumsi >= 80 THEN rpo.id_pengguna END) as high_compliance_patients,
                COUNT(DISTINCT CASE WHEN rpo.persentase_konsumsi BETWEEN 50 AND 79 THEN rpo.id_pengguna END) as medium_compliance_patients,
                COUNT(DISTINCT CASE WHEN rpo.persentase_konsumsi < 50 THEN rpo.id_pengguna END) as low_compliance_patients
            FROM riwayat_pemantauan_minum_obat rpo
            INNER JOIN pengguna p ON rpo.id_pengguna = p.id_pengguna
        `;

        const [stats] = await pool.query(query);

        res.json({
            success: true,
            data: {
                ...stats[0],
                note: "Statistics include only patients with monitoring data (using direct id_pengguna join)"
            }
        });

    } catch (error) {
        console.error('🚨 Get compliance statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal mengambil statistik kepatuhan',
            details: error.message
        });
    }
});

// Create new patient (unchanged)
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

// Test endpoint for monitoring data using direct id_pengguna join
router.get('/test/monitoring-direct', async (req, res) => {
    try {
        console.log('🧪 Testing DIRECT id_pengguna join for patients with monitoring data...');

        const query = `
            SELECT 
                p.id_pengguna,
                p.nama_lengkap,
                COUNT(DISTINCT rpo.id_pemantauan_minum_obat) as monitoring_records,
                ROUND(AVG(rpo.persentase_konsumsi), 2) as avg_compliance,
                MIN(rpo.created_at) as first_monitoring,
                MAX(rpo.created_at) as last_monitoring
            FROM pengguna p
            INNER JOIN riwayat_pemantauan_minum_obat rpo ON p.id_pengguna = rpo.id_pengguna
            GROUP BY p.id_pengguna, p.nama_lengkap
            HAVING COUNT(DISTINCT rpo.id_pemantauan_minum_obat) > 0
            ORDER BY avg_compliance DESC
            LIMIT 10
        `;

        const [results] = await pool.query(query);

        res.json({
            success: true,
            message: 'Direct id_pengguna join test successful',
            count: results.length,
            data: results,
            method: 'direct_id_pengguna_join',
            filter: 'only_patients_with_monitoring_data'
        });

    } catch (error) {
        console.error('🚨 Direct monitoring test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error
        });
    }
});

// Alternative test endpoint with even simpler query
router.get('/test/simple-monitoring', async (req, res) => {
    try {
        console.log('🧪 Testing SIMPLEST monitoring data query...');

        // Most basic query to test the direct relationship
        const query = `
            SELECT 
                rpo.id_pengguna,
                COUNT(*) as total_records,
                AVG(rpo.persentase_konsumsi) as avg_compliance
            FROM riwayat_pemantauan_minum_obat rpo
            GROUP BY rpo.id_pengguna
            ORDER BY total_records DESC
            LIMIT 5
        `;

        const [results] = await pool.query(query);

        // Get patient names for the results
        if (results.length > 0) {
            const ids = results.map(r => r.id_pengguna).join(',');
            const nameQuery = `
                SELECT id_pengguna, nama_lengkap 
                FROM pengguna 
                WHERE id_pengguna IN (${ids})
            `;
            const [names] = await pool.query(nameQuery);
            
            // Merge the results
            results.forEach(result => {
                const patient = names.find(n => n.id_pengguna === result.id_pengguna);
                result.nama_lengkap = patient ? patient.nama_lengkap : 'Unknown';
            });
        }

        res.json({
            success: true,
            message: 'Simple monitoring query test successful',
            count: results.length,
            data: results,
            method: 'direct_riwayat_pemantauan_query'
        });

    } catch (error) {
        console.error('🚨 Simple monitoring test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error
        });
    }
});

module.exports = router;