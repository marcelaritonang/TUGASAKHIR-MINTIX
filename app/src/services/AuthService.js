// app/services/AuthService.js - Dengan integrasi Solana dan dukungan Auto-refresh
class AuthService {
    constructor() {
        this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        this.tokenKey = 'auth_token'; // Pastikan nama kunci konsisten

        // Tambahkan event untuk notifikasi perubahan status auth
        this.authChangeListeners = [];

        // Catat waktu terakhir login berhasil
        this.lastSuccessfulLogin = null;

        // Catat status token masih valid atau tidak
        this.tokenValid = false;
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

        // Jika kita tidak yakin, anggap valid sampai kita cek secara async
        this.validateToken(); // Non-blocking, async validation

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
            // Coba buat admin-check untuk validasi token
            const { isAdmin } = await this.checkAdminStatus();

            // Jika kita mendapatkan respons (bahkan jika bukan admin), token valid
            this.tokenValid = true;
            return true;
        } catch (error) {
            console.error('Token validation failed:', error);

            // Jika error 401/403, token tidak valid
            if (error.status === 401 || error.status === 403) {
                this.removeToken();
                this.tokenValid = false;
                return false;
            }

            // Jika error lain (misalnya koneksi), anggap masih valid
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

    // Login dengan test endpoint - DIPERBARUI dengan notifikasi
    async loginTest(walletAddress = '2upQ693dMu2PEdBp6JKnxRBWEimdbmbgNCvncbasP6TU') {
        try {
            console.log('Attempting test login with wallet:', walletAddress);

            const response = await fetch(`${this.baseUrl}/auth/login-test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ wallet_address: walletAddress })
            });

            // Periksa content-type sebelum mencoba parse JSON
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
            this.setToken(data.token);

            // Simpan informasi wallet
            if (data.user) {
                localStorage.setItem('wallet_address', data.user.walletAddress || walletAddress);
            } else {
                localStorage.setItem('wallet_address', walletAddress);
            }

            return true;
        } catch (error) {
            console.error('Login test error:', error);
            return false;
        }
    }

    // Login dengan wallet signature - DIPERBARUI dengan notifikasi
    async loginWithWallet(wallet) {
        if (!wallet || !wallet.publicKey) {
            throw new Error('Wallet not connected');
        }

        try {
            console.log('Attempting login with wallet signature for address:', wallet.publicKey.toString());

            // Get nonce from server
            const nonceResponse = await fetch(`${this.baseUrl}/auth/nonce`);

            if (!nonceResponse.ok) {
                throw new Error(`Failed to get nonce: ${nonceResponse.status}`);
            }

            const { nonce } = await nonceResponse.json();

            // Create message to sign
            const message = `Sign this message to authenticate with your wallet: ${nonce}`;
            const encodedMessage = new TextEncoder().encode(message);

            // Sign message
            const signature = await wallet.signMessage(encodedMessage);
            const signatureBase58 = Buffer.from(signature).toString('base58');

            console.log('Message signed, submitting to server');

            // Send signature to server
            const response = await fetch(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    wallet_address: wallet.publicKey.toString(),
                    signature: signatureBase58,
                    message
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || `Login failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('Login successful with signature');

            // Store token - ini akan memanggil _notifyAuthChange
            if (data.token) {
                this.setToken(data.token);

                // Juga simpan alamat wallet
                localStorage.setItem('wallet_address', wallet.publicKey.toString());

                return true;
            } else {
                throw new Error('No token received from server');
            }
        } catch (error) {
            console.error('Login with wallet error:', error);
            throw error;
        }
    }

    // Mendapatkan alamat wallet yang disimpan
    getWalletAddress() {
        return localStorage.getItem('wallet_address');
    }

    // Cek status admin - DIPERBARUI dengan penanganan error lebih baik
    async checkAdminStatus() {
        try {
            const token = this.getToken();

            if (!token) {
                console.log('No token available for admin check');
                return { isAdmin: false };
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(`${this.baseUrl}/auth/admin-check`, {
                headers: {
                    'x-auth-token': token
                },
                signal: controller.signal
            });

            clearTimeout(timeout);

            // Periksa content-type
            const contentType = response.headers.get('content-type');
            if (!response.ok) {
                console.log(`Admin check failed with status ${response.status}`);

                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    console.error('Admin check error detail:', errorData);
                } else {
                    // Log respons error jika bukan JSON
                    const errorText = await response.text();
                    console.error("Admin check response not JSON:", errorText);
                }

                if (response.status === 401 || response.status === 403) {
                    // Token tidak valid lagi, invalidate
                    this.tokenValid = false;
                }

                return { isAdmin: false };
            }

            if (!contentType || !contentType.includes('application/json')) {
                console.error('Admin check: Server did not return JSON response');
                return { isAdmin: false };
            }

            const data = await response.json();
            console.log('Admin check result:', data);

            // Jika berhasil, token valid
            this.tokenValid = true;

            return { isAdmin: !!data.isAdmin };
        } catch (error) {
            console.error('Admin check error:', error);

            // Jika error adalah abort (timeout), jangan invalidate token
            if (error.name === 'AbortError') {
                console.log('Admin check timeout');
                return { isAdmin: false };
            }

            return { isAdmin: false };
        }
    }

    // Logout dari aplikasi - DIPERBARUI dengan notifikasi
    logout() {
        this.removeToken();
        localStorage.removeItem('wallet_address');
        localStorage.removeItem('myTickets');
        // Hapus data lain yang mungkin disimpan
    }

    // Refresh token jika masih valid tapi mendekati expired
    async refreshTokenIfNeeded() {
        const token = this.getToken();
        if (!token) return false;

        const lastLogin = this.lastSuccessfulLogin;
        const now = Date.now();

        // Jika login terakhir kurang dari 22 jam yang lalu, tidak perlu refresh
        // Ini berasumsi token expired dalam 24 jam
        if (lastLogin && now - lastLogin < 22 * 60 * 60 * 1000) {
            return true;
        }

        // Coba refresh dengan login-test
        console.log("Token approaching expiry, refreshing...");
        const walletAddress = this.getWalletAddress();
        if (walletAddress) {
            return await this.loginTest(walletAddress);
        }

        return false;
    }
}

export default new AuthService();