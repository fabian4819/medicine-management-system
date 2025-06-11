// api.js - CORRECTED VERSION that matches the backend
console.log('🔗 API.js loaded');

// Simple API client
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
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create global API instance
const api = new APIClient();

// Patient API functions that work with our backend
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
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.api = api;
    window.PatientAPI = PatientAPI;
}