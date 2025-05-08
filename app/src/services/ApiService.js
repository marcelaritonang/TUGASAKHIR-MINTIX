// app/services/ApiService.js
class ApiService {
    constructor() {
        this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

        // Cache untuk menyimpan data 
        this.cache = {
            concerts: {
                data: null,
                timestamp: 0
            },
            mintedSeats: {}, // Untuk menyimpan data kursi terjual per concertId
            lastFetch: {},   // Untuk mencatat kapan terakhir kali mengambil data
        };

        // Waktu cache dalam milidetik (15 detik untuk konser - dikurangi untuk membuat pembaruan lebih responsif)
        this.concertCacheDuration = 15000;
        this.seatCacheDuration = 30000;
    }

    // Helper untuk mendapatkan headers dengan token untuk request JSON
    _getHeaders() {
        const token = localStorage.getItem('auth_token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'x-auth-token': token })
        };
    }

    // Helper untuk mendapatkan headers multipart (tanpa Content-Type)
    _getMultipartHeaders() {
        const token = localStorage.getItem('auth_token');
        return token ? { 'x-auth-token': token } : {};
    }

    // GET concerts umum - DIPERBARUI dengan penanganan cache yang lebih baik
    async getConcerts(forceRefresh = false) {
        try {
            console.log("Fetching concerts" + (forceRefresh ? " (forced refresh)" : ""));

            // Periksa jika kita memiliki data cache yang valid dan tidak dipaksa untuk refresh
            const now = Date.now();
            const cacheIsValid = !forceRefresh &&
                this.cache.concerts.data &&
                (now - this.cache.concerts.timestamp < this.concertCacheDuration);

            if (cacheIsValid) {
                console.log("Using cached concert data");
                return this.cache.concerts.data;
            }

            const response = await fetch(`${this.baseUrl}/concerts`);
            if (!response.ok) {
                throw new Error(`Failed to fetch concerts: ${response.status}`);
            }

            const data = await response.json();
            console.log(`Concerts fetched: ${Array.isArray(data.concerts) ? data.concerts.length : Array.isArray(data) ? data.length : 'no array'}`);

            // Simpan di cache dengan timestamp
            const concertData = data.concerts || data;
            this.cache.concerts.data = concertData;
            this.cache.concerts.timestamp = now;

            return concertData;
        } catch (error) {
            console.error('Error fetching concerts:', error);

            // Jika kita memiliki data cache, kembalikan sebagai fallback
            if (this.cache.concerts.data) {
                console.log("Returning cached concert data due to fetch error");
                return this.cache.concerts.data;
            }

            throw error;
        }
    }

    // Bersihkan cache konser - panggil ini setelah menyetujui/menolak konser
    clearConcertCache() {
        console.log("Clearing concert cache");
        this.cache.concerts.data = null;
        this.cache.concerts.timestamp = 0;
    }

    // GET concert by ID
    async getConcert(id) {
        try {
            console.log(`Fetching concert: ${id}`);

            // Periksa dulu jika kita memilikinya di cache konser
            if (this.cache.concerts.data) {
                const cachedConcert = Array.isArray(this.cache.concerts.data) ?
                    this.cache.concerts.data.find(c => c._id === id || c.id === id) :
                    null;

                if (cachedConcert) {
                    console.log("Found concert in cache:", cachedConcert.name || 'unnamed');
                    return cachedConcert;
                }
            }

            const response = await fetch(`${this.baseUrl}/concerts/${id}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch concert details: ${response.status}`);
            }

            const data = await response.json();
            console.log("Concert fetched:", data.name || 'unnamed');
            return data;
        } catch (error) {
            console.error(`Error fetching concert ${id}:`, error);
            throw error;
        }
    }

    // GET pending concerts (admin)
    async getPendingConcerts() {
        try {
            console.log("Fetching pending concerts");
            const response = await fetch(`${this.baseUrl}/admin/concerts/pending`, {
                headers: {
                    'x-auth-token': localStorage.getItem('auth_token')
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch pending concerts: ${response.status}`);
            }

            const data = await response.json();
            console.log(`Pending concerts fetched: ${data.length || 0}`);
            return data;
        } catch (error) {
            console.error('Error fetching pending concerts:', error);
            throw error;
        }
    }

    // Mint ticket - dengan improved error handling dan pembaruan cache
    async mintTicket(mintData) {
        try {
            console.log("Minting ticket:", mintData);
            const token = localStorage.getItem('auth_token');

            if (!token) {
                throw new Error('Authentication required for minting tickets');
            }

            console.log("Minting with token:", token.substring(0, 10) + "...");

            // Tambahkan timeout untuk mencegah request yang menggantung
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(`${this.baseUrl}/tickets/mint`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(mintData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log("Mint ticket response status:", response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `Failed to mint ticket: ${response.status}`);
            }

            const result = await response.json();
            console.log("Mint result:", result.success ? 'success' : 'failed');

            // Perbarui cache kursi yang terjual jika berhasil
            if (result.success && mintData.concertId && mintData.seatNumber) {
                this.updateMintedSeatsCache(mintData.concertId, mintData.seatNumber);
            }

            return result;
        } catch (error) {
            console.error('Error minting ticket:', error);
            throw error;
        }
    }

    // Tambahkan kursi yang baru di-mint ke cache
    updateMintedSeatsCache(concertId, seatNumber) {
        // Periksa apakah kita sudah memiliki cache untuk konser ini
        if (!this.cache.mintedSeats[concertId]) {
            this.cache.mintedSeats[concertId] = { seats: [] };
        }

        // Tambahkan kursi jika belum ada
        if (!this.cache.mintedSeats[concertId].seats.includes(seatNumber)) {
            this.cache.mintedSeats[concertId].seats.push(seatNumber);

            // Simpan ke localStorage sebagai backup
            const cacheKey = `minted_seats_${concertId}`;
            localStorage.setItem(cacheKey, JSON.stringify(this.cache.mintedSeats[concertId].seats));

            console.log(`Updated minted seats cache for ${concertId}, added ${seatNumber}`);
        }
    }

    // Get my tickets
    async getMyTickets() {
        try {
            console.log("Fetching my tickets");
            const token = localStorage.getItem('auth_token');

            if (!token) {
                console.warn("No auth token available for getMyTickets");
                return [];
            }

            // Tambahkan timeout untuk mencegah request yang menggantung
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(`${this.baseUrl}/tickets`, {
                headers: {
                    'x-auth-token': token
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log("Get my tickets response status:", response.status);

            if (!response.ok) {
                console.error(`Error fetching tickets: ${response.status}`);
                return [];
            }

            const tickets = await response.json();
            console.log(`Tickets fetched: ${Array.isArray(tickets) ? tickets.length : 'not an array'}`);

            // Simpan di localStorage sebagai backup
            if (Array.isArray(tickets)) {
                localStorage.setItem('myTickets', JSON.stringify(tickets));
            }

            return Array.isArray(tickets) ? tickets : [];
        } catch (error) {
            console.error('Error fetching tickets:', error);

            // Coba ambil dari localStorage sebagai fallback
            try {
                const cachedTickets = JSON.parse(localStorage.getItem('myTickets') || '[]');
                console.log(`Retrieved ${cachedTickets.length} tickets from cache`);
                return cachedTickets;
            } catch (cacheError) {
                console.error('Error retrieving cached tickets:', cacheError);
                return [];
            }
        }
    }

    // Verify ticket
    async verifyTicket(ticketId) {
        try {
            console.log(`Verifying ticket: ${ticketId}`);
            const token = localStorage.getItem('auth_token');

            if (!token) {
                throw new Error('Authentication required for verifying tickets');
            }

            const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/verify`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                }
            });

            console.log("Verify ticket response status:", response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `Failed to verify ticket: ${response.status}`);
            }

            const result = await response.json();
            console.log("Verification result:", result.success ? 'success' : 'failed');

            return result;
        } catch (error) {
            console.error('Error verifying ticket:', error);
            throw error;
        }
    }

    // Get minted seats for a concert dengan pengelolaan cache yang lebih baik
    async getMintedSeats(concertId) {
        try {
            console.log(`Fetching minted seats for concert: ${concertId}`);

            // Periksa jika kita memiliki cache yang valid
            const now = Date.now();
            const lastFetch = this.cache.lastFetch[concertId] || 0;
            const cacheIsValid = (now - lastFetch) < this.seatCacheDuration;

            if (cacheIsValid && this.cache.mintedSeats[concertId]) {
                console.log(`Using cached minted seats for concert ${concertId}`);
                return this.cache.mintedSeats[concertId];
            }

            // Tambahkan timeout untuk mencegah request yang menggantung
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(`${this.baseUrl}/tickets/concerts/${concertId}/minted-seats`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log("Get minted seats response status:", response.status);

            if (!response.ok) {
                console.error(`Error fetching minted seats: ${response.status}`);

                // Gunakan cache lama jika tersedia
                if (this.cache.mintedSeats[concertId]) {
                    return this.cache.mintedSeats[concertId];
                }

                // Coba ambil dari localStorage sebagai fallback
                const cacheKey = `minted_seats_${concertId}`;
                const cachedSeats = JSON.parse(localStorage.getItem(cacheKey) || '[]');

                return { seats: cachedSeats };
            }

            const data = await response.json();
            console.log(`Fetched ${data.seats?.length || 0} minted seats`);

            // Perbarui cache
            this.cache.mintedSeats[concertId] = data;
            this.cache.lastFetch[concertId] = now;

            // Simpan ke localStorage sebagai backup
            if (data.seats && Array.isArray(data.seats)) {
                const cacheKey = `minted_seats_${concertId}`;
                localStorage.setItem(cacheKey, JSON.stringify(data.seats));
            }

            return data;
        } catch (error) {
            console.error('Error fetching minted seats:', error);

            // Gunakan cache lama jika tersedia
            if (this.cache.mintedSeats[concertId]) {
                return this.cache.mintedSeats[concertId];
            }

            // Coba ambil dari localStorage sebagai fallback
            try {
                const cacheKey = `minted_seats_${concertId}`;
                const cachedSeats = JSON.parse(localStorage.getItem(cacheKey) || '[]');
                console.log(`Retrieved ${cachedSeats.length} minted seats from cache`);
                return { seats: cachedSeats };
            } catch (cacheError) {
                console.error('Error retrieving cached seats:', cacheError);
                return { seats: [] };
            }
        }
    }

    // Approve concert (admin) - DIPERBARUI dengan invalidasi cache
    async approveConcert(concertId, data = {}) {
        try {
            console.log(`Approving concert: ${concertId}`);
            const token = localStorage.getItem('auth_token');

            if (!token) {
                throw new Error('Admin authentication required');
            }

            const response = await fetch(`${this.baseUrl}/admin/concerts/${concertId}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(data)
            });

            console.log("Approve concert response status:", response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `Failed to approve concert: ${response.status}`);
            }

            const result = await response.json();
            console.log("Approval result:", result.name || 'unnamed');

            // Bersihkan cache konser untuk memaksa refresh pada fetch berikutnya
            this.clearConcertCache();

            return result;
        } catch (error) {
            console.error(`Error approving concert ${concertId}:`, error);
            throw error;
        }
    }

    // Reject concert (admin) - DIPERBARUI dengan invalidasi cache
    async rejectConcert(concertId, data = {}) {
        try {
            console.log(`Rejecting concert: ${concertId}`);
            const token = localStorage.getItem('auth_token');

            if (!token) {
                throw new Error('Admin authentication required');
            }

            const response = await fetch(`${this.baseUrl}/admin/concerts/${concertId}/reject`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(data)
            });

            console.log("Reject concert response status:", response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `Failed to reject concert: ${response.status}`);
            }

            const result = await response.json();
            console.log("Rejection result:", result.name || 'unnamed');

            // Bersihkan cache konser untuk memaksa refresh pada fetch berikutnya
            this.clearConcertCache();

            return result;
        } catch (error) {
            console.error(`Error rejecting concert ${concertId}:`, error);
            throw error;
        }
    }

    // GET my pending concerts - untuk user
    async getMyPendingConcerts() {
        try {
            console.log("Fetching my pending concerts");
            const token = localStorage.getItem('auth_token');

            if (!token) {
                console.warn("No auth token available for getMyPendingConcerts");
                return [];
            }

            // Tambahkan timeout untuk mencegah request yang menggantung
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(`${this.baseUrl}/concerts/me/pending`, {
                headers: {
                    'x-auth-token': token
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log("Get my pending concerts response status:", response.status);

            if (!response.ok) {
                console.error(`Error fetching my pending concerts: ${response.status}`);
                return [];
            }

            const data = await response.json();
            console.log(`My pending concerts fetched: ${Array.isArray(data) ? data.length : 'not an array'}`);

            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching my pending concerts:', error);

            // Coba ambil dari localStorage sebagai fallback
            try {
                const cachedConcerts = JSON.parse(localStorage.getItem('myPendingConcerts') || '[]');
                console.log(`Retrieved ${cachedConcerts.length} my pending concerts from cache`);
                return cachedConcerts;
            } catch (cacheError) {
                console.error('Error retrieving cached concerts:', cacheError);
                return [];
            }
        }
    }

    // Request more info (admin)
    async requestMoreInfo(concertId, data = {}) {
        try {
            console.log(`Requesting more info for concert: ${concertId}`);
            const token = localStorage.getItem('auth_token');

            if (!token) {
                throw new Error('Admin authentication required');
            }

            const response = await fetch(`${this.baseUrl}/admin/concerts/${concertId}/request-info`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(data)
            });

            console.log("Request more info response status:", response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `Failed to request more information: ${response.status}`);
            }

            const result = await response.json();
            console.log("Request more info result:", result.name || 'unnamed');

            return result;
        } catch (error) {
            console.error(`Error requesting more info for concert ${concertId}:`, error);
            throw error;
        }
    }

    // Submit additional info for a concert with info_requested status
    async submitAdditionalInfo(concertId, information) {
        try {
            console.log(`Submitting additional info for concert: ${concertId}`);
            const token = localStorage.getItem('auth_token');

            if (!token) {
                throw new Error('Authentication required for submitting info');
            }

            const response = await fetch(`${this.baseUrl}/concerts/${concertId}/additional-info`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({
                    additionalInfo: information
                })
            });

            console.log("Submit additional info response status:", response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `Failed to submit additional info: ${response.status}`);
            }

            const result = await response.json();
            console.log("Submit info result:", result);

            return result;
        } catch (error) {
            console.error(`Error submitting additional info for concert ${concertId}:`, error);
            throw error;
        }
    }
    // Check admin status
    async checkAdminStatus() {
        try {
            console.log("Checking admin status");
            const token = localStorage.getItem('auth_token');

            if (!token) {
                console.log("No token available for admin check");
                return { isAdmin: false };
            }

            const response = await fetch(`${this.baseUrl}/auth/admin-check`, {
                headers: {
                    'x-auth-token': token
                }
            });

            console.log("Admin check response status:", response.status);

            if (!response.ok) {
                console.error(`Error checking admin status: ${response.status}`);
                return { isAdmin: false };
            }

            const data = await response.json();
            console.log("Admin check result:", data.isAdmin ? 'is admin' : 'not admin');

            return { isAdmin: !!data.isAdmin };
        } catch (error) {
            console.error('Error checking admin status:', error);
            return { isAdmin: false };
        }
    }

    // Invalidate seat cache for a concert
    invalidateSeatCache(concertId) {
        console.log(`Invalidating seat cache for concert ${concertId}`);
        if (this.cache.mintedSeats[concertId]) {
            delete this.cache.mintedSeats[concertId];
        }
        if (this.cache.lastFetch[concertId]) {
            delete this.cache.lastFetch[concertId];
        }
    }
}

export default new ApiService();