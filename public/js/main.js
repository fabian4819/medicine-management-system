// Utility functions for the application
console.log('🔧 Utils loaded');

// Date formatting functions
function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatTime(timeString) {
    if (!timeString) return '-';
    
    const date = new Date(timeString);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// String formatting functions
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatCurrency(amount) {
    if (!amount) return 'Rp 0';
    
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

function validateRequired(value) {
    return value !== null && value !== undefined && value.toString().trim() !== '';
}

// Compliance badge helper
function getComplianceBadge(percentage) {
    const percent = parseInt(percentage) || 0;
    let className = 'compliance-badge ';
    
    if (percent >= 80) {
        className += 'compliance-high';
    } else if (percent >= 50) {
        className += 'compliance-medium';
    } else {
        className += 'compliance-low';
    }
    
    return `<span class="${className}">${percent}%</span>`;
}

// Gender formatting
function formatGender(gender) {
    if (gender === 'L' || gender === 'Laki-Laki') return 'Laki-laki';
    if (gender === 'P' || gender === 'Perempuan') return 'Perempuan';
    return '-';
}

// Debounce function
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

// Local storage helpers
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

function getFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return defaultValue;
    }
}

function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing from localStorage:', error);
        return false;
    }
}

// Export utility functions to global scope
if (typeof window !== 'undefined') {
    window.formatDate = formatDate;
    window.formatTime = formatTime;
    window.formatDateTime = formatDateTime;
    window.capitalizeFirst = capitalizeFirst;
    window.formatCurrency = formatCurrency;
    window.validateEmail = validateEmail;
    window.validatePhone = validatePhone;
    window.validateRequired = validateRequired;
    window.getComplianceBadge = getComplianceBadge;
    window.formatGender = formatGender;
    window.debounce = debounce;
    window.saveToStorage = saveToStorage;
    window.getFromStorage = getFromStorage;
    window.removeFromStorage = removeFromStorage;
}