console.log('🔗 API.js loaded');

// Simple API client dengan error handling yang baik
class APIClient {
    constructor() {
        this.baseURL = window.location.origin;
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}/api/v1${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            },
            ...options
        };

        console.log('🔍 API Request:', url, config);

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await fetch(url, config);
                
                console.log('📡 API Response:', response.status, response.statusText);
                
                // Handle different response types
                const contentType = response.headers.get('content-type');
                let data;
                
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    console.warn('⚠️ Non-JSON response:', text);
                    throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
                }
                
                if (!response.ok) {
                    throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
                }

                console.log('✅ API Data received:', data);
                return data;

            } catch (error) {
                console.error(`❌ API Error (attempt ${attempt}):`, error);
                
                if (attempt === this.maxRetries) {
                    throw error;
                }

                await this.delay(this.retryDelay * attempt);
            }
        }
    }

    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create global API instance
const api = new APIClient();

// Patient API functions yang sesuai dengan backend
const PatientAPI = {
    async getPatients(params = {}) {
        console.log('🔍 PatientAPI.getPatients called with:', params);
        try {
            const response = await api.get('/patients', params);
            console.log('✅ PatientAPI.getPatients response:', response);
            return response;
        } catch (error) {
            console.error('❌ PatientAPI.getPatients error:', error);
            throw error;
        }
    },

    async getPatient(id) {
        console.log('🔍 PatientAPI.getPatient called with id:', id);
        return api.get(`/patients/${id}`);
    },

    async createPatient(data) {
        console.log('🔍 PatientAPI.createPatient called with:', data);
        return api.post('/patients', data);
    },

    async updatePatient(id, data) {
        console.log('🔍 PatientAPI.updatePatient called with:', id, data);
        return api.put(`/patients/${id}`, data);
    },

    async deletePatient(id) {
        console.log('🔍 PatientAPI.deletePatient called with id:', id);
        return api.delete(`/patients/${id}`);
    }
};

// Health check function
const HealthAPI = {
    async checkHealth() {
        console.log('🏥 Checking API health...');
        try {
            const response = await api.get('/health');
            console.log('✅ Health check successful:', response);
            return response;
        } catch (error) {
            console.error('❌ Health check failed:', error);
            throw error;
        }
    },

    async testConnection() {
        console.log('🧪 Testing connection...');
        try {
            const response = await fetch(`${api.baseURL}/test`);
            const data = await response.json();
            console.log('✅ Connection test successful:', data);
            return data;
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            throw error;
        }
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.api = api;
    window.PatientAPI = PatientAPI;
    window.HealthAPI = HealthAPI;
}

// Auto health check on load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🏥 Performing initial health check...');
        await HealthAPI.checkHealth();
        console.log('✅ API is healthy and ready');
    } catch (error) {
        console.warn('⚠️ API health check failed on startup:', error.message);
        // Don't block the app if health check fails
    }
});