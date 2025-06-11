const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Get all medicines - MENGGUNAKAN VIEW medicines
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

        const offset = (parseInt(page) - 1) * parseInt(limit);
        let conditions = [];
        let params = [];

        if (search) {
            conditions.push('(name LIKE ? OR description LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        if (type) {
            conditions.push('type = ?');
            params.push(type);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        // Count menggunakan view medicines
        const countQuery = `SELECT COUNT(*) as total FROM medicines ${whereClause}`;
        const [countResult] = await pool.execute(countQuery, params);
        const totalRecords = parseInt(countResult[0].total);
        const totalPages = Math.ceil(totalRecords / parseInt(limit));

        // Main query menggunakan view medicines
        const query = `
            SELECT 
                m.*,
                COUNT(DISTINCT p.id) as total_prescriptions,
                COUNT(DISTINCT pat.id) as total_patients,
                AVG(pcv.compliance_percentage) as avg_compliance
            FROM medicines m
            LEFT JOIN prescriptions p ON m.id = p.medicine_id
            LEFT JOIN patients pat ON p.patient_id = pat.id
            LEFT JOIN patient_compliance_view pcv ON p.id = pcv.prescription_id
            ${whereClause}
            GROUP BY m.id, m.name, m.type, m.dosage, m.description, m.created_at
            ORDER BY m.${sortBy} ${sortOrder}
            LIMIT ? OFFSET ?
        `;

        const [medicines] = await pool.execute(query, [...params, parseInt(limit), offset]);

        res.json({
            success: true,
            data: {
                medicines,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalRecords,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1
                }
            }
        });

    } catch (error) {
        console.error('Get medicines error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal mengambil data obat'
        });
    }
});

// Create medicine - INSERT ke tabel penerimaan_obat
router.post('/', async (req, res) => {
    try {
        const {
            name,
            type,
            dosage,
            description
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Nama obat wajib diisi'
            });
        }

        // Insert ke penerimaan_obat (bukan medicines)
        // Note: Perlu id_pengiriman_obat yang valid
        const query = `
            INSERT INTO penerimaan_obat 
            (id_pengiriman_obat, tanggal_diterima, nama_penerima, keterangan_barang_diterima, alamat, nama_obat)
            VALUES (?, NOW(), ?, 'Pesanan Diterima', ?, ?)
        `;

        const [result] = await pool.execute(query, [
            1, // Default id_pengiriman_obat, perlu disesuaikan
            'Admin',
            'Apotek',
            name
        ]);

        const newMedicine = {
            id: result.insertId,
            name,
            type: 'Obat',
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
            error: 'Gagal menambahkan obat'
        });
    }
});

// Update medicine
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            type,
            dosage,
            description
        } = req.body;

        // Check if medicine exists
        const [existingMedicine] = await pool.execute(
            'SELECT id FROM medicines WHERE id = ?',
            [id]
        );

        if (existingMedicine.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Obat tidak ditemukan'
            });
        }

        // Check if new name conflicts with another medicine
        if (name) {
            const [conflictingMedicine] = await pool.execute(
                'SELECT id FROM medicines WHERE name = ? AND id != ?',
                [name, id]
            );

            if (conflictingMedicine.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'Nama obat sudah digunakan'
                });
            }
        }

        const query = `
            UPDATE medicines 
            SET name = ?, type = ?, dosage = ?, description = ?
            WHERE id = ?
        `;

        await pool.execute(query, [
            name,
            type || null,
            dosage || null,
            description || null,
            id
        ]);

        // Get updated medicine data
        const [updatedMedicine] = await pool.execute(
            'SELECT * FROM medicines WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            data: updatedMedicine[0],
            message: 'Data obat berhasil diperbarui'
        });

    } catch (error) {
        console.error('Update medicine error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal memperbarui data obat'
        });
    }
});

// Delete medicine
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if medicine exists
        const [existingMedicine] = await pool.execute(
            'SELECT id, name FROM medicines WHERE id = ?',
            [id]
        );

        if (existingMedicine.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Obat tidak ditemukan'
            });
        }

        // Check if medicine is used in any prescriptions
        const [prescriptions] = await pool.execute(
            'SELECT COUNT(*) as count FROM prescriptions WHERE medicine_id = ?',
            [id]
        );

        if (prescriptions[0].count > 0) {
            return res.status(409).json({
                success: false,
                error: 'Tidak dapat menghapus obat yang sedang digunakan dalam resep'
            });
        }

        await pool.execute('DELETE FROM medicines WHERE id = ?', [id]);

        res.json({
            success: true,
            message: `Obat ${existingMedicine[0].name} berhasil dihapus`
        });

    } catch (error) {
        console.error('Delete medicine error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal menghapus obat'
        });
    }
});

// Get medicine statistics
router.get('/:id/statistics', async (req, res) => {
    try {
        const { id } = req.params;

        const statsQueries = {
            // Total prescriptions for this medicine
            totalPrescriptions: `
                SELECT COUNT(*) as count 
                FROM prescriptions 
                WHERE medicine_id = ?
            `,
            // Active prescriptions
            activePrescriptions: `
                SELECT COUNT(*) as count 
                FROM prescriptions 
                WHERE medicine_id = ? 
                AND DATE_ADD(prescription_date, INTERVAL duration_days DAY) >= CURRENT_DATE
            `,
            // Compliance stats
            complianceStats: `
                SELECT 
                    AVG(pcv.compliance_percentage) as avg_compliance,
                    MIN(pcv.compliance_percentage) as min_compliance,
                    MAX(pcv.compliance_percentage) as max_compliance
                FROM patient_compliance_view pcv
                JOIN prescriptions p ON pcv.prescription_id = p.id
                WHERE p.medicine_id = ?
            `,
            // Usage by gender
            usageByGender: `
                SELECT 
                    pat.gender,
                    COUNT(*) as count
                FROM prescriptions p
                JOIN patients pat ON p.patient_id = pat.id
                WHERE p.medicine_id = ?
                GROUP BY pat.gender
            `,
            // Usage trend (last 6 months)
            usageTrend: `
                SELECT 
                    MONTH(prescription_date) as month,
                    YEAR(prescription_date) as year,
                    COUNT(*) as prescriptions
                FROM prescriptions 
                WHERE medicine_id = ?
                AND prescription_date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
                GROUP BY YEAR(prescription_date), MONTH(prescription_date)
                ORDER BY year ASC, month ASC
            `
        };

        const results = {};
        
        for (const [key, query] of Object.entries(statsQueries)) {
            const [result] = await pool.execute(query, [id]);
            results[key] = result;
        }

        const statistics = {
            totalPrescriptions: parseInt(results.totalPrescriptions[0].count),
            activePrescriptions: parseInt(results.activePrescriptions[0].count),
            complianceStats: results.complianceStats[0],
            usageByGender: results.usageByGender,
            usageTrend: results.usageTrend
        };

        res.json({
            success: true,
            data: statistics
        });

    } catch (error) {
        console.error('Get medicine statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal mengambil statistik obat'
        });
    }
});

// Get medicines with low compliance
router.get('/analytics/low-compliance', async (req, res) => {
    try {
        const { threshold = 70, limit = 10 } = req.query;

        const query = `
            SELECT 
                m.*,
                AVG(pcv.compliance_percentage) as avg_compliance,
                COUNT(DISTINCT pcv.id) as patient_count
            FROM medicines m
            JOIN prescriptions p ON m.id = p.medicine_id
            JOIN patient_compliance_view pcv ON p.id = pcv.prescription_id
            GROUP BY m.id, m.name, m.type, m.dosage
            HAVING avg_compliance < ?
            ORDER BY avg_compliance ASC
            LIMIT ?
        `;

        const [medicines] = await pool.execute(query, [parseFloat(threshold), parseInt(limit)]);

        res.json({
            success: true,
            data: medicines
        });

    } catch (error) {
        console.error('Get low compliance medicines error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal mengambil data obat dengan kepatuhan rendah'
        });
    }
});

// Get most prescribed medicines
router.get('/analytics/most-prescribed', async (req, res) => {
    try {
        const { period = '30', limit = 10 } = req.query;

        const query = `
            SELECT 
                m.*,
                COUNT(p.id) as prescription_count,
                COUNT(DISTINCT p.patient_id) as unique_patients,
                AVG(pcv.compliance_percentage) as avg_compliance
            FROM medicines m
            JOIN prescriptions p ON m.id = p.medicine_id
            LEFT JOIN patient_compliance_view pcv ON p.id = pcv.prescription_id
            WHERE p.prescription_date >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
            GROUP BY m.id, m.name, m.type, m.dosage
            ORDER BY prescription_count DESC
            LIMIT ?
        `;

        const [medicines] = await pool.execute(query, [parseInt(period), parseInt(limit)]);

        res.json({
            success: true,
            data: medicines
        });

    } catch (error) {
        console.error('Get most prescribed medicines error:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal mengambil data obat paling banyak diresepkan'
        });
    }
});

module.exports = router;