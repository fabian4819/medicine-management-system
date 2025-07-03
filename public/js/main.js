// main.js - UPDATED VERSION with real compliance data
console.log('🚀 Main.js loaded');

// Global state
let currentPage = 1;
let currentLimit = 10;
let currentSearch = '';
let patients = [];

// Initialize application
async function initializeApp() {
    try {
        console.log('🔧 Initializing application...');
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('✅ Application initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showError('Gagal menginisialisasi aplikasi: ' + error.message);
    }
}

// Show Kepatuhan Modal (main modal seperti di gambar)
async function showKepatuhanModal() {
    try {
        console.log('📋 Opening Kepatuhan Modal...');
        
        const modal = document.getElementById('kepatuhanModal');
        if (modal) {
            modal.classList.add('active');
            
            // Load data when modal opens
            await loadPatients();
        }
    } catch (error) {
        console.error('❌ Error opening Kepatuhan Modal:', error);
        showError('Gagal membuka modal kepatuhan');
    }
}

// Close Kepatuhan Modal
function closeKepatuhanModal() {
    const modal = document.getElementById('kepatuhanModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Show Patient Detail Modal (modal detail dengan riwayat compliance)
async function showPatientDetail(patientId) {
    try {
        console.log('👁️ Show patient detail:', patientId);
        
        const modal = document.getElementById('patientDetailModal');
        if (modal) {
            modal.classList.add('active');
            
            // Load patient detail and compliance history
            await loadPatientDetail(patientId);
        }
    } catch (error) {
        console.error('❌ Error showing patient detail:', error);
        showError('Gagal membuka detail pasien');
    }
}

// Close Patient Detail Modal
function closePatientDetailModal() {
    const modal = document.getElementById('patientDetailModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Load patients function
async function loadPatients() {
    try {
        console.log('📊 Loading patients...', { 
            page: currentPage, 
            limit: currentLimit, 
            search: currentSearch 
        });
        
        showLoading(true);
        
        const params = {
            page: currentPage,
            limit: currentLimit
        };
        
        if (currentSearch) {
            params.search = currentSearch;
        }
        
        console.log('🔍 Calling PatientAPI.getPatients with params:', params);
        const response = await PatientAPI.getPatients(params);
        
        console.log('✅ Received response:', response);
        
        if (response && response.success && response.data) {
            patients = response.data.patients || [];
            console.log('👥 Loaded patients:', patients.length);
            
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
}

// Load patient detail with real compliance history
async function loadPatientDetail(patientId) {
    try {
        console.log('📋 Loading patient detail for ID:', patientId);
        
        // Load basic patient info
        const patientResponse = await PatientAPI.getPatient(patientId);
        
        if (patientResponse && patientResponse.success && patientResponse.data) {
            const patient = patientResponse.data;
            
            // Update modal content with real data
            document.getElementById('modalPatientName').textContent = patient.name || '-';
            document.getElementById('modalCompliance').textContent = Math.round(patient.compliance_percentage || 0) + '%';
            document.getElementById('modalRMNumber').textContent = patient.rm_number || '-';
            document.getElementById('modalDuration').textContent = patient.duration_days + ' Hari' || '7 Hari';
            
            // Load compliance history
            await loadComplianceHistory(patientId);
            
        } else {
            throw new Error('Data pasien tidak ditemukan');
        }
        
    } catch (error) {
        console.error('❌ Error loading patient detail:', error);
        showError('Gagal memuat detail pasien: ' + error.message);
    }
}

// Load real compliance history from database
async function loadComplianceHistory(patientId) {
    try {
        console.log('📈 Loading compliance history for patient:', patientId);
        
        const response = await PatientAPI.getComplianceHistory(patientId);
        
        if (response && response.success && response.data && response.data.history) {
            const history = response.data.history;
            console.log('📊 Compliance history loaded:', history.length, 'records');
            
            displayConsumptionHistory(history);
        } else {
            console.warn('⚠️ No compliance history found');
            displayConsumptionHistory([]);
        }
        
    } catch (error) {
        console.error('❌ Error loading compliance history:', error);
        // Still show empty history rather than error
        displayConsumptionHistory([]);
    }
}

// Display consumption history in modal with real data
function displayConsumptionHistory(history) {
    const tableBody = document.getElementById('modalTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!history || history.length === 0) {
        tableBody.innerHTML = `
            <div class="no-data">
                <span>📋 Tidak ada data riwayat konsumsi</span>
            </div>
        `;
        return;
    }
    
    history.forEach(item => {
        const row = document.createElement('div');
        row.className = 'table-row';
        
        // Format date
        const date = new Date(item.consumption_date).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        // Format time
        const time = item.reminder_time ? 
            new Date('2000-01-01 ' + item.reminder_time).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            }) : '-';
        
        row.innerHTML = `
            <span>${date}</span>
            <span>${item.day_number || '-'}</span>
            <span>${item.medicine_name || '-'}</span>
            <span>${time}</span>
            <span class="status-${item.status.toLowerCase().replace(' ', '-')}">${item.status}</span>
            <span>${item.notes || '-'}</span>
        `;
        
        tableBody.appendChild(row);
    });
}

// Display patients in table with real compliance data
function displayPatients(patientList) {
    console.log('🖥️ Displaying patients:', patientList.length);
    
    const tableBody = document.getElementById('patientsTableBody');
    if (!tableBody) {
        console.error('❌ patientsTableBody element not found');
        return;
    }
    
    tableBody.innerHTML = '';
    
    if (!patientList || patientList.length === 0) {
        tableBody.innerHTML = `
            <div class="no-data">
                <span>🏥 Tidak ada data pasien ditemukan</span>
            </div>
        `;
        return;
    }
    
    patientList.forEach(patient => {
        const row = createPatientRow(patient);
        tableBody.appendChild(row);
    });
    
    console.log('✅ Patients displayed successfully');
}

// Create patient row with real compliance data
function createPatientRow(patient) {
    const row = document.createElement('div');
    row.className = 'table-row';
    
    // Format date
    const prescriptionDate = patient.prescription_date ? 
        new Date(patient.prescription_date).toLocaleDateString('id-ID') : 
        new Date(patient.created_at).toLocaleDateString('id-ID');
    
    // Use real compliance percentage from database
    const compliance = Math.round(patient.compliance_percentage || 0);
    const complianceClass = compliance >= 80 ? 'high' : 
                           compliance >= 50 ? 'medium' : 'low';
    
    // Use real medicine name from database
    const medicineName = patient.medicine_name || 'Tidak ada obat';
    
    // Calculate previous consumption indicator
    const totalDoses = patient.total_doses || 0;
    const takenDoses = patient.taken_doses || 0;
    const previousConsumption = totalDoses > 0 ? `${takenDoses}/${totalDoses}` : '-';
    
    row.innerHTML = `
        <span>${prescriptionDate}</span>
        <span>${patient.rm_number || 'RM000000'}</span>
        <span>${patient.name || 'Nama Tidak Diketahui'}</span>
        <span class="compliance ${complianceClass}">${compliance}%</span>
        <span>${medicineName}</span>
        <span>${previousConsumption}</span>
        <span class="actions">
            <button class="action-btn" onclick="showPatientDetail(${patient.id})" title="Lihat Detail">
                👁️
            </button>
        </span>
    `;
    
    return row;
}

// Update pagination
function updatePagination(pagination) {
    console.log('📄 Updating pagination:', pagination);
    
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (pageInfo) {
        pageInfo.textContent = `Halaman ${pagination.currentPage} dari ${pagination.totalPages}`;
    }
    
    if (prevBtn) {
        prevBtn.disabled = !pagination.hasPrevPage;
    }
    
    if (nextBtn) {
        nextBtn.disabled = !pagination.hasNextPage;
    }
}

// Setup event listeners
function setupEventListeners() {
    console.log('🎯 Setting up event listeners...');
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            currentSearch = e.target.value;
            currentPage = 1;
            loadPatients();
        }, 500));
    }
    
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeKepatuhanModal();
            closePatientDetailModal();
        }
    });
    
    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeKepatuhanModal();
            closePatientDetailModal();
        }
    });
    
    console.log('✅ Event listeners setup complete');
}

// Filter functions
function toggleFilterPanel() {
    const filterPanel = document.getElementById('filterPanel');
    if (filterPanel) {
        const isVisible = filterPanel.style.display === 'block';
        filterPanel.style.display = isVisible ? 'none' : 'block';
    }
}

function applyFilters() {
    // Get filter values
    const gender = document.getElementById('filterGender').value;
    const compliance = document.getElementById('filterCompliance').value;
    const medicine = document.getElementById('filterMedicine').value;
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;
    
    // Build search query (simplified for now)
    let searchQuery = '';
    if (medicine) {
        searchQuery = medicine;
    }
    
    currentSearch = searchQuery;
    currentPage = 1;
    loadPatients();
    
    showSuccess('Filter diterapkan');
}

function clearFilters() {
    // Clear all filter inputs
    document.getElementById('filterGender').value = '';
    document.getElementById('filterCompliance').value = '';
    document.getElementById('filterMedicine').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('searchInput').value = '';
    
    currentSearch = '';
    currentPage = 1;
    loadPatients();
    
    showSuccess('Filter dihapus');
}

// Pagination functions
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        loadPatients();
    }
}

function nextPage() {
    currentPage++;
    loadPatients();
}

// Search function
function searchPatients() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        currentSearch = searchInput.value;
        currentPage = 1;
        loadPatients();
    }
}

// Export functions
function exportToExcel() {
    console.log('📊 Export to Excel');
    try {
        // Simple export functionality
        const csvContent = generateCSVContent();
        downloadCSV(csvContent, 'data-kepatuhan-pasien.csv');
        showSuccess('Data berhasil diexport ke Excel');
    } catch (error) {
        console.error('❌ Export error:', error);
        showError('Gagal export data: ' + error.message);
    }
}

function exportToPDF() {
    console.log('📄 Export to PDF');
    showSuccess('Export PDF akan segera tersedia');
}

function exportPatientDetail() {
    console.log('📊 Export patient detail');
    showSuccess('Export detail pasien akan segera tersedia');
}

function printPatientDetail() {
    console.log('🖨️ Print patient detail');
    window.print();
}

// Generate CSV content for export
function generateCSVContent() {
    const headers = ['Tanggal Terima', 'No RM', 'Nama Pasien', 'Persentase Kepatuhan', 'Obat', 'Konsumsi Sebelumnya'];
    const rows = patients.map(patient => [
        patient.prescription_date ? new Date(patient.prescription_date).toLocaleDateString('id-ID') : '-',
        patient.rm_number || '-',
        patient.name || '-',
        Math.round(patient.compliance_percentage || 0) + '%',
        patient.medicine_name || '-',
        patient.total_doses > 0 ? `${patient.taken_doses}/${patient.total_doses}` : '-'
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
    
    return csvContent;
}

// Download CSV file
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Sync data function
async function syncData() {
    try {
        console.log('🔄 Syncing data...');
        showLoading(true);
        await loadPatients();
        showSuccess('Data berhasil disinkronisasi');
    } catch (error) {
        console.error('❌ Sync error:', error);
        showError('Gagal sinkronisasi data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Confirm close function
function confirmClose() {
    if (confirm('Apakah Anda yakin ingin menutup modal?')) {
        closeKepatuhanModal();
    }
}

// Utility functions
function showLoading(show) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'flex' : 'none';
    }
}

function showError(message) {
    console.error('🚨 Error:', message);
    
    const errorToast = document.getElementById('errorToast');
    const errorMessage = document.getElementById('errorMessage');
    
    if (errorToast && errorMessage) {
        errorMessage.textContent = message;
        errorToast.style.display = 'block';
        
        setTimeout(() => {
            errorToast.style.display = 'none';
        }, 5000);
    } else {
        alert(message); // Fallback
    }
}

function showSuccess(message) {
    console.log('✅ Success:', message);
    
    const successToast = document.getElementById('successToast');
    const successMessage = document.getElementById('successMessage');
    
    if (successToast && successMessage) {
        successMessage.textContent = message;
        successToast.style.display = 'block';
        
        setTimeout(() => {
            successToast.style.display = 'none';
        }, 3000);
    }
}

function hideToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.style.display = 'none';
    }
}

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// View management (placeholder for other features)
function showView(viewName) {
    console.log('🖥️ Switching to view:', viewName);
    alert(`Fitur ${viewName} akan segera tersedia`);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing app...');
    
    // Wait a bit for all scripts to load
    setTimeout(() => {
        initializeApp();
    }, 100);
});

// Make functions available globally
window.showKepatuhanModal = showKepatuhanModal;
window.closeKepatuhanModal = closeKepatuhanModal;
window.showPatientDetail = showPatientDetail;
window.closePatientDetailModal = closePatientDetailModal;
window.loadPatients = loadPatients;
window.searchPatients = searchPatients;
window.previousPage = previousPage;
window.nextPage = nextPage;
window.exportToExcel = exportToExcel;
window.exportToPDF = exportToPDF;
window.exportPatientDetail = exportPatientDetail;
window.printPatientDetail = printPatientDetail;
window.syncData = syncData;
window.confirmClose = confirmClose;
window.toggleFilterPanel = toggleFilterPanel;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.showView = showView;
window.hideToast = hideToast;