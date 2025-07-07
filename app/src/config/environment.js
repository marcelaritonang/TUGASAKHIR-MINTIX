// app/src/config/environment.js - CENTRALIZED CONFIG UNTUK STRUKTUR ANDA

class EnvironmentConfig {
    constructor() {
        this.initializeConfig();
    }

    initializeConfig() {
        // ✅ Environment detection
        this.environment = this.detectEnvironment();
        this.API_BASE_URL = this.getApiUrl();
        this.WS_BASE_URL = this.getWsUrl();

        // Debug logging (hanya jika debug enabled)
        if (this.isDebugMode()) {
            console.group('🌍 Environment Configuration');
            console.log('🔧 Environment:', this.environment);
            console.log('🔗 API_BASE_URL:', this.API_BASE_URL);
            console.log('🔗 WS_BASE_URL:', this.WS_BASE_URL);
            console.log('🌐 Hostname:', window.location.hostname);
            console.log('📦 NODE_ENV:', process.env.NODE_ENV);
            console.log('🎯 REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
            console.log('🎯 REACT_APP_DEBUG:', process.env.REACT_APP_DEBUG);
            console.groupEnd();
        }

        // Test connection saat startup (hanya di development)
        if (this.environment === 'development') {
            this.testConnection().then(result => {
                if (result.success) {
                    console.log('✅ API connection verified');
                } else {
                    console.warn('⚠️ API connection issue:', result.error);
                }
            });
        }
    }

    detectEnvironment() {
        // Priority 1: NODE_ENV
        if (process.env.NODE_ENV === 'production') return 'production';
        if (process.env.NODE_ENV === 'development') return 'development';

        // Priority 2: Hostname detection
        const hostname = window.location.hostname;
        if (hostname.includes('vercel.app') || hostname.includes('netlify.app')) {
            return 'production';
        }
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'development';
        }

        // Fallback
        return 'production';
    }

    getApiUrl() {
        // ✅ GUNAKAN environment variables yang sudah ada
        if (process.env.REACT_APP_API_URL) {
            return process.env.REACT_APP_API_URL;
        }

        // Fallback detection (jika env vars tidak ada)
        if (this.environment === 'development') {
            return 'http://localhost:5000/api';
        } else {
            return 'https://tugasakhir-mintix-production.up.railway.app/api';
        }
    }

    getWsUrl() {
        // ✅ GUNAKAN environment variables yang sudah ada
        if (process.env.REACT_APP_WS_URL) {
            return process.env.REACT_APP_WS_URL;
        }

        // Fallback detection
        if (this.environment === 'development') {
            return 'ws://localhost:5000';
        } else {
            return 'wss://tugasakhir-mintix-production.up.railway.app';
        }
    }

    isDebugMode() {
        return process.env.REACT_APP_DEBUG === 'true' || this.environment === 'development';
    }

    // ✅ UNIVERSAL API CALL METHOD
    async makeApiCall(endpoint, options = {}) {
        const url = `${this.API_BASE_URL}${endpoint}`;

        // Default headers
        const defaultHeaders = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add auth token if available
        const token = localStorage.getItem('auth_token') || localStorage.getItem('admin_token');
        if (token) {
            defaultHeaders['x-auth-token'] = token;
        }

        // Handle FormData (untuk file uploads)
        const isFormData = options.body instanceof FormData;
        if (isFormData) {
            delete defaultHeaders['Content-Type']; // Let browser set it for FormData
        }

        const config = {
            method: 'GET',
            ...options,
            headers: defaultHeaders
        };

        if (this.isDebugMode()) {
            console.log(`🌐 ${config.method} ${url}`);
        }

        try {
            const response = await fetch(url, config);

            if (this.isDebugMode()) {
                console.log(`📡 Response: ${response.status} ${response.statusText}`);
            }

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.msg || errorData.message || errorMessage;
                } catch (e) {
                    // Response tidak bisa di-parse sebagai JSON
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            return { success: true, data, response };

        } catch (error) {
            console.error(`❌ API Error for ${endpoint}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // ✅ HEALTH CHECK
    async testConnection() {
        try {
            const healthUrl = `${this.API_BASE_URL.replace('/api', '')}/health`;
            const response = await fetch(healthUrl);

            if (response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                return { success: false, error: `Health check failed: ${response.status}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ✅ SPECIFIC API METHODS - Sesuai dengan backend routes Anda

    // === AUTH METHODS ===
    async login(wallet_address) {
        return this.makeApiCall('/auth/login-test', {
            method: 'POST',
            body: JSON.stringify({ wallet_address })
        });
    }

    async adminLogin(credentials) {
        return this.makeApiCall('/admin/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    // === CONCERT METHODS ===
    async getConcerts() {
        return this.makeApiCall('/concerts');
    }

    async getConcert(concertId) {
        return this.makeApiCall(`/concerts/${concertId}`);
    }

    async getPendingConcerts() {
        return this.makeApiCall('/admin/pending-concerts');
    }

    async getApprovedConcerts() {
        return this.makeApiCall('/admin/approved-concerts');
    }

    async getRejectedConcerts() {
        return this.makeApiCall('/admin/rejected-concerts');
    }

    async createConcert(formData) {
        return this.makeApiCall('/concerts', {
            method: 'POST',
            body: formData // FormData untuk file uploads
        });
    }

    async approveConcert(concertId) {
        return this.makeApiCall(`/admin/approve-concert/${concertId}`, {
            method: 'PUT'
        });
    }

    async rejectConcert(concertId, reason = '') {
        return this.makeApiCall(`/admin/reject-concert/${concertId}`, {
            method: 'PUT',
            body: JSON.stringify({ reason })
        });
    }

    // === TICKET METHODS ===
    async getTickets() {
        return this.makeApiCall('/tickets');
    }

    async getUserTickets() {
        return this.makeApiCall('/tickets/user');
    }

    async mintTicket(ticketData) {
        return this.makeApiCall('/tickets/mint', {
            method: 'POST',
            body: JSON.stringify(ticketData)
        });
    }

    async verifyTicket(ticketId) {
        return this.makeApiCall(`/tickets/verify/${ticketId}`);
    }

    // === ADMIN STATS ===
    async getConcertStats() {
        return this.makeApiCall('/admin/concert-stats');
    }

    async getSystemStats() {
        return this.makeApiCall('/admin/system-stats');
    }

    // === BLOCKCHAIN METHODS ===
    async getBlockchainInfo() {
        return this.makeApiCall('/blockchain/info');
    }

    async initializeBlockchain(walletAddress) {
        return this.makeApiCall('/blockchain/initialize', {
            method: 'POST',
            body: JSON.stringify({ walletAddress })
        });
    }
}

// ✅ SINGLETON INSTANCE
const environmentConfig = new EnvironmentConfig();

// ✅ SIMPLE API OBJECT untuk easy usage
export const API = {
    // Utility
    getApiUrl: () => environmentConfig.API_BASE_URL,
    getWsUrl: () => environmentConfig.WS_BASE_URL,
    getEnvironment: () => environmentConfig.environment,
    testConnection: () => environmentConfig.testConnection(),

    // Auth
    login: (wallet_address) => environmentConfig.login(wallet_address),
    adminLogin: (credentials) => environmentConfig.adminLogin(credentials),

    // Concerts
    getConcerts: () => environmentConfig.getConcerts(),
    getConcert: (id) => environmentConfig.getConcert(id),
    createConcert: (formData) => environmentConfig.createConcert(formData),

    // Admin - Concerts
    getPendingConcerts: () => environmentConfig.getPendingConcerts(),
    getApprovedConcerts: () => environmentConfig.getApprovedConcerts(),
    getRejectedConcerts: () => environmentConfig.getRejectedConcerts(),
    approveConcert: (id) => environmentConfig.approveConcert(id),
    rejectConcert: (id, reason) => environmentConfig.rejectConcert(id, reason),

    // Tickets
    getTickets: () => environmentConfig.getTickets(),
    getUserTickets: () => environmentConfig.getUserTickets(),
    mintTicket: (data) => environmentConfig.mintTicket(data),
    verifyTicket: (id) => environmentConfig.verifyTicket(id),

    // Stats
    getConcertStats: () => environmentConfig.getConcertStats(),
    getSystemStats: () => environmentConfig.getSystemStats(),

    // Blockchain
    getBlockchainInfo: () => environmentConfig.getBlockchainInfo(),
    initializeBlockchain: (address) => environmentConfig.initializeBlockchain(address)
};

// ✅ EXPORT URLs untuk backward compatibility
export const { API_BASE_URL, WS_BASE_URL } = environmentConfig;

// ✅ EXPORT default
export default environmentConfig;