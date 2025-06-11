// main.js - CORRECTED VERSION
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
        
        // Load initial data
        console.log('📊 Loading initial patient data...');
        await loadPatients();
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('✅ Application initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showError('Gagal menginisialisasi aplikasi: ' + error.message);
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

// Display patients in table
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

// Create patient row
function createPatientRow(patient) {
    const row = document.createElement('div');
    row.className = 'table-row';
    
    // Format date
    const prescriptionDate = patient.prescription_date ? 
        new Date(patient.prescription_date).toLocaleDateString('id-ID') : '-';
    
    // Format gender
    const gender = patient.gender === 'L' ? 'Laki-laki' : 
                   patient.gender === 'P' ? 'Perempuan' : '-';
    
    // Format compliance percentage
    const compliance = Math.round(patient.compliance_percentage || 0);
    const complianceClass = compliance >= 80 ? 'high' : 
                           compliance >= 50 ? 'medium' : 'low';
    
    row.innerHTML = `
        <span>${prescriptionDate}</span>
        <span>${patient.rm_number || '-'}</span>
        <span>${patient.name || '-'}</span>
        <span>${gender}</span>
        <span class="compliance ${complianceClass}">${compliance}%</span>
        <span>${patient.medicine_name || 'Tidak ada obat'}</span>
        <span class="status ${complianceClass}">
            ${compliance >= 80 ? 'Baik' : compliance >= 50 ? 'Sedang' : 'Rendah'}
        </span>
        <span class="actions">
            <button class="detail-btn" onclick="showPatientDetail(${patient.id})" title="Lihat Detail">
                👁️
            </button>
            <button class="edit-btn" onclick="editPatient(${patient.id})" title="Edit">
                ✏️
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
    
    // Refresh button
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            currentPage = 1;
            currentSearch = '';
            if (searchInput) searchInput.value = '';
            loadPatients();
        });
    }
    
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

// Patient detail functions (placeholder)
function showPatientDetail(patientId) {
    console.log('👁️ Show patient detail:', patientId);
    alert(`Menampilkan detail pasien ID: ${patientId}\nFitur dalam pengembangan.`);
}

function editPatient(patientId) {
    console.log('✏️ Edit patient:', patientId);
    alert(`Edit pasien ID: ${patientId}\nFitur dalam pengembangan.`);
}

// View management
function showView(viewName) {
    console.log('🖥️ Switching to view:', viewName);
    
    // Hide all views
    const views = document.querySelectorAll('[id$="-view"]');
    views.forEach(view => {
        view.style.display = 'none';
    });
    
    // Show selected view
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
        targetView.style.display = 'block';
        
        // Load data for specific views
        if (viewName === 'kepatuhan') {
            loadPatients();
        }
    }
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
window.loadPatients = loadPatients;
window.searchPatients = searchPatients;
window.previousPage = previousPage;
window.nextPage = nextPage;
window.showPatientDetail = showPatientDetail;
window.editPatient = editPatient;
window.showView = showView;
window.hideToast = hideToast;