console.log('📊 Export & Filter module loaded');

// Global filter state
let currentFilters = {
    gender: '',
    compliance: '',
    dateFrom: '',
    dateTo: '',
    medicine: ''
};

// Show/Hide Filter Panel
function toggleFilterPanel() {
    const filterPanel = document.getElementById('filterPanel');
    if (filterPanel) {
        const isVisible = filterPanel.style.display !== 'none';
        filterPanel.style.display = isVisible ? 'none' : 'block';
        
        // Update button text
        const filterBtn = document.querySelector('.filter-btn');
        if (filterBtn) {
            filterBtn.textContent = isVisible ? '🔽 Filter' : '🔼 Hide Filter';
        }
    }
}

// Apply Filters
async function applyFilters() {
    try {
        console.log('🔍 Applying filters...');
        
        // Get filter values
        currentFilters.gender = document.getElementById('filterGender')?.value || '';
        currentFilters.compliance = document.getElementById('filterCompliance')?.value || '';
        currentFilters.dateFrom = document.getElementById('filterDateFrom')?.value || '';
        currentFilters.dateTo = document.getElementById('filterDateTo')?.value || '';
        currentFilters.medicine = document.getElementById('filterMedicine')?.value || '';
        
        console.log('Applied filters:', currentFilters);
        
        // Reset pagination
        currentPage = 1;
        
        // Reload data with filters
        await loadPatients();
        
        showSuccess('Filter berhasil diterapkan');
        
    } catch (error) {
        console.error('❌ Error applying filters:', error);
        showError('Gagal menerapkan filter');
    }
}

// Clear Filters
async function clearFilters() {
    try {
        console.log('🧹 Clearing filters...');
        
        // Reset filter values
        currentFilters = {
            gender: '',
            compliance: '',
            dateFrom: '',
            dateTo: '',
            medicine: ''
        };
        
        // Clear form inputs
        const filterInputs = ['filterGender', 'filterCompliance', 'filterDateFrom', 'filterDateTo', 'filterMedicine'];
        filterInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });
        
        // Reset pagination and reload
        currentPage = 1;
        await loadPatients();
        
        showSuccess('Filter berhasil dihapus');
        
    } catch (error) {
        console.error('❌ Error clearing filters:', error);
        showError('Gagal menghapus filter');
    }
}

// Export to Excel
function exportToExcel() {
    try {
        console.log('📊 Exporting to Excel...');
        
        if (!patients || patients.length === 0) {
            showError('Tidak ada data untuk diekspor');
            return;
        }
        
        // Prepare data for export
        const exportData = prepareExportData();
        
        // Create CSV content
        const csvContent = convertToCSV(exportData);
        
        // Download file
        downloadFile(csvContent, 'kepatuhan-minum-obat.csv', 'text/csv');
        
        showSuccess(`Berhasil mengekspor ${exportData.length} data ke Excel`);
        
    } catch (error) {
        console.error('❌ Error exporting to Excel:', error);
        showError('Gagal mengekspor ke Excel: ' + error.message);
    }
}

// Export to PDF
function exportToPDF() {
    try {
        console.log('📄 Exporting to PDF...');
        
        if (!patients || patients.length === 0) {
            showError('Tidak ada data untuk diekspor');
            return;
        }
        
        // Create HTML content for PDF
        const htmlContent = generatePDFContent();
        
        // Open print dialog
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
        
        showSuccess('PDF siap untuk dicetak');
        
    } catch (error) {
        console.error('❌ Error exporting to PDF:', error);
        showError('Gagal mengekspor ke PDF: ' + error.message);
    }
}

// Export Patient Detail
function exportPatientDetail() {
    try {
        console.log('📋 Exporting patient detail...');
        
        const patientName = document.getElementById('modalPatientName')?.textContent || 'Unknown';
        const compliance = document.getElementById('modalCompliance')?.textContent || '0%';
        const rmNumber = document.getElementById('modalRMNumber')?.textContent || '-';
        
        // Prepare patient detail data
        const detailData = [
            ['Laporan Kepatuhan Minum Obat Pasien'],
            [''],
            ['Nama Pasien', patientName],
            ['Nomor RM', rmNumber],
            ['Persentase Kepatuhan', compliance],
            ['Durasi Konsumsi', '5 Hari'],
            ['Tanggal Laporan', new Date().toLocaleDateString('id-ID')],
            [''],
            ['Riwayat Konsumsi Obat'],
            ['Tanggal Konsumsi', 'Hari Ke-', 'Nama Obat', 'Waktu Minum', 'Status Kepatuhan', 'Keterangan'],
            ['11-03-2025', '1', 'Paracetamol', '07.00', 'Diminum', '-']
        ];
        
        const csvContent = detailData.map(row => row.join(',')).join('\n');
        downloadFile(csvContent, `laporan-${patientName.replace(/\s+/g, '-')}.csv`, 'text/csv');
        
        showSuccess('Laporan detail berhasil diekspor');
        
    } catch (error) {
        console.error('❌ Error exporting patient detail:', error);
        showError('Gagal mengekspor laporan detail');
    }
}

// Print Patient Detail
function printPatientDetail() {
    try {
        console.log('🖨️ Printing patient detail...');
        
        const modalContent = document.querySelector('#patientDetailModal .modal-content').cloneNode(true);
        
        // Remove close button and export buttons for print
        const closeBtn = modalContent.querySelector('.close-modal');
        const exportBtns = modalContent.querySelector('.export-buttons');
        if (closeBtn) closeBtn.remove();
        if (exportBtns) exportBtns.remove();
        
        // Create print content
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Laporan Kepatuhan Minum Obat</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .content-header { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 5px; }
                    .table-container { border: 1px solid #ddd; border-radius: 5px; overflow: hidden; }
                    .table-header { background: #d1ecf1; padding: 10px; display: grid; grid-template-columns: 1fr 0.8fr 1.2fr 1fr 1.2fr 1fr; gap: 10px; font-weight: bold; }
                    .table-row { padding: 10px; display: grid; grid-template-columns: 1fr 0.8fr 1.2fr 1fr 1.2fr 1fr; gap: 10px; border-bottom: 1px solid #eee; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                ${modalContent.innerHTML}
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
        
        showSuccess('Laporan siap untuk dicetak');
        
    } catch (error) {
        console.error('❌ Error printing patient detail:', error);
        showError('Gagal mencetak laporan');
    }
}

// Prepare data for export
function prepareExportData() {
    const exportData = [
        // Header row
        [
            'Tanggal Terima',
            'No RM',
            'Nama Pasien',
            'Jenis Kelamin',
            'Persentase Kepatuhan',
            'Obat',
            'Status',
            'Tanggal Ekspor'
        ]
    ];
    
    // Data rows
    patients.forEach(patient => {
        const prescriptionDate = patient.prescription_date ? 
            new Date(patient.prescription_date).toLocaleDateString('id-ID') : 
            '11-03-2025';
        
        const gender = patient.gender === 'L' ? 'Laki-laki' : 
                       patient.gender === 'P' ? 'Perempuan' : '-';
        
        const compliance = Math.round(patient.compliance_percentage || 70);
        const status = compliance >= 80 ? 'Baik' : 
                      compliance >= 50 ? 'Sedang' : 'Rendah';
        
        exportData.push([
            prescriptionDate,
            patient.rm_number || '008919',
            patient.name || 'Amirul Azmi',
            gender,
            compliance + '%',
            patient.medicine_name || 'paracetamol',
            status,
            new Date().toLocaleDateString('id-ID')
        ]);
    });
    
    return exportData;
}

// Convert data to CSV
function convertToCSV(data) {
    return data.map(row => {
        return row.map(field => {
            // Escape fields that contain commas, quotes, or newlines
            if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
                return '"' + field.replace(/"/g, '""') + '"';
            }
            return field;
        }).join(',');
    }).join('\n');
}

// Generate PDF content
function generatePDFContent() {
    const currentDate = new Date().toLocaleDateString('id-ID');
    const currentTime = new Date().toLocaleTimeString('id-ID');
    
    let tableRows = '';
    patients.forEach(patient => {
        const prescriptionDate = patient.prescription_date ? 
            new Date(patient.prescription_date).toLocaleDateString('id-ID') : 
            '11-03-2025';
        
        const gender = patient.gender === 'L' ? 'Laki-laki' : 
                       patient.gender === 'P' ? 'Perempuan' : '-';
        
        const compliance = Math.round(patient.compliance_percentage || 70);
        const complianceClass = compliance >= 80 ? 'high' : 
                               compliance >= 50 ? 'medium' : 'low';
        
        tableRows += `
            <tr>
                <td>${prescriptionDate}</td>
                <td>${patient.rm_number || '008919'}</td>
                <td>${patient.name || 'Amirul Azmi'}</td>
                <td>${gender}</td>
                <td class="compliance-${complianceClass}">${compliance}%</td>
                <td>${patient.medicine_name || 'paracetamol'}</td>
            </tr>
        `;
    });
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Laporan Kepatuhan Minum Obat</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 20px; 
                    color: #333;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 30px; 
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 20px;
                }
                .header h1 { 
                    color: #2c3e50; 
                    margin-bottom: 10px;
                }
                .meta-info { 
                    margin-bottom: 20px; 
                    display: flex; 
                    justify-content: space-between;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 20px;
                }
                th, td { 
                    border: 1px solid #ddd; 
                    padding: 8px; 
                    text-align: left;
                }
                th { 
                    background: #3498db; 
                    color: white; 
                    font-weight: bold;
                }
                tr:nth-child(even) { 
                    background: #f9f9f9; 
                }
                .compliance-high { color: #27ae60; font-weight: bold; }
                .compliance-medium { color: #f39c12; font-weight: bold; }
                .compliance-low { color: #e74c3c; font-weight: bold; }
                .footer { 
                    margin-top: 30px; 
                    text-align: center; 
                    font-size: 12px; 
                    color: #7f8c8d;
                    border-top: 1px solid #ddd;
                    padding-top: 15px;
                }
                @media print { 
                    body { margin: 0; }
                    .header { page-break-after: avoid; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📋 Laporan Kepatuhan Minum Obat</h1>
                <p>Sistem Manajemen Obat - Rumah Sakit</p>
            </div>
            
            <div class="meta-info">
                <div><strong>Tanggal Cetak:</strong> ${currentDate}</div>
                <div><strong>Waktu:</strong> ${currentTime}</div>
                <div><strong>Total Pasien:</strong> ${patients.length} orang</div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Tanggal Terima</th>
                        <th>No RM</th>
                        <th>Nama Pasien</th>
                        <th>Jenis Kelamin</th>
                        <th>Kepatuhan</th>
                        <th>Obat</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            
            <div class="footer">
                <p>Laporan ini digenerate secara otomatis oleh Sistem Manajemen Obat</p>
                <p>Dicetak pada: ${currentDate} ${currentTime}</p>
            </div>
        </body>
        </html>
    `;
}

// Download file utility
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
}

// Sync Data (refresh from server)
async function syncData() {
    try {
        console.log('🔄 Syncing data from server...');
        
        showLoading(true);
        
        // Clear current data
        patients = [];
        currentPage = 1;
        
        // Reload from server
        await loadPatients();
        
        showSuccess('Data berhasil disinkronisasi');
        
    } catch (error) {
        console.error('❌ Error syncing data:', error);
        showError('Gagal menyinkronisasi data');
    } finally {
        showLoading(false);
    }
}

// Confirm close modal
function confirmClose() {
    if (confirm('Apakah Anda yakin ingin menutup?')) {
        closeKepatuhanModal();
    }
}

// Make functions globally available
window.toggleFilterPanel = toggleFilterPanel;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.exportToExcel = exportToExcel;
window.exportToPDF = exportToPDF;
window.exportPatientDetail = exportPatientDetail;
window.printPatientDetail = printPatientDetail;
window.syncData = syncData;
window.confirmClose = confirmClose;

// Initialize filters in load patients function
const originalLoadPatients = window.loadPatients;
window.loadPatients = async function() {
    try {
        console.log('📊 Loading patients with filters...', { 
            page: currentPage, 
            limit: currentLimit, 
            search: currentSearch,
            filters: currentFilters
        });
        
        showLoading(true);
        
        const params = {
            page: currentPage,
            limit: currentLimit
        };
        
        if (currentSearch) {
            params.search = currentSearch;
        }
        
        // Add filters to params (for future API integration)
        if (currentFilters.gender) {
            params.gender = currentFilters.gender;
        }
        if (currentFilters.compliance) {
            params.compliance = currentFilters.compliance;
        }
        if (currentFilters.dateFrom) {
            params.dateFrom = currentFilters.dateFrom;
        }
        if (currentFilters.dateTo) {
            params.dateTo = currentFilters.dateTo;
        }
        if (currentFilters.medicine) {
            params.medicine = currentFilters.medicine;
        }
        
        console.log('🔍 Calling PatientAPI.getPatients with params:', params);
        const response = await PatientAPI.getPatients(params);
        
        console.log('✅ Received response:', response);
        
        if (response && response.success && response.data) {
            patients = response.data.patients || [];
            
            // Apply client-side filters for now (until backend supports them)
            patients = applyClientSideFilters(patients);
            
            console.log('👥 Loaded and filtered patients:', patients.length);
            
            displayPatients(patients);
            updatePagination(response.data.pagination);
            
            showSuccess(`Berhasil memuat ${patients.length} data pasien`);
        } else {
            console.warn('⚠️ Invalid response structure:', response);
            throw new Error('Format response tidak valid');
        }
        
    } catch (error) {
        console.error('❌ Error loading patients:', error);
        showError('Gagal memuat data pasien: ' + error.message);
        
        // Show empty state
        displayPatients([]);
        updatePagination({ currentPage: 1, totalPages: 1, totalRecords: 0 });
        
    } finally {
        showLoading(false);
    }
};

// Apply client-side filters (temporary until backend supports filtering)
function applyClientSideFilters(patientList) {
    let filtered = [...patientList];
    
    // Gender filter
    if (currentFilters.gender) {
        filtered = filtered.filter(patient => patient.gender === currentFilters.gender);
    }
    
    // Compliance filter
    if (currentFilters.compliance) {
        filtered = filtered.filter(patient => {
            const compliance = Math.round(patient.compliance_percentage || 70);
            switch (currentFilters.compliance) {
                case 'high': return compliance >= 80;
                case 'medium': return compliance >= 50 && compliance < 80;
                case 'low': return compliance < 50;
                default: return true;
            }
        });
    }
    
    // Medicine filter
    if (currentFilters.medicine) {
        filtered = filtered.filter(patient => 
            (patient.medicine_name || 'paracetamol').toLowerCase().includes(currentFilters.medicine.toLowerCase())
        );
    }
    
    // Date filters (mock implementation)
    // In real implementation, this would be handled by backend
    
    return filtered;
}