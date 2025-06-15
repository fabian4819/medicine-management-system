// API Client untuk komunikasi dengan backend
console.log('🔗 API Client loaded');

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
                ...options.headers
            },
            ...options
        };

        console.log('🔍 API Request:', url, config);

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await fetch(url, config);
                
                console.log('📡 API Response:', response.status, response.statusText);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
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

// Patient API functions
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
    async check() {
        try {
            const response = await api.request('/health', { method: 'GET' });
            return response;
        } catch (error) {
            console.error('❌ Health check failed:', error);
            throw error;
        }
    }
};

// Create global API instance
const api = new APIClient();

// Export for use in other files
if (typeof window !== 'undefined') {
    window.api = api;
    window.PatientAPI = PatientAPI;
    window.HealthAPI = HealthAPI;
}