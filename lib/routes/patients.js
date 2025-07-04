const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// OPTIMIZED: Get patients with real compliance percentage from database
// FILTERED: Only show patients who have monitoring data
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

        // Query to get ONLY patients with monitoring data
        let countQuery, mainQuery;
        const searchParam = search ? `%${search}%` : '';

        if (search) {
            // With search - ONLY patients with monitoring data
            countQuery = `
                SELECT COUNT(DISTINCT p.id_pengguna) as total 
                FROM pengguna p 
                INNER JOIN pengiriman_obat pgr ON p.id_pengguna = pgr.id_pengguna
                INNER JOIN penerimaan_obat po ON pgr.id_pengambilan_obat = po.id_pengiriman_obat
                INNER JOIN catatan_pengingat_obat cpo ON po.id_penerimaan_obat = cpo.id_penerimaan_obat
                INNER JOIN notifikasi_pengingat_obat npo ON cpo.id_catatan_obat = npo.id_catatan_obat
                INNER JOIN riwayat_pemantauan_minum_obat rpo ON npo.id_notifikasi_pengingat_obat = rpo.id_notifikasi_pengingat_obat
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
                    DATE(MIN(po.created_at)) as prescription_date,
                    7 as duration_days,
                    ROUND(AVG(rpo.persentase_konsumsi), 2) as compliance_percentage,
                    GROUP_CONCAT(DISTINCT po.nama_obat SEPARATOR ', ') as medicine_name,
                    COUNT(DISTINCT rpo.id_pemantauan_minum_obat) as total_doses,
                    COUNT(DISTINCT CASE WHEN rpo.persentase_konsumsi >= 80 THEN rpo.id_pemantauan_minum_obat END) as taken_doses
                FROM pengguna p 
                INNER JOIN pengiriman_obat pgr ON p.id_pengguna = pgr.id_pengguna
                INNER JOIN penerimaan_obat po ON pgr.id_pengambilan_obat = po.id_pengiriman_obat
                INNER JOIN catatan_pengingat_obat cpo ON po.id_penerimaan_obat = cpo.id_penerimaan_obat
                INNER JOIN notifikasi_pengingat_obat npo ON cpo.id_catatan_obat = npo.id_catatan_obat
                INNER JOIN riwayat_pemantauan_minum_obat rpo ON npo.id_notifikasi_pengingat_obat = rpo.id_notifikasi_pengingat_obat
                WHERE (p.nama_lengkap LIKE '${searchParam}' OR CONCAT('RM', LPAD(p.id_pengguna, 6, '0')) LIKE '${searchParam}')
                GROUP BY p.id_pengguna, p.nama_lengkap, p.tanggal_lahir, p.jenis_kelamin, p.created_at
                HAVING COUNT(DISTINCT rpo.id_pemantauan_minum_obat) > 0
                ORDER BY AVG(rpo.persentase_konsumsi) DESC, p.nama_lengkap ASC 
                LIMIT ${limitNum} OFFSET ${offset}
            `;
        } else {
            // Without search - ONLY patients with monitoring data
            countQuery = `
                SELECT COUNT(DISTINCT p.id_pengguna) as total 
                FROM pengguna p 
                INNER JOIN pengiriman_obat pgr ON p.id_pengguna = pgr.id_pengguna
                INNER JOIN penerimaan_obat po ON pgr.id_pengambilan_obat = po.id_pengiriman_obat
                INNER JOIN catatan_pengingat_obat cpo ON po.id_penerimaan_obat = cpo.id_penerimaan_obat
                INNER JOIN notifikasi_pengingat_obat npo ON cpo.id_catatan_obat = npo.id_catatan_obat
                INNER JOIN riwayat_pemantauan_minum_obat rpo ON npo.id_notifikasi_pengingat_obat = rpo.id_notifikasi_pengingat_obat
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
                    DATE(MIN(po.created_at)) as prescription_date,
                    7 as duration_days,
                    ROUND(AVG(rpo.persentase_konsumsi), 2) as compliance_percentage,
                    GROUP_CONCAT(DISTINCT po.nama_obat SEPARATOR ', ') as medicine_name,
                    COUNT(DISTINCT rpo.id_pemantauan_minum_obat) as total_doses,
                    COUNT(DISTINCT CASE WHEN rpo.persentase_konsumsi >= 80 THEN rpo.id_pemantauan_minum_obat END) as taken_doses
                FROM pengguna p 
                INNER JOIN pengiriman_obat pgr ON p.id_pengguna = pgr.id_pengguna
                INNER JOIN penerimaan_obat po ON pgr.id_pengambilan_obat = po.id_pengiriman_obat
                INNER JOIN catatan_pengingat_obat cpo ON po.id_penerimaan_obat = cpo.id_penerimaan_obat
                INNER JOIN notifikasi_pengingat_obat npo ON cpo.id_catatan_obat = npo.id_catatan_obat
                INNER JOIN riwayat_pemantauan_minum_obat rpo ON npo.id_notifikasi_pengingat_obat = rpo.id_notifikasi_pengingat_obat
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
                query: 'pengguna_with_monitoring_data_only',
                method: 'inner_join_query',
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

// Get patient by ID with detailed compliance data (unchanged but improved)
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

        // Only get patient if they have monitoring data
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
                DATE(MIN(po.created_at)) as prescription_date,
                7 as duration_days,
                ROUND(AVG(rpo.persentase_konsumsi), 2) as compliance_percentage,
                GROUP_CONCAT(DISTINCT po.nama_obat SEPARATOR ', ') as medicine_name,
                COUNT(DISTINCT rpo.id_pemantauan_minum_obat) as total_doses,
                COUNT(DISTINCT CASE WHEN rpo.persentase_konsumsi >= 80 THEN rpo.id_pemantauan_minum_obat END) as taken_doses
            FROM pengguna p
            INNER JOIN pengiriman_obat pgr ON p.id_pengguna = pgr.id_pengguna
            INNER JOIN penerimaan_obat po ON pgr.id_pengambilan_obat = po.id_pengiriman_obat
            INNER JOIN catatan_pengingat_obat cpo ON po.id_penerimaan_obat = cpo.id_penerimaan_obat
            INNER JOIN notifikasi_pengingat_obat npo ON cpo.id_catatan_obat = npo.id_catatan_obat
            INNER JOIN riwayat_pemantauan_minum_obat rpo ON npo.id_notifikasi_pengingat_obat = rpo.id_notifikasi_pengingat_obat
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

// Get detailed compliance history for a patient (unchanged)
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

        const query = `
            SELECT 
                rpo.created_at as consumption_date,
                rpo.persentase_konsumsi as compliance_percentage,
                po.nama_obat as medicine_name,
                npo.waktu_pengingat as reminder_time,
                CASE 
                    WHEN rpo.persentase_konsumsi >= 80 THEN 'Diminum'
                    WHEN rpo.persentase_konsumsi >= 50 THEN 'Terlambat'
                    ELSE 'Tidak Diminum'
                END as status,
                rpo.catatan as notes,
                DATEDIFF(rpo.created_at, po.created_at) + 1 as day_number
            FROM pengguna p
            JOIN pengiriman_obat pgr ON p.id_pengguna = pgr.id_pengguna
            JOIN penerimaan_obat po ON pgr.id_pengambilan_obat = po.id_pengiriman_obat
            JOIN catatan_pengingat_obat cpo ON po.id_penerimaan_obat = cpo.id_penerimaan_obat
            JOIN notifikasi_pengingat_obat npo ON cpo.id_catatan_obat = npo.id_catatan_obat
            JOIN riwayat_pemantauan_minum_obat rpo ON npo.id_notifikasi_pengingat_obat = rpo.id_notifikasi_pengingat_obat
            WHERE p.id_pengguna = ${patientId}
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

// Get compliance statistics (updated to reflect only monitored patients)
router.get('/statistics/compliance', async (req, res) => {
    try {
        console.log('📊 GET /patients/statistics/compliance called');

        const query = `
            SELECT 
                COUNT(DISTINCT p.id_pengguna) as total_monitored_patients,
                COUNT(DISTINCT rpo.id_pemantauan_minum_obat) as total_monitoring_records,
                ROUND(AVG(rpo.persentase_konsumsi), 2) as average_compliance,
                COUNT(DISTINCT CASE WHEN rpo.persentase_konsumsi >= 80 THEN p.id_pengguna END) as high_compliance_patients,
                COUNT(DISTINCT CASE WHEN rpo.persentase_konsumsi BETWEEN 50 AND 79 THEN p.id_pengguna END) as medium_compliance_patients,
                COUNT(DISTINCT CASE WHEN rpo.persentase_konsumsi < 50 THEN p.id_pengguna END) as low_compliance_patients
            FROM pengguna p
            INNER JOIN pengiriman_obat pgr ON p.id_pengguna = pgr.id_pengguna
            INNER JOIN penerimaan_obat po ON pgr.id_pengambilan_obat = po.id_pengiriman_obat
            INNER JOIN catatan_pengingat_obat cpo ON po.id_penerimaan_obat = cpo.id_penerimaan_obat
            INNER JOIN notifikasi_pengingat_obat npo ON cpo.id_catatan_obat = npo.id_catatan_obat
            INNER JOIN riwayat_pemantauan_minum_obat rpo ON npo.id_notifikasi_pengingat_obat = rpo.id_notifikasi_pengingat_obat
        `;

        const [stats] = await pool.query(query);

        res.json({
            success: true,
            data: {
                ...stats[0],
                note: "Statistics include only patients with monitoring data"
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

// Test endpoint for monitoring data only
router.get('/test/monitoring-only', async (req, res) => {
    try {
        console.log('🧪 Testing query for patients with monitoring data only...');

        const query = `
            SELECT 
                p.id_pengguna,
                p.nama_lengkap,
                COUNT(DISTINCT rpo.id_pemantauan_minum_obat) as monitoring_records,
                ROUND(AVG(rpo.persentase_konsumsi), 2) as avg_compliance
            FROM pengguna p
            INNER JOIN pengiriman_obat pgr ON p.id_pengguna = pgr.id_pengguna
            INNER JOIN penerimaan_obat po ON pgr.id_pengambilan_obat = po.id_pengiriman_obat
            INNER JOIN catatan_pengingat_obat cpo ON po.id_penerimaan_obat = cpo.id_penerimaan_obat
            INNER JOIN notifikasi_pengingat_obat npo ON cpo.id_catatan_obat = npo.id_catatan_obat
            INNER JOIN riwayat_pemantauan_minum_obat rpo ON npo.id_notifikasi_pengingat_obat = rpo.id_notifikasi_pengingat_obat
            GROUP BY p.id_pengguna, p.nama_lengkap
            HAVING COUNT(DISTINCT rpo.id_pemantauan_minum_obat) > 0
            ORDER BY avg_compliance DESC
            LIMIT 10
        `;

        const [results] = await pool.query(query);

        res.json({
            success: true,
            message: 'Monitoring data filter test successful',
            count: results.length,
            data: results,
            filter: 'only_patients_with_monitoring_data'
        });

    } catch (error) {
        console.error('🚨 Monitoring test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error
        });
    }
});

// Test compliance query endpoint (unchanged)
router.get('/test/compliance', async (req, res) => {
    try {
        console.log('🧪 Testing compliance query...');

        const query = `
            SELECT 
                p.id_pengguna,
                p.nama_lengkap,
                AVG(rpo.persentase_konsumsi) as avg_compliance,
                COUNT(rpo.id_pemantauan_minum_obat) as total_records
            FROM pengguna p
            LEFT JOIN pengiriman_obat pgr ON p.id_pengguna = pgr.id_pengguna
            LEFT JOIN penerimaan_obat po ON pgr.id_pengambilan_obat = po.id_pengiriman_obat
            LEFT JOIN catatan_pengingat_obat cpo ON po.id_penerimaan_obat = cpo.id_penerimaan_obat
            LEFT JOIN notifikasi_pengingat_obat npo ON cpo.id_catatan_obat = npo.id_catatan_obat
            LEFT JOIN riwayat_pemantauan_minum_obat rpo ON npo.id_notifikasi_pengingat_obat = rpo.id_notifikasi_pengingat_obat
            GROUP BY p.id_pengguna, p.nama_lengkap
            LIMIT 5
        `;

        const [results] = await pool.query(query);

        res.json({
            success: true,
            message: 'Compliance query test successful',
            count: results.length,
            data: results
        });

    } catch (error) {
        console.error('🚨 Compliance test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error
        });
    }
});

module.exports = router;