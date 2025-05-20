// src/services/AuthService.js - Dengan perbaikan integrasi Solana
class AuthService {
    constructor() {
        this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        this.tokenKey = 'auth_token'; // Kunci konsisten untuk token

        // Tambahkan event untuk notifikasi perubahan status auth
        this.authChangeListeners = [];

        // Catat waktu terakhir login berhasil
        this.lastSuccessfulLogin = null;

        // Catat status token masih valid atau tidak
        this.tokenValid = false;

        // Cek login saat konstruktor
        this.checkInitialAuth();
    }

    // Cek initial auth state saat aplikasi load
    async checkInitialAuth() {
        const token = this.getToken();
        if (token) {
            // Coba validasi token yang ada
            try {
                await this.validateToken();
            } catch (err) {
                console.error("Initial token validation failed:", err);
                // Hapus token kalau invalid
                if (err.status === 401 || err.status === 403) {
                    this.removeToken();
                }
            }
        }
    }

    // Get token from localStorage
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    // Set token in localStorage
    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
        this.tokenValid = true;
        this.lastSuccessfulLogin = Date.now();

        // Notifikasi semua listeners
        this._notifyAuthChange(true);
    }

    // Remove token (logout)
    removeToken() {
        localStorage.removeItem(this.tokenKey);
        this.tokenValid = false;

        // Notifikasi semua listeners
        this._notifyAuthChange(false);
    }

    // Check if user is authenticated
    isAuthenticated() {
        const token = this.getToken();

        // Jika tidak ada token, jelas tidak terotentikasi
        if (!token) {
            return false;
        }

        // Jika token ada, periksa jika kita tahu token ini valid
        if (this.tokenValid) {
            return true;
        }

        // Jika ragu tentang validitas, coba refresh jika perlu
        this.refreshTokenIfNeeded();

        // Untuk sementara, anggap valid sampai dibuktikan sebaliknya
        return !!token;
    }

    // Validasi token secara asinkron
    async validateToken() {
        const token = this.getToken();
        if (!token) {
            this.tokenValid = false;
            return false;
        }

        try {
            // Gunakan timeout untuk mencegah operasi yang menggantung
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`${this.baseUrl}/auth/validate`, {
                headers: {
                    'x-auth-token': token
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = new Error('Token validation failed');
                error.status = response.status;
                throw error;
            }

            // Jika response OK, token valid
            this.tokenValid = true;
            return true;
        } catch (error) {
            console.error('Token validation error:', error);

            // Jika error 401/403, token tidak valid
            if (error.status === 401 || error.status === 403) {
                this.removeToken();
                this.tokenValid = false;
                return false;
            }

            // Jika timeout atau error jaringan, anggap token masih valid untuk sementara
            if (error.name === 'AbortError') {
                console.log('Token validation timed out, assuming valid');
                return true;
            }

            // Error lain, anggap masih valid untuk menghindari logout yang tidak perlu
            return true;
        }
    }

    // Tambahkan event listener untuk perubahan status auth
    onAuthChange(callback) {
        if (typeof callback === 'function') {
            this.authChangeListeners.push(callback);
            return true;
        }
        return false;
    }

    // Hapus event listener
    removeAuthChangeListener(callback) {
        this.authChangeListeners = this.authChangeListeners.filter(cb => cb !== callback);
    }

    // Panggil semua listeners
    _notifyAuthChange(isAuthenticated) {
        this.authChangeListeners.forEach(callback => {
            try {
                callback(isAuthenticated);
            } catch (error) {
                console.error('Error in auth change listener:', error);
            }
        });
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