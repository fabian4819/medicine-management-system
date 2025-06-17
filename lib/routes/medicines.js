const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// Get all medicines - simplified for serverless
router.get('/', async (req, res) => {
    try {
        const {
            search = '',
            type = '',
            page = 1,
            limit = 50,
            sortBy = 'name',
            sortOrder = 'ASC'
        } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(Math.max(1, parseInt(limit)), 100);
        const offset = (pageNum - 1) * limitNum;

        // Direct query approach for reliability
        let countQuery = `SELECT COUNT(DISTINCT nama_obat) as total FROM penerimaan_obat WHERE nama_obat IS NOT NULL AND nama_obat != ''`;
        let mainQuery = `
            SELECT 
                ROW_NUMBER() OVER (ORDER BY nama_obat) as id,
                nama_obat as name,
                'Obat' as type,
                '' as dosage,
                CONCAT('Obat ', nama_obat) as description,
                MIN(created_at) as created_at,
                COUNT(*) as total_prescriptions,
                0 as total_patients,
                ROUND(RAND() * 100, 0) as avg_compliance
            FROM penerimaan_obat 
            WHERE nama_obat IS NOT NULL AND nama_obat != ''
        `;

        // Add search condition if provided
        if (search) {
            const searchCondition = ` AND nama_obat LIKE '%${search}%'`;
            countQuery += searchCondition;
            mainQuery += searchCondition;
        }

        mainQuery += ` GROUP BY nama_obat ORDER BY nama_obat ${sortOrder} LIMIT ${limitNum} OFFSET ${offset}`;

        // Get total count
        const [countResult] = await pool.query(countQuery);
        const totalRecords = parseInt(countResult[0].total);
        const totalPages = Math.ceil(totalRecords / limitNum);

        // Get medicines
        const [medicines] = await pool.query(mainQuery);

        res.json({
            success: true,
            data: {
                medicines,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalRecords,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            }
        });

    } catch (error) {
        console.error('Get medicines error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal mengambil data obat',
            details: error.message
        });
    }
});

// Get medicine by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const medicineId = parseInt(id);

        if (isNaN(medicineId)) {
            return res.status(400).json({
                success: false,
                error: 'ID obat tidak valid'
            });
        }

        // Get medicine by row number (since we use ROW_NUMBER() as ID)
        const query = `
            SELECT * FROM (
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY nama_obat) as id,
                    nama_obat as name,
                    'Obat' as type,
                    '' as dosage,
                    CONCAT('Obat ', nama_obat) as description,
                    MIN(created_at) as created_at,
                    COUNT(*) as total_prescriptions
                FROM penerimaan_obat 
                WHERE nama_obat IS NOT NULL AND nama_obat != ''
                GROUP BY nama_obat
                ORDER BY nama_obat
            ) medicines_numbered
            WHERE id = ${medicineId}
        `;

        const [medicines] = await pool.query(query);

        if (medicines.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Obat tidak ditemukan'
            });
        }

        res.json({
            success: true,
            data: medicines[0]
        });

    } catch (error) {
        console.error('Get medicine by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal mengambil data obat',
            details: error.message
        });
    }
});

// Create medicine - simplified
router.post('/', async (req, res) => {
    try {
        const {
            name,
            type = 'Obat',
            dosage = '',
            description = ''
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Nama obat wajib diisi'
            });
        }

        // Insert into penerimaan_obat table
        const query = `
            INSERT INTO penerimaan_obat 
            (id_pengiriman_obat, tanggal_diterima, nama_penerima, keterangan_barang_diterima, alamat, nama_obat)
            VALUES (?, NOW(), ?, 'Pesanan Diterima', ?, ?)
        `;

        const [result] = await pool.execute(query, [
            1, // Default id_pengiriman_obat
            'Admin',
            'Apotek',
            name
        ]);

        const newMedicine = {
            id: result.insertId,
            name,
            type,
            dosage,
            description,
            created_at: new Date().toISOString()
        };

        res.status(201).json({
            success: true,
            data: newMedicine,
            message: 'Obat berhasil ditambahkan'
        });

    } catch (error) {
        console.error('Create medicine error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal menambahkan obat',
            details: error.message
        });
    }
});

// Get medicine statistics - simplified
router.get('/:id/statistics', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Simple mock statistics for now
        const statistics = {
            totalPrescriptions: Math.floor(Math.random() * 100),
            activePrescriptions: Math.floor(Math.random() * 50),
            complianceStats: {
                avg_compliance: Math.floor(Math.random() * 100),
                min_compliance: Math.floor(Math.random() * 50),
                max_compliance: Math.floor(Math.random() * 50) + 50
            },
            usageByGender: [
                { gender: 'L', count: Math.floor(Math.random() * 50) },
                { gender: 'P', count: Math.floor(Math.random() * 50) }
            ],
            usageTrend: []
        };

        res.json({
            success: true,
            data: statistics
        });

    } catch (error) {
        console.error('Get medicine statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal mengambil statistik obat',
            details: error.message
        });
    }
});

// Get medicines with low compliance - mock data
router.get('/analytics/low-compliance', async (req, res) => {
    try {
        const { threshold = 70, limit = 10 } = req.query;

        const query = `
            SELECT 
                ROW_NUMBER() OVER (ORDER BY nama_obat) as id,
                nama_obat as name,
                'Obat' as type,
                '' as dosage,
                ROUND(RAND() * 70, 0) as avg_compliance,
                COUNT(*) as patient_count
            FROM penerimaan_obat
            WHERE nama_obat IS NOT NULL AND nama_obat != ''
            GROUP BY nama_obat
            LIMIT ${parseInt(limit)}
        `;

        const [medicines] = await pool.query(query);

        res.json({
            success: true,
            data: medicines
        });

    } catch (error) {
        console.error('Get low compliance medicines error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal mengambil data obat dengan kepatuhan rendah',
            details: error.message
        });
    }
});

// Get most prescribed medicines - mock data
router.get('/analytics/most-prescribed', async (req, res) => {
    try {
        const { period = '30', limit = 10 } = req.query;

        const query = `
            SELECT 
                ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as id,
                nama_obat as name,
                'Obat' as type,
                '' as dosage,
                COUNT(*) as prescription_count,
                COUNT(DISTINCT id_penerimaan_obat) as unique_patients,
                ROUND(RAND() * 100, 0) as avg_compliance
            FROM penerimaan_obat
            WHERE nama_obat IS NOT NULL AND nama_obat != ''
            AND created_at >= DATE_SUB(CURRENT_DATE, INTERVAL ${parseInt(period)} DAY)
            GROUP BY nama_obat
            ORDER BY prescription_count DESC
            LIMIT ${parseInt(limit)}
        `;

        const [medicines] = await pool.query(query);

        res.json({
            success: true,
            data: medicines
        });

    } catch (error) {
        console.error('Get most prescribed medicines error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal mengambil data obat paling banyak diresepkan',
            details: error.message
        });
    }
});

module.exports = router;