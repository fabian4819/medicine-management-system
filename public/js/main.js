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

// Show Patient Detail Modal (modal detail seperti di gambar)
async function showPatientDetail(patientId) {
    try {
        console.log('👁️ Show patient detail:', patientId);
        
        const modal = document.getElementById('patientDetailModal');
        if (modal) {
            modal.classList.add('active');
            
            // Load patient detail
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

// Load patient detail
async function loadPatientDetail(patientId) {
    try {
        console.log('📋 Loading patient detail for ID:', patientId);
        
        const response = await PatientAPI.getPatient(patientId);
        
        if (response && response.success && response.data) {
            const patient = response.data;
            
            // Update modal content
            document.getElementById('modalPatientName').textContent = patient.name || '-';
            document.getElementById('modalCompliance').textContent = Math.round(patient.compliance_percentage || 0) + '%';
            document.getElementById('modalRMNumber').textContent = patient.rm_number || '-';
            document.getElementById('modalDuration').textContent = '5 Hari'; // Mock data
            
            // Load consumption history (mock data for now)
            displayConsumptionHistory([
                {
                    date: '11-03-2025',
                    day: 1,
                    medicine: 'Paracetamol',
                    time: '07.00',
                    status: 'Diminum',
                    notes: '-'
                }
            ]);
            
        } else {
            throw new Error('Data pasien tidak ditemukan');
        }
        
    } catch (error) {
        console.error('❌ Error loading patient detail:', error);
        showError('Gagal memuat detail pasien: ' + error.message);
    }
}

// Display consumption history in modal
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
        
        row.innerHTML = `
            <span>${item.date}</span>
            <span>${item.day}</span>
            <span>${item.medicine}</span>
            <span>${item.time}</span>
            <span class="status-${item.status.toLowerCase() === 'diminum' ? 'diminum' : 'belum'}">${item.status}</span>
            <span>${item.notes}</span>
        `;
        
        tableBody.appendChild(row);
    });
}

// Display patients in table (sesuai dengan design mockup)
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

// Create patient row (sesuai dengan kolom di mockup)
function createPatientRow(patient) {
    const row = document.createElement('div');
    row.className = 'table-row';
    
    // Format date
    const prescriptionDate = patient.prescription_date ? 
        new Date(patient.prescription_date).toLocaleDateString('id-ID') : 
        '11-03-2025'; // Mock date sesuai mockup
    
    // Format compliance percentage
    const compliance = Math.round(patient.compliance_percentage || 70); // Default 70% sesuai mockup
    const complianceClass = compliance >= 80 ? 'high' : 
                           compliance >= 50 ? 'medium' : 'low';
    
    // Mock data untuk kolom yang belum ada
    const medicineName = patient.medicine_name || 'paracetamol';
    const previousConsumption = '-'; // Sesuai mockup
    
    row.innerHTML = `
        <span>${prescriptionDate}</span>
        <span>${patient.rm_number || '008919'}</span>
        <span>${patient.name || 'Amirul Azmi'}</span>
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

// Export functions (placeholder)
function exportToExcel() {
    console.log('📊 Export to Excel');
    showSuccess('Export Excel akan segera tersedia');
}

function exportToPDF() {
    console.log('📄 Export to PDF');
    closeKepatuhanModal();
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
window.showView = showView;
window.hideToast = hideToast;