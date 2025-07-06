// src/services/ApiService.js - Enhanced version with improved blockchain methods
class ApiService {
    constructor() {
        // FIX: HARDCODE base URL untuk prevent connection issues
        this.baseUrl = process.env.REACT_APP_API_URL ||
            (process.env.NODE_ENV === 'production'
                ? 'https://tugasakhir-mintix-production.up.railway.app/api'
                : 'http://localhost:5000/api');


        // Debug logging
        console.log('🔗 ApiService baseUrl:', this.baseUrl);
        console.log('🌍 Environment:', process.env.NODE_ENV);
        console.log('🔧 REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
        // Cache for storing data
        this.cache = {
            concerts: {
                data: null,
                timestamp: 0
            },
            pendingConcerts: {
                data: null,
                timestamp: 0
            },
            mintedSeats: {},
            lastFetch: {},
            transactions: {}
        };

        // REDUCED cache duration to prevent stale data
        this.concertCacheDuration = 30000; // 30 seconds instead of 15
        this.pendingConcertsCacheDuration = 10000;
        this.seatCacheDuration = 30000;
        this.transactionCacheDuration = 60000;
    }



    // Helper to get headers with token for JSON requests
    _getHeaders() {
        const token = localStorage.getItem('auth_token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'x-auth-token': token })
        };
    }

    // Helper to get headers for multipart requests
    _getMultipartHeaders() {
        const token = localStorage.getItem('auth_token');
        return token ? { 'x-auth-token': token } : {};
    }

    // Helper to handle response errors better
    async _handleResponse(response, errorMessage = 'API request failed') {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(errorData.msg || `${errorMessage}: ${response.status}`);
            error.status = response.status;
            throw error;
        }
        return response.json();
    }

    // Clear all cache
    clearCache() {
        this.cache = {
            concerts: {
                data: null,
                timestamp: 0
            },
            pendingConcerts: {
                data: null,
                timestamp: 0
            },
            mintedSeats: {},
            lastFetch: {},
            transactions: {}
        };
        console.log("API cache cleared");
    }
    // Bersihkan cache konser
    clearConcertCache() {
        console.log("Clearing concert cache");
        if (this.cache && this.cache.concerts) {
            this.cache.concerts.data = null;
            this.cache.concerts.timestamp = 0;
        }
        localStorage.removeItem('concerts');
        localStorage.removeItem('approved_concerts');
    }

    // Bersihkan cache konser pending
    clearPendingConcertsCache() {
        console.log("Clearing pending concerts cache");
        this.cache.pendingConcerts.data = null;
        this.cache.pendingConcerts.timestamp = 0;
        // Remove from localStorage as well
        localStorage.removeItem('pendingConcerts');
    }


    async getConcerts(forceRefresh = false) {
        try {
            console.log("🎵 Fetching concerts" + (forceRefresh ? " (forced refresh)" : ""));

            // Check cache ONLY if not forcing refresh
            const now = Date.now();
            if (!forceRefresh && this.cache.concerts.data &&
                (now - this.cache.concerts.timestamp < this.concertCacheDuration)) {
                console.log("Using cached concert data");
                return this.cache.concerts.data;
            }

            // Fetch from API
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            try {
                console.log(`Making request to: ${this.baseUrl}/concerts`);

                const response = await fetch(`${this.baseUrl}/concerts`, {
                    signal: controller.signal,
                    headers: this._getHeaders()
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    console.error(`Concert API returned ${response.status}`);
                    throw new Error(`API Error: ${response.status}`);
                }

                const data = await response.json();
                console.log("Raw concert data:", data);

                // Handle different response formats
                let concertData = [];
                if (Array.isArray(data)) {
                    concertData = data;
                } else if (data.concerts && Array.isArray(data.concerts)) {
                    concertData = data.concerts;
                } else if (data.data && Array.isArray(data.data)) {
                    concertData = data.data;
                }

                console.log(`✅ Processed ${concertData.length} concerts`);

                // Update cache
                this.cache.concerts.data = concertData;
                this.cache.concerts.timestamp = now;

                // 🚀 NEW: ALSO populate individual concert cache for MyTickets
                if (!this.cache.concertDetails) {
                    this.cache.concertDetails = {};
                }

                concertData.forEach(concert => {
                    if (concert._id || concert.id) {
                        const concertId = (concert._id || concert.id).toString();
                        this.cache.concertDetails[concertId] = {
                            data: concert,
                            timestamp: now
                        };
                        console.log(`📦 Cached individual concert: ${concert.name} (ID: ${concertId})`);
                    }
                });

                console.log(`✅ Pre-cached ${Object.keys(this.cache.concertDetails).length} individual concerts for MyTickets`);

                return concertData;

            } catch (fetchError) {
                clearTimeout(timeoutId);
                console.error("Concert fetch error:", fetchError.message);

                // Return cached data if available
                if (this.cache.concerts.data) {
                    console.log("Returning cached data due to fetch error");
                    return this.cache.concerts.data;
                }

                console.log("No cached data, returning empty array");
                return [];
            }

        } catch (error) {
            console.error('Critical error in getConcerts:', error);
            return []; // Always return array to prevent crashes
        }
    }

    async getConcert(concertId, forceRefresh = false) {
        try {
            console.log(`🎵 Getting concert by ID: ${concertId} (forceRefresh: ${forceRefresh})`);

            if (!concertId) {
                console.error("Missing concertId in getConcert");
                return null;
            }

            // Normalize concertId to string
            const normalizedConcertId = concertId.toString();

            // Initialize individual concert cache if not exists
            if (!this.cache.concertDetails) {
                this.cache.concertDetails = {};
            }

            // Check individual cache first (unless forcing refresh)
            const now = Date.now();
            const cacheKey = normalizedConcertId;
            const concertDetailCacheDuration = 60000; // 1 minute for individual concerts

            if (!forceRefresh && this.cache.concertDetails[cacheKey]) {
                const cachedConcert = this.cache.concertDetails[cacheKey];
                const cacheAge = now - cachedConcert.timestamp;

                if (cacheAge < concertDetailCacheDuration) {
                    console.log(`✅ Using cached individual concert: ${cachedConcert.data?.name} (${cacheAge}ms old)`);
                    return cachedConcert.data;
                }
            }

            // 🚀 NEW: Check if concert exists in main concerts cache (from getConcerts)
            if (this.cache.concerts.data && Array.isArray(this.cache.concerts.data)) {
                const foundInMainCache = this.cache.concerts.data.find(concert =>
                    (concert._id === normalizedConcertId) || (concert.id === normalizedConcertId)
                );

                if (foundInMainCache) {
                    console.log(`✅ Found concert in main cache: ${foundInMainCache.name}`);

                    // Cache in individual cache for future use
                    this.cache.concertDetails[cacheKey] = {
                        data: foundInMainCache,
                        timestamp: now
                    };

                    return foundInMainCache;
                } else {
                    console.log(`🔍 Concert ${normalizedConcertId} not found in main cache, trying individual API call`);
                }
            }

            // If not in cache, try individual API call
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            try {
                console.log(`📡 Fetching individual concert from API: ${this.baseUrl}/concerts/${normalizedConcertId}`);

                const response = await fetch(`${this.baseUrl}/concerts/${normalizedConcertId}`, {
                    headers: this._getHeaders(),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                // Handle different response statuses
                if (response.status === 404) {
                    console.log(`❌ Concert ${normalizedConcertId} not found (404)`);
                    // Cache the "not found" result to prevent repeated API calls
                    this.cache.concertDetails[cacheKey] = {
                        data: null,
                        timestamp: now,
                        notFound: true
                    };
                    return null;
                }

                if (!response.ok) {
                    console.error(`❌ Concert API error: ${response.status}`);
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.msg || `API Error: ${response.status}`);
                }

                const responseData = await response.json();
                console.log("Raw individual concert response:", responseData);

                // Handle different response formats
                let concertData = null;

                if (responseData.success && responseData.concert) {
                    concertData = responseData.concert;
                } else if (responseData.success === false) {
                    console.log(`❌ API returned success: false - ${responseData.msg}`);
                    return null;
                } else if (responseData._id || responseData.id) {
                    // Direct concert object
                    concertData = responseData;
                } else {
                    console.error("Unexpected response format:", responseData);
                    return null;
                }

                if (concertData) {
                    console.log(`✅ Successfully fetched individual concert: ${concertData.name}`);

                    // Cache the result
                    this.cache.concertDetails[cacheKey] = {
                        data: concertData,
                        timestamp: now
                    };

                    return concertData;
                } else {
                    console.log(`❌ No concert data in response`);
                    return null;
                }

            } catch (fetchError) {
                clearTimeout(timeoutId);

                if (fetchError.name === 'AbortError') {
                    console.error('❌ Individual concert fetch timed out');
                } else {
                    console.error('❌ Network error fetching individual concert:', fetchError);
                }

                // Check if we have cached data as fallback
                if (this.cache.concertDetails[cacheKey] && this.cache.concertDetails[cacheKey].data) {
                    console.log(`📦 Using stale cached concert as fallback`);
                    return this.cache.concertDetails[cacheKey].data;
                }

                // Return null for individual concert failures
                return null;
            }

        } catch (error) {
            console.error(`❌ Critical error in getConcert(${concertId}):`, error);

            // Final fallback: check if we have any cached data
            const cacheKey = concertId.toString();
            if (this.cache.concertDetails && this.cache.concertDetails[cacheKey] && this.cache.concertDetails[cacheKey].data) {
                console.log(`📦 Using any available cached concert as final fallback`);
                return this.cache.concertDetails[cacheKey].data;
            }

            return null;
        }
    }
    // GET ticket by ID
    async getTicket(ticketId) {
        try {
            console.log(`Fetching ticket: ${ticketId}`);

            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Authentication required');
            }

            // Add timeout to prevent hanging request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            try {
                const response = await fetch(`${this.baseUrl}/tickets/${ticketId}`, {
                    headers: {
                        'x-auth-token': token
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const error = new Error(errorData.msg || `Failed to fetch ticket: ${response.status}`);
                    error.status = response.status;
                    throw error;
                }

                return await response.json();
            } catch (fetchError) {
                clearTimeout(timeoutId);

                if (fetchError.name === 'AbortError') {
                    throw new Error('Request timed out when fetching ticket');
                }

                throw fetchError;
            }
        } catch (error) {
            console.error(`Error fetching ticket ${ticketId}:`, error);
            throw error;
        }
    }

    /**
 * Enhanced method to get tickets with better error handling and caching
 */
    async getMyTickets(hideDeleted = true, forceRefresh = false) {
        try {
            console.log(`Fetching my tickets, hideDeleted: ${hideDeleted}, forceRefresh: ${forceRefresh}`);
            const token = localStorage.getItem('auth_token');

            if (!token) {
                console.warn("No auth token available for getMyTickets");
                return [];
            }

            // Jika forceRefresh, hapus semua cache terlebih dahulu
            if (forceRefresh) {
                this.clearAllTicketCaches();
            }

            // Add hideDeleted parameter to URL
            const url = `${this.baseUrl}/tickets?hideDeleted=${hideDeleted}&forceRefresh=${forceRefresh}`;

            // Use cache key that includes the hideDeleted parameter
            const cacheKey = `my_tickets_${hideDeleted}`;
            const lastUpdateKey = `my_tickets_last_update`;
            const lastUpdate = localStorage.getItem(lastUpdateKey);

            // Only use cache if it's less than 1 minute old AND not forcing refresh
            if (!forceRefresh && lastUpdate && (Date.now() - parseInt(lastUpdate)) < 60000) {
                const cachedTickets = localStorage.getItem(cacheKey);
                if (cachedTickets) {
                    try {
                        const parsed = JSON.parse(cachedTickets);
                        console.log(`Using ${parsed.length} cached tickets (${Date.now() - parseInt(lastUpdate)}ms old)`);
                        return parsed;
                    } catch (e) {
                        console.warn('Error parsing cached tickets:', e);
                    }
                }
            }

            // Add retry logic
            let attempts = 0;
            const maxAttempts = 3;
            let lastError = null;

            while (attempts < maxAttempts) {
                attempts++;
                try {
                    // Add timeout to prevent hanging request
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000);

                    const response = await fetch(url, {
                        headers: {
                            'x-auth-token': token,
                            // Tambahkan header no-cache jika force refresh
                            ...(forceRefresh && { 'Cache-Control': 'no-cache, no-store, must-revalidate' })
                        },
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    // Handle rate limiting
                    if (response.status === 429) {
                        console.warn(`Rate limit hit when fetching tickets (attempt ${attempts})`);
                        // Wait with exponential backoff before retry
                        const backoff = Math.min(1000 * Math.pow(2, attempts - 1), 8000);
                        await new Promise(resolve => setTimeout(resolve, backoff));
                        continue;
                    }

                    // Handle authentication error
                    if (response.status === 401) {
                        console.warn("Auth token invalid, attempting to refresh token");

                        // Try to refresh auth token
                        try {
                            // If wallet is connected, try to re-authenticate
                            const publicKey = localStorage.getItem('walletPublicKey');
                            if (publicKey) {
                                console.log("Attempting to re-authenticate with public key");

                                // Use your auth service to login again
                                // This assumes your AuthService has a loginTest method
                                const success = await window.AuthService?.loginTest?.(publicKey);

                                if (success) {
                                    console.log("Re-authentication successful, retrying with new token");
                                    // Skip to next attempt with new token
                                    continue;
                                }
                            }
                        } catch (authError) {
                            console.error("Error re-authenticating:", authError);
                        }

                        // If re-authentication failed or wasn't possible
                        localStorage.removeItem('auth_token');
                        return [];
                    }

                    if (!response.ok) {
                        console.error(`Error fetching tickets: ${response.status}`);
                        throw new Error(`Failed to fetch tickets: ${response.status}`);
                    }

                    const tickets = await response.json();
                    console.log(`Tickets fetched: ${Array.isArray(tickets) ? tickets.length : 'not an array'}`);

                    // Store in localStorage as backup
                    if (Array.isArray(tickets)) {
                        localStorage.setItem(cacheKey, JSON.stringify(tickets));
                        localStorage.setItem(lastUpdateKey, Date.now().toString());
                    }

                    return Array.isArray(tickets) ? tickets : [];
                } catch (err) {
                    lastError = err;
                    console.error(`Error fetching tickets (attempt ${attempts}/${maxAttempts}):`, err.message);

                    // For timeouts, retry immediately
                    if (err.name === 'AbortError') {
                        console.warn('Ticket fetch timed out');
                        if (attempts < maxAttempts) {
                            continue;
                        }
                    }

                    // For other errors, retry with delay if not on final attempt
                    if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                    }
                }
            }

            // After all retries failed, try to get from localStorage
            try {
                const cachedTickets = JSON.parse(localStorage.getItem(cacheKey) || '[]');
                console.log(`Retrieved ${cachedTickets.length} tickets from cache after failed fetch`);
                return cachedTickets;
            } catch (cacheError) {
                console.error('Error retrieving cached tickets:', cacheError);
                throw lastError || new Error('Failed to fetch tickets after multiple attempts');
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);

            // Try to retrieve from localStorage as fallback
            try {
                const cachedTickets = JSON.parse(localStorage.getItem(`my_tickets_${hideDeleted}`) || '[]');
                console.log(`Retrieved ${cachedTickets.length} tickets from cache as error fallback`);
                return cachedTickets;
            } catch (cacheError) {
                console.error('Error retrieving cached tickets:', cacheError);
                return [];
            }
        }
    }
    clearAllTicketCaches() {
        console.log("Clearing all ticket caches");

        // Hapus cache tickets dari memory
        if (this.cache && this.cache.tickets) {
            this.cache.tickets = {};
        }

        // Hapus dari localStorage
        localStorage.removeItem('myTickets');

        // Hapus semua cache tiket dengan pola 'my_tickets_*'
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('my_tickets_')) {
                localStorage.removeItem(key);
            }
        }

        // Hapus cache timestamp
        localStorage.removeItem('my_tickets_last_update');

        console.log("All ticket caches cleared");
    }


    // Mint ticket
    /**
 * Mint tiket dengan mengirim SOL ke creator
 * @param {Object} mintData - Data untuk minting tiket
 * @returns {Promise<Object>} Hasil dari server
 */
    /**
 * Mint tiket dengan mengirim SOL ke creator
 * @param {Object} mintData - Data untuk minting tiket
 * @returns {Promise<Object>} Hasil dari server
 */
    async mintTicket(mintData) {
        try {
            console.log("===== ENHANCED MINT TICKET API CALL =====");
            console.log("Minting ticket with data:", JSON.stringify(mintData, null, 2));

            // Get auth token
            const token = localStorage.getItem('auth_token');
            if (!token) {
                console.error("No auth token available");
                return {
                    success: false,
                    msg: 'Authentication required for minting tickets'
                };
            }

            // Basic data validation
            if (!mintData.concertId) {
                console.error("Missing concertId in mintData");
                return {
                    success: false,
                    msg: 'Concert ID is required'
                };
            }

            if (!mintData.sectionName) {
                console.error("Missing sectionName in mintData");
                return {
                    success: false,
                    msg: 'Section name is required'
                };
            }

            if (!mintData.seatNumber) {
                console.error("Missing seatNumber in mintData");
                return {
                    success: false,
                    msg: 'Seat number is required'
                };
            }

            // Create request payload
            const payload = {
                concertId: mintData.concertId,
                sectionName: mintData.sectionName,
                seatNumber: mintData.seatNumber,
                quantity: mintData.quantity || 1,
                transactionSignature: mintData.transactionSignature || null,
                receiverAddress: mintData.receiverAddress || null,
                includePerformanceMetrics: true
            };

            console.log("Sending mint request to API with payload:", JSON.stringify(payload, null, 2));
            console.log("Using auth token:", token.substring(0, 15) + "...");
            console.log("Endpoint:", `${this.baseUrl}/tickets/mint`);

            // Setup request with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            try {
                // Make the API request
                const response = await fetch(`${this.baseUrl}/tickets/mint`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                // Clear timeout
                clearTimeout(timeoutId);

                // Log response details for debugging
                console.log(`Mint ticket API response status: ${response.status}`);
                console.log(`Response headers:`, response.headers);

                // Handle non-200 responses
                if (!response.ok) {
                    let errorMessage = `Failed to mint ticket (Status: ${response.status})`;
                    let errorDetails = null;

                    try {
                        // Try to get detailed error message from response
                        const errorData = await response.json();
                        console.error("API Error response:", errorData);

                        if (errorData) {
                            errorMessage = errorData.msg || errorData.message || errorMessage;
                            errorDetails = errorData;
                        }
                    } catch (parseErr) {
                        console.error("Could not parse error response as JSON:", parseErr);

                        // Try to get text response as fallback
                        try {
                            const errorText = await response.text();
                            console.error("Raw error response:", errorText);
                            if (errorText) {
                                errorMessage = `${errorMessage} - ${errorText}`;
                            }
                        } catch (textErr) {
                            console.error("Could not get text from error response:", textErr);
                        }
                    }

                    // Return structured error response
                    return {
                        success: false,
                        msg: errorMessage,
                        status: response.status,
                        error: errorDetails
                    };
                }

                // Parse successful response
                let result;
                try {
                    result = await response.json();
                    console.log("Mint ticket successful, raw response:", result);
                } catch (parseErr) {
                    console.error("Error parsing successful response:", parseErr);
                    return {
                        success: false,
                        msg: 'Server returned invalid response format',
                        error: parseErr.message
                    };
                }

                // CRITICAL: Validate response structure
                if (!result) {
                    console.error("Empty response from server");
                    return {
                        success: false,
                        msg: 'Server returned empty response'
                    };
                }

                // Check if response indicates success
                if (result.success === false) {
                    console.error("Server explicitly returned success: false", result);
                    return {
                        success: false,
                        msg: result.msg || result.error || 'Server reported mint failure',
                        error: result
                    };
                }

                // If no explicit success flag, check for ticket data
                if (!result.success && !result.ticket) {
                    console.error("Response missing both success flag and ticket data", result);
                    return {
                        success: false,
                        msg: 'Invalid response structure from server',
                        error: result
                    };
                }

                // Clear all related caches for data freshness
                this.clearAllTicketCaches();
                this.clearConcertCache();

                console.log("Mint ticket processed successfully, returning result");

                // Ensure response has success flag
                return {
                    success: true,
                    ...result
                };

            } catch (fetchError) {
                // Clear timeout if not already done
                clearTimeout(timeoutId);

                console.error("Network/fetch error during mint:", fetchError);

                // Handle specific fetch errors
                if (fetchError.name === 'AbortError') {
                    return {
                        success: false,
                        msg: 'Request timed out while minting ticket. Please check your connection and try again.',
                        error: 'timeout'
                    };
                }

                if (fetchError.message.includes('Failed to fetch')) {
                    return {
                        success: false,
                        msg: 'Network error. Please check your internet connection and try again.',
                        error: 'network_error'
                    };
                }

                // Re-throw other fetch errors
                throw fetchError;
            }

        } catch (error) {
            console.error('Critical error in ApiService.mintTicket:', error);

            // Return structured error response for any uncaught errors
            return {
                success: false,
                msg: error.message || 'Unknown error during mint process',
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }
            };
        }
    }



    async getPendingConcerts() {
        try {
            console.log("Fetching pending concerts");

            // Check if we have valid token
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Authentication required');
            }

            const response = await fetch(`${this.baseUrl}/concerts/pending`, {
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch pending concerts: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (err) {
            console.error('Error fetching pending concerts:', err);
            throw err;
        }
    }
    // Verify a transaction on the blockchain
    async verifyTransaction(signature, expectedAmount = null, expectedRecipient = null) {
        try {
            console.log(`Verifying transaction: ${signature}`);

            const response = await fetch(`${this.baseUrl}/blockchain/verify-transaction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    signature,
                    expectedAmount,
                    expectedRecipient
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `Failed to verify transaction: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error verifying transaction:', error);
            return { valid: false, error: error.message };
        }
    }
    /**
 * Enhanced method to verify ticket with better error handling
 */
    async verifyTicket(ticketId) {
        try {
            console.log(`Verifying ticket: ${ticketId}`);
            const token = localStorage.getItem('auth_token');

            if (!token) {
                throw new Error('Authentication required for verifying tickets');
            }

            // Add retry logic
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                attempts++;
                try {
                    // Add timeout
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);

                    const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/verify`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': token
                        },
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);
                    console.log("Verify ticket response status:", response.status);

                    // Handle rate limiting
                    if (response.status === 429) {
                        console.warn(`Rate limit hit when verifying ticket (attempt ${attempts})`);
                        // Wait with exponential backoff before retry
                        const backoff = Math.min(1000 * Math.pow(1.5, attempts - 1), 5000);
                        await new Promise(resolve => setTimeout(resolve, backoff));
                        continue;
                    }

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.msg || `Failed to verify ticket: ${response.status}`);
                    }

                    return await response.json();
                } catch (err) {
                    console.error(`Error verifying ticket (attempt ${attempts}/${maxAttempts}):`, err.message);

                    // For timeouts, retry immediately
                    if (err.name === 'AbortError') {
                        console.warn('Ticket verification timed out');
                        if (attempts < maxAttempts) {
                            continue;
                        }
                    }

                    // For other errors, retry with delay if not on final attempt
                    if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                    } else {
                        throw err;
                    }
                }
            }

            throw new Error('Failed to verify ticket after multiple attempts');
        } catch (error) {
            console.error('Error verifying ticket:', error);
            throw error;
        }
    }
    // Update ticket with blockchain transaction
    async updateTicketTransaction(ticketId, transactionSignature) {
        try {
            console.log(`Updating ticket ${ticketId} with real blockchain transaction:`, transactionSignature);
            const token = localStorage.getItem('auth_token');

            if (!token) {
                throw new Error('Authentication required');
            }

            // Add timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            try {
                const response = await fetch(`${this.baseUrl}/blockchain/update-ticket-transaction`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    },
                    body: JSON.stringify({
                        ticketId,
                        transactionSignature
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const error = new Error(errorData.msg || `Failed to update ticket transaction: ${response.status}`);
                    error.status = response.status;
                    throw error;
                }

                return await response.json();
            } catch (fetchError) {
                clearTimeout(timeoutId);

                if (fetchError.name === 'AbortError') {
                    throw new Error('Request timed out while updating ticket transaction');
                }

                throw fetchError;
            }
        } catch (error) {
            console.error('Error updating ticket transaction:', error);
            throw error;
        }
    }

    /**
 * Enhanced transaction status check with retries and better error handling
 */
    async getTransactionStatus(signature) {
        try {
            console.log(`Getting transaction status for: ${signature}`);

            // Skip if signature is invalid format
            if (signature.startsWith('dummy_') ||
                signature.startsWith('added_') ||
                signature.startsWith('error_')) {
                return {
                    exists: false,
                    status: 'invalid',
                    message: 'Invalid signature format'
                };
            }

            // Cache key for storing transaction status
            const cacheKey = `tx_status_${signature}`;
            const cachedStatus = sessionStorage.getItem(cacheKey);

            // Use cache if available and recent (less than 5 minutes old)
            if (cachedStatus) {
                try {
                    const parsed = JSON.parse(cachedStatus);
                    const cacheAge = Date.now() - (parsed.timestamp || 0);

                    // Use cache if less than 5 minutes old
                    if (cacheAge < 300000) {
                        console.log(`Using cached transaction status for ${signature.slice(0, 8)}...`);
                        return parsed.data;
                    }
                } catch (e) {
                    console.warn('Error parsing cached status:', e);
                    // Continue with fresh request
                }
            }

            // Setup retry logic
            let attempts = 0;
            const maxAttempts = 3;
            let lastError = null;

            while (attempts < maxAttempts) {
                attempts++;
                try {
                    // Add timeout to prevent hanging request
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);

                    const response = await fetch(`${this.baseUrl}/blockchain/transaction/${signature}`, {
                        headers: this._getHeaders(),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    // Handle various response statuses
                    if (response.status === 404) {
                        return { exists: false, status: 'not_found' };
                    }

                    if (response.status === 429) {
                        console.warn(`Rate limit hit when fetching transaction status (attempt ${attempts})`);
                        // Wait with exponential backoff before retry
                        const backoff = Math.min(1000 * Math.pow(2, attempts - 1), 8000);
                        await new Promise(resolve => setTimeout(resolve, backoff));
                        continue;
                    }

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.msg || `Error getting transaction status: ${response.status}`);
                    }

                    const result = await response.json();

                    // Cache the result
                    sessionStorage.setItem(cacheKey, JSON.stringify({
                        timestamp: Date.now(),
                        data: result
                    }));

                    return result;
                } catch (err) {
                    lastError = err;
                    console.error(`Error getting transaction status (attempt ${attempts}/${maxAttempts}):`, err.message);

                    // Abort error means request timed out
                    if (err.name === 'AbortError') {
                        console.warn('Transaction status request timed out');
                        // Immediately retry for timeout, with a small delay
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    }

                    // For other errors, retry with increasing delay if not on final attempt
                    if (attempts < maxAttempts) {
                        const retryDelay = Math.min(1000 * Math.pow(1.5, attempts - 1), 5000);
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    }
                }
            }

            // If all attempts failed, return error
            return {
                error: lastError?.message || 'Failed to get transaction status after multiple attempts',
                exists: false
            };
        } catch (error) {
            console.error(`Error getting transaction status for ${signature}:`, error);
            return { error: error.message };
        }
    }


    clearAllUserTicketCaches() {
        console.log("Clearing all user ticket caches");

        // Hapus semua cache dengan pola 'my_tickets_*'
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('my_tickets_') || key === 'myTickets')) {
                localStorage.removeItem(key);
                console.log(`Removed cache: ${key}`);
            }
        }

        // Reset cache memory
        if (this.cache) {
            if (this.cache.tickets) this.cache.tickets = {};
            if (this.cache.myTickets) this.cache.myTickets = {};
        }

        // Hapus cache timestamp 
        localStorage.removeItem('my_tickets_last_update');
        localStorage.removeItem('user_tickets_timestamp');
    }


    /**
 * Memperbarui cache tempat duduk yang sudah dibeli
 * @param {string} concertId - ID konser
 * @param {string} sectionName - Nama section
 * @param {string} seatNumber - Nomor kursi
 * @returns {Promise<boolean>} Status operasi
 */
    async updateMintedSeatsCache(concertId, sectionName, seatNumber) {
        try {
            if (!concertId) {
                console.error("Missing concertId in updateMintedSeatsCache");
                return false;
            }

            // Normalize concertId to string
            const normalizedConcertId = concertId.toString();

            // Get minted seats from localStorage
            const cacheKey = `minted_seats_${normalizedConcertId}`;
            const cachedSeats = JSON.parse(localStorage.getItem(cacheKey) || '[]');

            // Format seat code: "SectionName-SeatNumber"
            const seatCode = seatNumber.includes('-') ? seatNumber : `${sectionName}-${seatNumber}`;

            // Add to cache if not already there
            if (!cachedSeats.includes(seatCode)) {
                cachedSeats.push(seatCode);
                localStorage.setItem(cacheKey, JSON.stringify(cachedSeats));
            }

            console.log(`Updated minted seats cache for concert ${normalizedConcertId}, added seat ${seatCode}`);

            // Refresh from API for consistency
            try {
                await this.getMintedSeats(normalizedConcertId);
            } catch (err) {
                console.warn("Could not refresh minted seats from API:", err);
            }

            return true;
        } catch (err) {
            console.error("Error updating minted seats cache:", err);
            return false;
        }
    }

    async getMintedSeats(concertId) {
        try {
            console.log(`🔍 Getting minted seats for concert: ${concertId}`);

            // ✅ FIX 1: Add timestamp for cache busting
            const timestamp = Date.now();

            // ✅ FIX 2: Correct API endpoint with /tickets/ prefix
            const apiUrl = `${this.baseUrl}/tickets/concerts/${concertId}/minted-seats?t=${timestamp}`;

            console.log(`📡 Fetching from: ${apiUrl}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            try {
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        // ✅ FIX 3: Add cache-busting headers
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    },
                    signal: controller.signal,
                    // ✅ FIX 4: Disable browser cache
                    cache: 'no-cache'
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                console.log('🎫 API Response:', data);

                const seats = data.seats || [];
                console.log(`✅ Found ${seats.length} minted seats: [${seats.join(', ')}]`);

                // ✅ FIX 5: Update cache with fresh data (optional - you can remove caching entirely)
                const cacheKey = `minted_seats_${concertId}`;
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(seats));
                    console.log(`💾 Updated cache for concert ${concertId}`);
                } catch (cacheErr) {
                    console.warn('Cache update failed:', cacheErr);
                }

                return {
                    success: true,
                    seats,
                    timestamp: data.timestamp,
                    source: 'api'
                };

            } catch (fetchError) {
                clearTimeout(timeoutId);

                console.error('❌ API fetch failed:', fetchError);

                // ✅ FIX 6: Only use cache as absolute last resort
                if (fetchError.name === 'AbortError') {
                    console.error('⏰ Request timed out');
                }

                // Try cache only if network completely failed
                const cacheKey = `minted_seats_${concertId}`;
                try {
                    const cachedSeats = JSON.parse(localStorage.getItem(cacheKey) || '[]');
                    if (cachedSeats && cachedSeats.length > 0) {
                        console.warn(`⚠️ Using cached data (${cachedSeats.length} seats) due to API failure`);
                        return {
                            success: true,
                            seats: cachedSeats,
                            source: 'cache_fallback',
                            warning: 'Using cached data due to API failure'
                        };
                    }
                } catch (cacheErr) {
                    console.error('Cache read failed:', cacheErr);
                }

                throw fetchError;
            }

        } catch (error) {
            console.error('❌ Error getting minted seats:', error);
            return {
                success: false,
                seats: [],
                error: error.message,
                source: 'error'
            };
        }
    }

    // ✅ BONUS: Add cache clearing method
    async clearMintedSeatsCache(concertId = null) {
        try {
            if (concertId) {
                // Clear specific concert cache
                const cacheKey = `minted_seats_${concertId}`;
                localStorage.removeItem(cacheKey);
                console.log(`🗑️ Cleared cache for concert ${concertId}`);
            } else {
                // Clear all minted seats cache
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.startsWith('minted_seats_')) {
                        localStorage.removeItem(key);
                    }
                });
                console.log('🗑️ Cleared all minted seats cache');
            }
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }

    // ✅ BONUS: Force refresh method
    async getMintedSeatsForceRefresh(concertId) {
        // Clear cache first, then get fresh data
        await this.clearMintedSeatsCache(concertId);
        return await this.getMintedSeats(concertId);
    }

    /**
 * Menghapus tiket
 * @param {string} ticketId - ID tiket yang akan dihapus
 * @returns {Promise<Object>} Hasil dari server
 */
    async deleteTicket(ticketId) {
        try {
            console.log(`Deleting ticket: ${ticketId}`);
            const token = localStorage.getItem('auth_token');

            if (!token) {
                throw new Error('Authentication required');
            }

            console.log(`Sending DELETE request to: ${this.baseUrl}/tickets/${ticketId}`);

            const response = await fetch(`${this.baseUrl}/tickets/${ticketId}`, {
                method: 'DELETE',
                headers: {
                    'x-auth-token': token
                }
            });

            console.log(`Delete response status: ${response.status}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `Failed to delete ticket: ${response.status}`);
            }

            const result = await response.json();
            console.log(`Delete result:`, result);

            return result;
        } catch (err) {
            console.error('Error deleting ticket:', err);
            throw err;
        }
    }


    /**
 * List ticket for sale di marketplace
 * @param {string} ticketId - ID tiket yang akan dijual
 * @param {number} price - Harga dalam SOL
 * @returns {Promise<Object>} Hasil dari server
 */
    async listTicketForSale(ticketId, price) {
        try {
            console.log(`Listing ticket ${ticketId} for sale at ${price} SOL`);

            // Validasi ticketId
            if (!ticketId) {
                console.error("Missing ticketId in listTicketForSale");
                return { success: false, msg: "Ticket ID diperlukan" };
            }

            // Konversi price ke number dan validasi
            let numericPrice;
            try {
                numericPrice = parseFloat(price);
                if (isNaN(numericPrice) || numericPrice <= 0) {
                    console.error("Invalid price in listTicketForSale:", price, "Parsed as:", numericPrice);
                    return { success: false, msg: "Harga yang valid diperlukan (harus lebih dari 0)" };
                }
            } catch (e) {
                console.error("Error parsing price:", e);
                return { success: false, msg: "Format harga tidak valid" };
            }

            // Dapatkan token autentikasi
            const token = localStorage.getItem('auth_token');
            if (!token) {
                console.error("No auth token available");
                return { success: false, msg: "Autentikasi diperlukan" };
            }

            // Buat payload yang akan dikirim
            const payload = { price: numericPrice };

            // Log untuk debugging
            console.log("Sending list ticket request with payload:", payload);
            console.log("Token:", token.substring(0, 15) + "...");
            console.log("Endpoint:", `${this.baseUrl}/tickets/${ticketId}/list`);

            // Kirim request ke API
            const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/list`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(payload)
            });

            // Log response status
            console.log("List ticket response status:", response.status);

            // Jika response bukan 2xx, tangani error
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Response error text:", errorText);

                // Coba parse sebagai JSON jika memungkinkan
                let errorData = {};
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    console.warn("Could not parse error response as JSON");
                }

                // Kirim informasi error yang lebih detail
                return {
                    success: false,
                    msg: errorData.msg || `Gagal mendaftarkan tiket: ${response.status}`,
                    statusCode: response.status,
                    error: errorData
                };
            }

            // Parse response JSON
            const result = await response.json();
            console.log("List ticket response:", result);

            // Bersihkan cache untuk memastikan data terbaru
            this.clearAllTicketCaches();

            return {
                success: true,
                ...result
            };
        } catch (error) {
            console.error('Error listing ticket for sale:', error);
            return {
                success: false,
                msg: error.message || "Terjadi kesalahan saat mendaftarkan tiket"
            };
        }
    }

    /**
 * Batalkan penjualan tiket di marketplace
 * @param {string} ticketId - ID tiket yang dibatalkan penjualannya
 * @returns {Promise<Object>} Hasil dari server
 */
    async cancelTicketListing(ticketId) {
        try {
            console.log(`Membatalkan listing untuk tiket ${ticketId}`);

            // Dapatkan token autentikasi
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Autentikasi diperlukan');
            }

            // Siapkan timeout untuk mencegah request hang
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            try {
                // Kirim request ke server API untuk membatalkan listing
                const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/list`, {
                    method: 'DELETE',
                    headers: {
                        'x-auth-token': token
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    // Coba parse error dari server
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.msg || `Gagal membatalkan listing: ${response.status}`);
                }

                // Parse response
                const result = await response.json();
                console.log("Hasil pembatalan listing:", result);

                // Hapus cache tiket untuk memastikan data segar
                this.clearAllTicketCaches();

                return {
                    success: true,
                    ...result
                };
            } catch (fetchError) {
                clearTimeout(timeoutId);

                // Handle timeout
                if (fetchError.name === 'AbortError') {
                    throw new Error('Request timeout saat membatalkan listing');
                }

                throw fetchError;
            }
        } catch (error) {
            console.error('Error membatalkan listing tiket:', error);
            return {
                success: false,
                msg: error.message || 'Gagal membatalkan listing tiket'
            };
        }
    }


    /**
 * Beli tiket dari marketplace
 * @param {string} ticketId - ID tiket yang akan dibeli
 * @param {string} transactionSignature - Signature transaksi blockchain untuk pembayaran
 * @returns {Promise<Object>} Hasil dari server
 */
    async buyTicket(ticketId, transactionSignature) {
        try {
            console.log(`Membeli tiket dengan ID: ${ticketId}`);
            console.log(`Signature transaksi: ${transactionSignature}`);

            // Validasi parameter
            if (!ticketId) {
                console.error("Missing ticketId parameter");
                return { success: false, msg: "Ticket ID is required" };
            }

            if (!transactionSignature) {
                console.error("Missing transactionSignature parameter");
                return { success: false, msg: "Transaction signature is required" };
            }

            // Dapatkan token autentikasi
            const token = localStorage.getItem('auth_token');
            if (!token) {
                console.error("No auth token available");
                return { success: false, msg: "Authentication required" };
            }

            // Siapkan payload request
            const payload = {
                transactionSignature: transactionSignature,
                timestamp: Date.now() // Untuk memastikan request unik
            };

            console.log("Request to buy ticket with data:", payload);

            // Siapkan timeout untuk mencegah request hang
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 detik untuk proses pembelian

            try {
                // Kirim request pembelian ke server API
                const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/buy`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                console.log("Buy ticket response status:", response.status);

                if (!response.ok) {
                    // Coba ambil error message dari response
                    let errorMsg = "Failed to buy ticket";
                    try {
                        const errorData = await response.json();
                        console.error("Server error response:", errorData);
                        errorMsg = errorData.msg || errorMsg;
                    } catch (parseErr) {
                        console.error("Could not parse error response:", parseErr);
                    }

                    throw new Error(errorMsg);
                }

                // Parse response
                const result = await response.json();
                console.log("Buy ticket successful:", result);

                // PERBAIKAN UTAMA: Hapus semua cache terkait tiket dan marketplace
                this.clearAllCaches();

                return {
                    success: true,
                    ...result
                };
            } catch (fetchError) {
                clearTimeout(timeoutId);

                // Handle timeout
                if (fetchError.name === 'AbortError') {
                    throw new Error('Request timeout saat membeli tiket. Jaringan mungkin sibuk, silakan coba lagi.');
                }

                throw fetchError;
            }
        } catch (error) {
            console.error('Error membeli tiket:', error);
            return {
                success: false,
                msg: error.message || 'Failed to buy ticket'
            };
        }
    }
    clearAllCaches() {
        console.log("Clearing all related caches...");

        // 1. Clear ticket caches
        this.clearAllTicketCaches();

        // 2. Clear concert cache
        this.clearConcertCache();

        // 3. Clear marketplace caches
        localStorage.removeItem('marketplaceTickets');
        localStorage.removeItem('marketplaceTickets_timestamp');

        // 4. Clear all minted seats caches
        const mintedSeatKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('minted_seats_')) {
                mintedSeatKeys.push(key);
            }
        }

        mintedSeatKeys.forEach(key => {
            localStorage.removeItem(key);
            console.log(`Removed cache: ${key}`);
        });

        // 5. Add timestamp to prevent immediate re-caching
        localStorage.setItem('cache_invalidation_timestamp', Date.now().toString());

        // 6. Hapus semua cache tiket untuk semua user
        this.clearAllUserTicketCaches();

        console.log("All caches cleared successfully");
    }

    async getMarketplaceStats() {
        try {
            const response = await fetch(`${this.baseUrl}/tickets/marketplace/stats`);

            if (!response.ok) {
                throw new Error(`Failed to get marketplace stats: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting marketplace stats:', error);
            throw error;
        }
    }
    async getTicketTransactionHistory(ticketId) {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Authentication required');
            }

            const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/history`, {
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get transaction history: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting transaction history:', error);
            throw error;
        }
    }
    /**
 * Enhanced method to get tickets available for sale in the marketplace
 * @param {string} concertId - Optional, filter tickets by concert
 * @returns {Promise<Array>} List of available tickets
 */
    async getTicketsForSale(concertId = null, forceRefresh = true) {
        try {
            console.log("Mendapatkan tiket yang tersedia di marketplace" + (forceRefresh ? " (forced refresh)" : ""));

            // Konstruksi URL dengan parameter
            let url = `${this.baseUrl}/tickets/market`;
            const params = [];

            if (concertId) {
                params.push(`concertId=${concertId}`);
            }

            if (forceRefresh) {
                params.push(`t=${Date.now()}`); // Cache buster
            }

            if (params.length > 0) {
                url += `?${params.join('&')}`;
            }

            // Cache check
            let useCache = false;

            if (!forceRefresh) {
                const cacheKey = 'marketplaceTickets';
                const cacheTimestamp = localStorage.getItem('marketplaceTickets_timestamp');
                const cacheData = localStorage.getItem(cacheKey);

                // Use cache if recent (less than 10 seconds old)
                if (cacheData && cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) < 10000) {
                    try {
                        const parsedData = JSON.parse(cacheData);
                        console.log(`Using cached marketplace data (${parsedData.length} tickets)`);
                        useCache = true;
                        return parsedData;
                    } catch (e) {
                        console.warn('Error parsing cache:', e);
                    }
                }
            }

            // Set timeout untuk mencegah request hang
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            try {
                // Tambahkan token autentikasi jika tersedia
                const headers = {
                    'Content-Type': 'application/json'
                };

                const token = localStorage.getItem('auth_token');
                if (token) {
                    headers['x-auth-token'] = token;
                }

                // Kirim request ke server API
                const response = await fetch(url, {
                    headers,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`Gagal mendapatkan tiket marketplace: ${response.status}`);
                }

                // Parse response
                const data = await response.json();
                const tickets = Array.isArray(data) ? data : (data.tickets || []);

                console.log(`Mendapatkan ${tickets.length} tiket dari marketplace`);

                // Simpan ke localStorage sebagai cadangan
                localStorage.setItem('marketplaceTickets', JSON.stringify(tickets));
                localStorage.setItem('marketplaceTickets_timestamp', Date.now().toString());

                return tickets;
            } catch (fetchError) {
                clearTimeout(timeoutId);

                // Handle timeout
                if (fetchError.name === 'AbortError') {
                    console.warn('Request timeout saat mendapatkan tiket marketplace');

                    // Coba ambil dari cache jika ada
                    const cached = localStorage.getItem('marketplaceTickets');
                    if (cached) {
                        try {
                            const tickets = JSON.parse(cached);
                            console.log(`Menggunakan ${tickets.length} tiket marketplace dari cache`);
                            return tickets;
                        } catch (e) {
                            console.error('Error parsing cache:', e);
                        }
                    }
                }

                throw fetchError;
            }
        } catch (error) {
            console.error('Error mendapatkan tiket marketplace:', error);

            // Coba ambil dari cache jika API gagal
            try {
                const cached = localStorage.getItem('marketplaceTickets');
                if (cached) {
                    const tickets = JSON.parse(cached);
                    console.log(`Menggunakan ${tickets.length} tiket marketplace dari cache (fallback)`);
                    return tickets;
                }
            } catch (cacheError) {
                console.error('Error reading marketplace cache:', cacheError);
            }

            // Kembalikan array kosong jika semua upaya gagal
            return [];
        }
    }
    /**
 * Enhanced verify ticket blockchain with better error handling
 */
    async verifyTicketBlockchain(ticketId) {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Authentication required');
            }

            // Set state for retries
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                attempts++;
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000);

                    const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/verify-blockchain`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': token
                        },
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    // Handle rate limiting
                    if (response.status === 429) {
                        console.warn(`Rate limit hit when verifying blockchain (attempt ${attempts})`);
                        // Wait with exponential backoff before retry
                        const backoff = Math.min(2000 * Math.pow(2, attempts - 1), 10000);
                        console.log(`Waiting ${backoff}ms before retrying...`);
                        await new Promise(resolve => setTimeout(resolve, backoff));
                        continue;
                    }

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.msg || `Failed to verify blockchain: ${response.status}`);
                    }

                    return await response.json();
                } catch (err) {
                    console.error(`Error verifying blockchain (attempt ${attempts}/${maxAttempts}):`, err.message);

                    // For timeouts, retry immediately
                    if (err.name === 'AbortError') {
                        console.warn('Blockchain verification request timed out');
                        if (attempts < maxAttempts) {
                            continue;
                        }
                    }

                    // For other errors, retry with delay if not on final attempt
                    if (attempts < maxAttempts) {
                        const retryDelay = 1000 * attempts;
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    } else {
                        throw err; // Rethrow on final attempt
                    }
                }
            }

            throw new Error('Failed to verify blockchain after multiple attempts');
        } catch (error) {
            console.error('Error verifying blockchain:', error);
            throw error;
        }
    }
    async reserveSeat(seatData) {
        try {
            const response = await fetch(`${this.baseUrl}/tickets/reserve-seat`, {
                method: 'POST',
                headers: this._getHeaders(),
                body: JSON.stringify(seatData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || 'Failed to reserve seat');
            }

            return await response.json();
        } catch (error) {
            console.error('Error reserving seat:', error);
            throw error;
        }
    }

    async releaseSeat(seatData) {
        try {
            const response = await fetch(`${this.baseUrl}/tickets/reserve-seat`, {
                method: 'DELETE',
                headers: this._getHeaders(),
                body: JSON.stringify(seatData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || 'Failed to release seat');
            }

            return await response.json();
        } catch (error) {
            console.error('Error releasing seat:', error);
            throw error;
        }
    }
    // Get royalty calculation
    async calculateRoyalty(ticketId, royaltyPercentage = 5) {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Authentication required');
            }

            const response = await fetch(`${this.baseUrl}/tickets/calculate-royalty`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ ticketId, royaltyPercentage })
            });

            if (!response.ok) {
                throw new Error(`Failed to calculate royalty: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error calculating royalty:', error);
            throw error;
        }
    }

    // Enhanced error handling for all API calls
    async _makeRequest(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || errorData.message || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please check your connection and try again.');
            }

            throw error;
        }
    }

}

export default new ApiService();