// src/services/AuthService.js - ENHANCED WITH RAILWAY INTEGRATION
class AuthService {
    constructor() {
        // ✅ ENHANCED: Use same URL logic as ApiService
        this.baseUrl = this.determineBaseUrl();
        this.tokenKey = 'auth_token';

        console.log('🔐 AuthService Configuration:');
        console.log('   Base URL:', this.baseUrl);
        console.log('   Environment:', process.env.NODE_ENV);

        this.authChangeListeners = [];
        this.lastSuccessfulLogin = null;
        this.tokenValid = false;

        // ✅ NEW: Connection status tracking
        this.connectionStatus = {
            isConnected: true,
            lastError: null,
            lastCheck: null
        };

        // Auto-check auth on startup
        this.checkInitialAuth();
    }

    // ✅ ENHANCED: Smart URL determination (same as ApiService)
    determineBaseUrl() {
        // Priority 1: Environment variable
        if (process.env.REACT_APP_API_URL) {
            const url = process.env.REACT_APP_API_URL;
            console.log('🎯 AuthService using REACT_APP_API_URL:', url);
            return url;
        }

        // Priority 2: Auto-detect based on current domain
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;

            // If on Vercel production
            if (hostname.includes('vercel.app') ||
                hostname.includes('tugasakhir-mintix') ||
                hostname.includes('mintix')) {
                const railwayUrl = 'https://tugasakhir-mintix-production.up.railway.app/api';
                console.log('🚀 AuthService detected Vercel, using Railway:', railwayUrl);
                return railwayUrl;
            }

            // If on localhost
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                const localUrl = 'http://localhost:5000/api';
                console.log('🏠 AuthService detected localhost:', localUrl);
                return localUrl;
            }
        }

        // Priority 3: Environment fallback
        const fallbackUrl = process.env.NODE_ENV === 'production'
            ? 'https://tugasakhir-mintix-production.up.railway.app/api'
            : 'http://localhost:5000/api';

        console.log('⚠️ AuthService using fallback URL:', fallbackUrl);
        return fallbackUrl;
    }

    // ✅ ENHANCED: Better initial auth check
    async checkInitialAuth() {
        const token = this.getToken();
        if (token) {
            try {
                console.log('🔍 Checking initial auth status...');
                const isValid = await this.validateToken();
                if (!isValid) {
                    console.log('❌ Initial token invalid, clearing...');
                    this.removeToken();
                } else {
                    console.log('✅ Initial token is valid');
                }
            } catch (err) {
                console.error("Initial token validation failed:", err);
                if (err.status === 401 || err.status === 403) {
                    this.removeToken();
                }
            }
        }
    }

    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
        this.tokenValid = true;
        this.lastSuccessfulLogin = Date.now();
        this._notifyAuthChange(true);

        console.log('✅ Token saved successfully');
    }

    removeToken() {
        localStorage.removeItem(this.tokenKey);
        this.tokenValid = false;
        this._notifyAuthChange(false);

        console.log('🗑️ Token removed');
    }

    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;

        // If we know the token is valid, return true
        if (this.tokenValid) return true;

        // Schedule async validation but return true for now
        this.validateToken().catch(() => { });
        return !!token;
    }

    // ✅ ENHANCED: Better token validation with Railway retry
    async validateToken() {
        const token = this.getToken();
        if (!token) {
            this.tokenValid = false;
            return false;
        }

        // ✅ NEW: Add retry logic for Railway
        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount <= maxRetries) {
            try {
                console.log(`🔍 Validating token (attempt ${retryCount + 1}/${maxRetries + 1})...`);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout for Railway

                const response = await fetch(`${this.baseUrl}/auth/validate`, {
                    headers: {
                        'x-auth-token': token,
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    console.log(`❌ Token validation failed: ${response.status}`);

                    if (response.status === 401 || response.status === 403) {
                        this.removeToken();
                        this.tokenValid = false;
                        this.connectionStatus.lastError = 'Authentication failed';
                        return false;
                    }

                    throw new Error(`Validation failed: ${response.status}`);
                }

                const data = await response.json();
                console.log('✅ Token validation successful');

                this.tokenValid = true;
                this.connectionStatus.isConnected = true;
                this.connectionStatus.lastError = null;
                this.connectionStatus.lastCheck = Date.now();
                return true;

            } catch (error) {
                retryCount++;
                console.error(`Token validation error (attempt ${retryCount}):`, error.message);

                if (error.name === 'AbortError') {
                    console.log('⏰ Token validation timed out');

                    // ✅ NEW: Retry on timeout for Railway
                    if (retryCount <= maxRetries) {
                        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
                        console.log(`🔄 Retrying validation in ${backoffDelay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, backoffDelay));
                        continue;
                    }

                    // If all retries failed, assume valid to avoid logout
                    console.log('⚠️ Validation timeout after retries, assuming token valid');
                    return true;
                }

                if (error.message?.includes('Failed to fetch')) {
                    console.log('🌐 Network error during validation');
                    this.connectionStatus.isConnected = false;
                    this.connectionStatus.lastError = 'Network error';

                    // ✅ NEW: Retry on network error
                    if (retryCount <= maxRetries) {
                        const backoffDelay = Math.min(2000 * retryCount, 8000);
                        console.log(`🔄 Retrying network request in ${backoffDelay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, backoffDelay));
                        continue;
                    }

                    // Assume valid on network error to avoid unnecessary logout
                    console.log('⚠️ Network error after retries, assuming token valid');
                    return true;
                }

                // ✅ NEW: Don't retry on 4xx errors (except timeouts)
                if (error.status >= 400 && error.status < 500) {
                    this.connectionStatus.lastError = `Client error: ${error.status}`;
                    return false;
                }

                // ✅ NEW: Retry on 5xx errors
                if (error.status >= 500 && retryCount <= maxRetries) {
                    const backoffDelay = Math.min(1500 * retryCount, 6000);
                    console.log(`🔄 Retrying server error in ${backoffDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                    continue;
                }

                // Final fallback
                console.log('⚠️ Validation failed after retries, assuming token invalid');
                return false;
            }
        }

        return false;
    }

    // ✅ ENHANCED: Better login test with Railway retry
    async loginTest(identifier) {
        try {
            console.log('🧪 Attempting test login with:', identifier);

            // ✅ NEW: Add retry logic
            const maxRetries = 3;
            let retryCount = 0;

            while (retryCount <= maxRetries) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 20000); // Longer timeout for Railway

                    // Prepare payload - support both email and wallet address
                    const payload = {};
                    if (identifier.includes('@')) {
                        payload.email = identifier;
                    } else {
                        payload.walletAddress = identifier;
                    }

                    console.log(`📤 Sending login payload (attempt ${retryCount + 1}):`, payload);

                    const response = await fetch(`${this.baseUrl}/auth/login-test`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    console.log(`📥 Login response status: ${response.status}`);

                    if (!response.ok) {
                        let errorMsg = `Login failed with status ${response.status}`;

                        try {
                            const errorData = await response.json();
                            errorMsg = errorData.msg || errorMsg;
                            console.error('❌ Login error response:', errorData);
                        } catch (parseErr) {
                            console.error('❌ Could not parse error response');
                        }

                        // ✅ NEW: Retry on server errors
                        if (response.status >= 500 && retryCount < maxRetries) {
                            retryCount++;
                            const backoffDelay = Math.min(1500 * retryCount, 5000);
                            console.log(`🔄 Retrying login in ${backoffDelay}ms...`);
                            await new Promise(resolve => setTimeout(resolve, backoffDelay));
                            continue;
                        }

                        throw new Error(errorMsg);
                    }

                    const data = await response.json();
                    console.log('✅ Login successful');

                    if (data.token) {
                        this.setToken(data.token);

                        // Store user info
                        if (data.user?.walletAddress) {
                            localStorage.setItem('wallet_address', data.user.walletAddress);
                        } else {
                            localStorage.setItem('wallet_address', identifier);
                        }

                        // ✅ NEW: Update connection status
                        this.connectionStatus.isConnected = true;
                        this.connectionStatus.lastError = null;

                        return true;
                    } else {
                        throw new Error('No token received from server');
                    }

                } catch (error) {
                    retryCount++;
                    console.error(`❌ Login error (attempt ${retryCount}):`, error.message);

                    if (error.name === 'AbortError') {
                        console.error('⏰ Login request timed out');

                        // Retry on timeout
                        if (retryCount <= maxRetries) {
                            const backoffDelay = Math.min(2000 * retryCount, 8000);
                            console.log(`🔄 Retrying login after timeout in ${backoffDelay}ms...`);
                            await new Promise(resolve => setTimeout(resolve, backoffDelay));
                            continue;
                        }
                    }

                    if (error.message?.includes('Failed to fetch')) {
                        console.error('🌐 Network error during login');
                        this.connectionStatus.isConnected = false;
                        this.connectionStatus.lastError = 'Network error';

                        // Retry on network error
                        if (retryCount <= maxRetries) {
                            const backoffDelay = Math.min(3000 * retryCount, 10000);
                            console.log(`🔄 Retrying network request in ${backoffDelay}ms...`);
                            await new Promise(resolve => setTimeout(resolve, backoffDelay));
                            continue;
                        }
                    }

                    // Don't retry on client errors
                    if (error.status >= 400 && error.status < 500) {
                        this.connectionStatus.lastError = `Login failed: ${error.message}`;
                        return false;
                    }

                    // Final attempt failed
                    if (retryCount > maxRetries) {
                        this.connectionStatus.lastError = `Login failed after ${maxRetries} retries`;
                        return false;
                    }
                }
            }

            return false;
        } catch (error) {
            console.error('❌ Critical login error:', error);
            this.connectionStatus.lastError = error.message;
            return false;
        }
    }

    // ✅ ENHANCED: Better admin check with Railway retry
    async checkAdminStatus() {
        try {
            const token = this.getToken();
            if (!token) {
                console.log('❌ No token available for admin check');
                return { isAdmin: false };
            }

            // ✅ NEW: Add retry logic
            const maxRetries = 3;
            let retryCount = 0;

            while (retryCount <= maxRetries) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000);

                    const response = await fetch(`${this.baseUrl}/auth/admin-check`, {
                        headers: {
                            'x-auth-token': token,
                            'Content-Type': 'application/json'
                        },
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        console.log(`❌ Admin check failed: ${response.status}`);

                        if (response.status === 401) {
                            this.removeToken();
                            this.tokenValid = false;
                        }

                        // ✅ NEW: Retry on server errors
                        if (response.status >= 500 && retryCount < maxRetries) {
                            retryCount++;
                            const backoffDelay = Math.min(1000 * retryCount, 4000);
                            console.log(`🔄 Retrying admin check in ${backoffDelay}ms...`);
                            await new Promise(resolve => setTimeout(resolve, backoffDelay));
                            continue;
                        }

                        return { isAdmin: false };
                    }

                    const data = await response.json();
                    console.log('✅ Admin check successful:', data);

                    this.tokenValid = true;
                    this.connectionStatus.isConnected = true;
                    this.connectionStatus.lastError = null;

                    return { isAdmin: !!data.isAdmin };

                } catch (error) {
                    retryCount++;
                    console.error(`❌ Admin check error (attempt ${retryCount}):`, error.message);

                    if (error.name === 'AbortError') {
                        console.log('⏰ Admin check timeout');

                        if (retryCount <= maxRetries) {
                            const backoffDelay = Math.min(1500 * retryCount, 5000);
                            await new Promise(resolve => setTimeout(resolve, backoffDelay));
                            continue;
                        }
                    }

                    if (retryCount > maxRetries) {
                        this.connectionStatus.lastError = 'Admin check failed after retries';
                        return { isAdmin: false };
                    }
                }
            }

            return { isAdmin: false };
        } catch (error) {
            console.error('❌ Critical admin check error:', error);
            this.connectionStatus.lastError = error.message;
            return { isAdmin: false };
        }
    }

    async isAdmin() {
        try {
            const { isAdmin } = await this.checkAdminStatus();
            return isAdmin;
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    getWalletAddress() {
        return localStorage.getItem('wallet_address');
    }

    logout() {
        console.log('👋 Logging out...');
        this.removeToken();
        localStorage.removeItem('wallet_address');
        localStorage.removeItem('myTickets');

        // Clear other caches
        try {
            if (window.ApiService?.clearCache) {
                window.ApiService.clearCache();
            }
        } catch (e) {
            console.error('Error clearing API cache during logout:', e);
        }
    }

    // Event listener management
    onAuthChange(callback) {
        if (typeof callback === 'function') {
            this.authChangeListeners.push(callback);
            return true;
        }
        return false;
    }

    removeAuthChangeListener(callback) {
        this.authChangeListeners = this.authChangeListeners.filter(cb => cb !== callback);
    }

    _notifyAuthChange(isAuthenticated) {
        this.authChangeListeners.forEach(callback => {
            try {
                callback(isAuthenticated);
            } catch (error) {
                console.error('Error in auth change listener:', error);
            }
        });
    }

    // ✅ NEW: Connection test method
    async testConnection() {
        try {
            console.log('🧪 Testing auth service connection...');
            const startTime = Date.now();

            const response = await fetch(`${this.baseUrl}/auth/nonce`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            const responseTime = Date.now() - startTime;

            if (response.ok) {
                console.log(`✅ Auth service connection successful (${responseTime}ms)`);
                this.connectionStatus.isConnected = true;
                this.connectionStatus.lastError = null;
                return { success: true, responseTime };
            } else {
                console.log('❌ Auth service connection failed:', response.status);
                this.connectionStatus.isConnected = false;
                this.connectionStatus.lastError = `HTTP ${response.status}`;
                return { success: false, error: `HTTP ${response.status}` };
            }
        } catch (error) {
            console.error('❌ Auth service connection error:', error);
            this.connectionStatus.isConnected = false;
            this.connectionStatus.lastError = error.message;
            return { success: false, error: error.message };
        }
    }

    // ✅ NEW: Get connection status
    getConnectionStatus() {
        return {
            ...this.connectionStatus,
            lastCheck: this.connectionStatus.lastCheck ?
                new Date(this.connectionStatus.lastCheck).toISOString() : null
        };
    }

    // ✅ NEW: Debug info
    getDebugInfo() {
        return {
            baseUrl: this.baseUrl,
            hasToken: !!this.getToken(),
            tokenValid: this.tokenValid,
            lastSuccessfulLogin: this.lastSuccessfulLogin ?
                new Date(this.lastSuccessfulLogin).toISOString() : null,
            walletAddress: this.getWalletAddress(),
            connectionStatus: this.getConnectionStatus(),
            listenerCount: this.authChangeListeners.length
        };
    }

    // Login dengan test endpoint - untuk pengembangan
    async loginTest(walletAddress) {
        try {
            console.log('Attempting test login with wallet:', walletAddress);

            // Set timeout untuk mencegah operasi yang menggantung
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            // Dapatkan nonce untuk autentikasi
            let nonce;
            try {
                const nonceResponse = await fetch(`${this.baseUrl}/auth/nonce`, {
                    signal: controller.signal
                });

                if (!nonceResponse.ok) {
                    throw new Error(`Failed to get nonce: ${nonceResponse.status}`);
                }

                const nonceData = await nonceResponse.json();
                nonce = nonceData.nonce;
            } catch (nonceError) {
                console.error("Error getting nonce:", nonceError);
                // Fallback jika nonce gagal
                nonce = Math.random().toString(36).substring(2);
            }

            // Buat request login
            const response = await fetch(`${this.baseUrl}/auth/login-test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    wallet_address: walletAddress,
                    nonce
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Periksa content-type dan status response
            const contentType = response.headers.get('content-type');
            if (!response.ok) {
                let errorMsg = `Login failed with status ${response.status}`;

                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMsg = errorData.msg || errorMsg;
                } else {
                    // Jika bukan JSON, ambil teks sebagai error
                    const errorText = await response.text();
                    console.error("Login response not JSON:", errorText);
                }

                throw new Error(errorMsg);
            }

            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server did not return JSON response');
            }

            const data = await response.json();
            console.log('Login successful, token received');

            // Simpan token - ini akan memanggil _notifyAuthChange
            if (data.token) {
                this.setToken(data.token);

                // Simpan informasi wallet
                if (data.user && data.user.walletAddress) {
                    localStorage.setItem('wallet_address', data.user.walletAddress);
                } else {
                    localStorage.setItem('wallet_address', walletAddress);
                }

                return true;
            } else {
                throw new Error('No token received from server');
            }
        } catch (error) {
            console.error('Login test error:', error);

            // Handle timeout khusus
            if (error.name === 'AbortError') {
                console.error('Login request timed out');
            }

            return false;
        }
    }

    // Login dengan wallet sebenarnya
    async loginWithWallet(wallet) {
        if (!wallet || !wallet.publicKey) {
            throw new Error('Wallet not connected');
        }

        try {
            const walletAddress = wallet.publicKey.toString();
            console.log('Attempting login with wallet:', walletAddress);

            // Set timeout untuk request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            try {
                // Get nonce from server
                const nonceResponse = await fetch(`${this.baseUrl}/auth/nonce`, {
                    signal: controller.signal
                });

                if (!nonceResponse.ok) {
                    throw new Error(`Failed to get nonce: ${nonceResponse.status}`);
                }

                const { nonce } = await nonceResponse.json();

                // Buat pesan dan sign
                const message = `Sign this message to authenticate with Concert NFT Tickets: ${nonce}`;
                const messageBuffer = new TextEncoder().encode(message);

                let signature;
                try {
                    // Sign message with wallet
                    signature = await wallet.signMessage(messageBuffer);
                } catch (signError) {
                    console.error('Error signing message:', signError);
                    throw new Error('Failed to sign message with wallet. Please try again.');
                }

                // Convert signature to base58 or hex
                let signatureStr;
                if (typeof signature === 'string') {
                    signatureStr = signature;
                } else if (signature instanceof Uint8Array) {
                    signatureStr = Buffer.from(signature).toString('base64');
                } else {
                    signatureStr = JSON.stringify(signature);
                }

                // Send login request with signature
                const loginResponse = await fetch(`${this.baseUrl}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        wallet_address: walletAddress,
                        signature: signatureStr,
                        message,
                        nonce
                    }),
                    signal: controller.signal
                });

                if (!loginResponse.ok) {
                    const errorData = await loginResponse.json().catch(() => ({}));
                    throw new Error(errorData.msg || `Login failed: ${loginResponse.status}`);
                }

                const loginData = await loginResponse.json();

                if (!loginData.token) {
                    throw new Error('No token received from server');
                }

                // Store token dan informasi wallet
                this.setToken(loginData.token);
                localStorage.setItem('wallet_address', walletAddress);

                return true;
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (error) {
            console.error('Login with wallet error:', error);

            if (error.name === 'AbortError') {
                throw new Error('Login request timed out. Try again later.');
            }

            throw error;
        }
    }

    // Mendapatkan alamat wallet yang disimpan
    getWalletAddress() {
        return localStorage.getItem('wallet_address');
    }

    // Logout dari aplikasi
    logout() {
        this.removeToken();
        localStorage.removeItem('wallet_address');
        localStorage.removeItem('myTickets');
        // Hapus cache lain yang mungkin disimpan
        try {
            // Bersihkan cache dari ApiService
            if (window.ApiService && typeof window.ApiService.clearCache === 'function') {
                window.ApiService.clearCache();
            }
        } catch (e) {
            console.error('Error clearing API cache during logout:', e);
        }
    }

    // Refresh token jika mendekati expired
    async refreshTokenIfNeeded() {
        const token = this.getToken();
        if (!token) return false;

        const lastLogin = this.lastSuccessfulLogin;
        const now = Date.now();

        // Jika token kita sudah 20+ jam (dari 24 jam), coba refresh
        // Ini berasumsi token expired dalam 24 jam
        if (lastLogin && now - lastLogin < 20 * 60 * 60 * 1000) {
            // Token masih cukup baru, tidak perlu refresh
            return true;
        }

        console.log("Token approaching expiry, attempting refresh...");

        // Coba refresh dengan loginTest - tidak mengganggu pengalaman pengguna
        const walletAddress = this.getWalletAddress();
        if (walletAddress) {
            const refreshSuccess = await this.loginTest(walletAddress);
            if (refreshSuccess) {
                console.log("Token refreshed successfully");
                return true;
            } else {
                console.log("Token refresh failed, session may expire soon");
                return false;
            }
        }

        return false;
    }

    // Cek apakah user adalah admin
    async isAdmin() {
        try {
            const { isAdmin } = await this.checkAdminStatus();
            return isAdmin;
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    // Cek status admin
    async checkAdminStatus() {
        try {
            const token = this.getToken();

            if (!token) {
                console.log('No token available for admin check');
                return { isAdmin: false };
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            try {
                const response = await fetch(`${this.baseUrl}/auth/admin-check`, {
                    headers: {
                        'x-auth-token': token
                    },
                    signal: controller.signal
                });

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        // Token tidak valid lagi
                        this.tokenValid = false;

                        // Jika 401 (unauthenticated), hapus token
                        if (response.status === 401) {
                            this.removeToken();
                        }
                    }

                    return { isAdmin: false };
                }

                const data = await response.json();

                // Jika berhasil mendapat response, tandai token sebagai valid
                this.tokenValid = true;

                return { isAdmin: !!data.isAdmin };
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (error) {
            console.error('Admin check error:', error);

            // Jika error adalah abort (timeout), jangan invalidate token
            if (error.name === 'AbortError') {
                console.log('Admin check timeout');
            }

            return { isAdmin: false };
        }
    }
}

export default new AuthService();