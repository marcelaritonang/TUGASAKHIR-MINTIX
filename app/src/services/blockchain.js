// src/services/blockchain.js - COMPLETE ENHANCED VERSION
import {
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    LAMPORTS_PER_SOL,
    clusterApiUrl
} from '@solana/web3.js';

class BlockchainService {
    constructor() {
        // Enhanced RPC configuration with multiple endpoints for reliability
        this.rpcUrls = [
            process.env.REACT_APP_SOLANA_RPC_URL,
            'https://api.testnet.solana.com',
            'https://testnet.solana.com',
            'https://rpc.ankr.com/solana_testnet',
            'https://solana-testnet.g.alchemy.com/v2/demo',
            'https://api.testnet.solanabeach.io/v1/',
            'https://testnet-solana.api.onfinality.io/public',
            clusterApiUrl('testnet')
        ].filter(Boolean); // Remove undefined values

        // Add some randomization to initial RPC selection to avoid all clients hitting same endpoint
        if (this.rpcUrls.length > 1) {
            this.currentRpcIndex = Math.floor(Math.random() * this.rpcUrls.length);
        } else {
            this.currentRpcIndex = 0;
        }

        this.rpcUrl = this.rpcUrls[this.currentRpcIndex];
        this.connection = null;

        // Enhanced cache management with size limits
        this.balanceCache = new Map();
        this.lastBalanceCheck = new Map();
        this.transactionCache = new Map();
        this.cacheTime = 30000; // 30 seconds
        this.maxCacheSize = 1000; // Prevent memory leaks

        // RPC state tracking
        this._isSwitchingRpc = false;
        this._lastRpcSwitch = 0;
        this._successfulEndpoints = new Set();

        // Connection state tracking
        this.connectionTested = false;
        this.isConnected = false;
        this.lastHealthCheck = 0;
        this.healthCheckInterval = 300000; // 5 minutes

        // Performance monitoring
        this.requestCounters = {
            balance: 0,
            transaction: 0,
            confirmation: 0,
            errors: 0,
            rpcSwitches: 0,
            rateLimits: 0
        };

        // Rate limiting tracking
        this.rateLimitBackoffs = {
            lastBackoff: 0,
            consecutiveRateLimits: 0,
            currentBackoffMs: 1000 // Start with 1 second
        };

        // Initialize connection
        this.initializeConnection();
        this.testConnection();

        // Setup periodic health checking
        this._setupHealthChecking();
    }

    /**
     * Setup periodic health checking to proactively detect RPC issues
     */
    _setupHealthChecking() {
        // Perform initial health check after short delay
        setTimeout(() => {
            this.testConnection().then(isHealthy => {
                console.log(`Initial RPC health check: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);

                // If unhealthy, try switching
                if (!isHealthy) {
                    this.switchRpcEndpoint(true).then(switched => {
                        console.log(`Initial RPC switch result: ${switched ? '✅ Switched' : '❌ Failed to switch'}`);
                    });
                }
            });
        }, 5000);

        // Setup periodic health checking (every 5 minutes)
        this._healthCheckInterval = setInterval(async () => {
            const isHealthy = await this.testConnection();
            console.log(`Periodic RPC health check: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);

            // If unhealthy, try switching
            if (!isHealthy) {
                const switched = await this.switchRpcEndpoint(true);
                console.log(`RPC switch result: ${switched ? '✅ Switched' : '❌ Failed to switch'}`);
            }
        }, this.healthCheckInterval);
    }

    /**
     * Initialize connection with automatic failover
     */
    initializeConnection() {
        let success = false;

        for (let i = 0; i < this.rpcUrls.length; i++) {
            try {
                this.currentRpcIndex = i;
                this.rpcUrl = this.rpcUrls[i];
                this.connection = new Connection(this.rpcUrl, {
                    commitment: 'confirmed',
                    confirmTransactionInitialTimeout: 60000,
                    disableRetryOnRateLimit: false,
                    wsEndpoint: this.rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://'),
                    httpHeaders: {
                        'User-Agent': 'ConcertNFTTicketing/1.0',
                        'X-Client-Version': '1.0.0'
                    }
                });

                console.log(`🌐 Connected to Solana RPC [${i + 1}/${this.rpcUrls.length}]: ${this.rpcUrl}`);
                success = true;
                break;
            } catch (err) {
                console.warn(`❌ Failed to connect to RPC ${this.rpcUrl}:`, err.message);
            }
        }

        if (!success) {
            console.error('❌ Failed to connect to any Solana RPC endpoint');
            // Use default as last fallback
            this.rpcUrl = 'https://api.testnet.solana.com';
            this.connection = new Connection(this.rpcUrl, {
                commitment: 'confirmed',
                httpHeaders: {
                    'User-Agent': 'ConcertNFTTicketing/1.0'
                }
            });
        }
    }

    /**
     * Enhanced RPC endpoint switching with exponential backoff and rate limiting protection
     */
    async switchRpcEndpoint(forced = false) {
        // If already switching or not forced, use backoff delay
        if (this._isSwitchingRpc && !forced) {
            console.log('⏳ RPC switch already in progress, waiting...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            return false;
        }

        try {
            this._isSwitchingRpc = true;
            const oldIndex = this.currentRpcIndex;

            // Add exponential backoff for RPC switches to prevent thrashing
            const lastSwitchTime = this._lastRpcSwitch || 0;
            const timeSinceLastSwitch = Date.now() - lastSwitchTime;
            const minSwitchDelay = Math.min(
                1000 * Math.pow(1.5, Math.min(5, this.requestCounters.rpcSwitches % 10)),
                10000
            );

            if (timeSinceLastSwitch < minSwitchDelay && !forced) {
                console.log(`⏳ Applying backoff before RPC switch: ${minSwitchDelay}ms`);
                await new Promise(resolve => setTimeout(resolve, minSwitchDelay));
            }

            // Round-robin rotation through available RPC endpoints
            this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcUrls.length;
            this.requestCounters.rpcSwitches++;
            this._lastRpcSwitch = Date.now();

            // Set up new connection with appropriate parameters
            try {
                this.rpcUrl = this.rpcUrls[this.currentRpcIndex];
                this.connection = new Connection(this.rpcUrl, {
                    commitment: 'confirmed',
                    confirmTransactionInitialTimeout: 60000,
                    disableRetryOnRateLimit: false,
                    wsEndpoint: this.rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://'),
                    httpHeaders: {
                        'User-Agent': 'ConcertNFTTicketing/1.0',
                        'X-Client-Version': '1.0.0'
                    }
                });

                // Test new connection
                await Promise.race([
                    this.connection.getVersion(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Connection timeout')), 5000)
                    )
                ]);

                console.log(`🔄 Switched RPC from [${oldIndex + 1}] to [${this.currentRpcIndex + 1}]: ${this.rpcUrl}`);

                // Record successful endpoints to prioritize later
                if (!this._successfulEndpoints) this._successfulEndpoints = new Set();
                this._successfulEndpoints.add(this.currentRpcIndex);

                // Reset rate limit counter when switching endpoints
                this.rateLimitBackoffs.consecutiveRateLimits = 0;

                return true;
            } catch (err) {
                console.error(`❌ Failed to switch to RPC [${this.currentRpcIndex + 1}]:`, err.message);

                // If we couldn't connect to this endpoint, try another one
                if (this.rpcUrls.length > 2) {
                    console.log('Trying next endpoint...');
                    return await this.switchRpcEndpoint(true);
                }

                return false;
            }
        } finally {
            this._isSwitchingRpc = false;
        }
    }

    /**
     * Enhanced connection test with health check
     */
    async testConnection() {
        try {
            const now = Date.now();

            // Skip if recent health check passed
            if (this.connectionTested && this.isConnected &&
                (now - this.lastHealthCheck) < this.healthCheckInterval) {
                return this.isConnected;
            }

            console.log(`🔍 Testing connection to RPC [${this.currentRpcIndex + 1}]: ${this.rpcUrl}`);

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timeout')), 10000)
            );

            const versionPromise = this.connection.getVersion()
                .catch(err => {
                    console.error("Error getting version:", err);
                    return null;
                });

            const version = await Promise.race([versionPromise, timeoutPromise])
                .catch(async (err) => {
                    console.error("Connection test failed:", err);

                    // Try to switch RPC if connection fails
                    const switched = await this.switchRpcEndpoint();
                    if (switched) {
                        // Retry test with new RPC
                        try {
                            return await this.connection.getVersion();
                        } catch (retryErr) {
                            console.error("Retry with new RPC also failed:", retryErr);
                            return null;
                        }
                    }
                    return null;
                });

            this.isConnected = !!version;
            this.connectionTested = true;
            this.lastHealthCheck = now;

            if (this.isConnected) {
                console.log(`✅ Connected to Solana. Version: ${JSON.stringify(version)}`);
            } else {
                console.error("❌ Failed to connect to Solana network");
            }

            return this.isConnected;
        } catch (err) {
            console.error('❌ Error testing Solana connection:', err);
            this.connectionTested = true;
            this.isConnected = false;
            this.lastHealthCheck = Date.now();
            return false;
        }
    }

    /**
     * Enhanced method to handle 429 Too Many Requests errors
     */
    async handleRateLimiting(err, context = 'operation', retryAttempt = 0) {
        // Check if error is rate limit related
        const isRateLimit = err.message.includes('429') ||
            err.message.toLowerCase().includes('rate limit') ||
            err.message.toLowerCase().includes('too many requests');

        if (!isRateLimit) {
            return false; // Not a rate limiting error
        }

        // Increment counters
        this.requestCounters.rateLimits++;
        this.rateLimitBackoffs.consecutiveRateLimits++;

        console.warn(`⚠️ Rate limit hit during ${context} (attempt ${retryAttempt + 1}, consecutive: ${this.rateLimitBackoffs.consecutiveRateLimits})`);

        // Get retry delay from error if available
        let retryAfter = 0;
        if (err.response && err.response.headers && err.response.headers['retry-after']) {
            retryAfter = parseInt(err.response.headers['retry-after'], 10) * 1000;
        }

        // Exponential backoff with jitter for rate limit errors
        const baseDelay = retryAfter || 1000; // Start with 1 second or server-specified delay
        const maxDelay = 15000; // Max 15 seconds
        const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15 randomization factor

        // Increase backoff based on consecutive rate limits
        const consecutiveFactor = Math.min(Math.pow(1.5, this.rateLimitBackoffs.consecutiveRateLimits - 1), 5);

        const delay = Math.min(
            baseDelay * Math.pow(1.5, retryAttempt) * jitter * consecutiveFactor,
            maxDelay
        );

        // Update last backoff time
        this.rateLimitBackoffs.lastBackoff = Date.now();
        this.rateLimitBackoffs.currentBackoffMs = delay;

        console.log(`🕒 Rate limit backoff: waiting ${Math.round(delay)}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Try to switch RPC endpoints if we've hit rate limits multiple times
        if (this.rateLimitBackoffs.consecutiveRateLimits > 1 || retryAttempt > 0) {
            console.log("Multiple rate limits hit, switching RPC endpoint");
            await this.switchRpcEndpoint();
        }

        return true; // Handled rate limiting
    }

    /**
     * Manage cache size to prevent memory leaks
     */
    _manageCache(cacheMap, maxSize = this.maxCacheSize) {
        if (cacheMap.size >= maxSize) {
            // Remove oldest entries (LRU-like behavior)
            const keysToDelete = Math.floor(maxSize * 0.1); // Remove 10% of cache
            const keys = Array.from(cacheMap.keys()).slice(0, keysToDelete);

            keys.forEach(key => cacheMap.delete(key));
            console.log(`🧹 Cleaned ${keysToDelete} entries from cache. Size: ${cacheMap.size}`);
        }
    }

    /**
     * Create standardized error response
     */
    _createErrorResponse(error, retry = false, code = null) {
        this.requestCounters.errors++;

        return {
            success: false,
            error: error.message,
            code: code || this._getErrorCode(error),
            retry,
            timestamp: new Date().toISOString(),
            rpcEndpoint: this.rpcUrl
        };
    }

    /**
     * Get error code for categorization
     */
    _getErrorCode(error) {
        if (error.name === 'AbortError') return 'TIMEOUT';
        if (error.message.includes('429')) return 'RATE_LIMITED';
        if (error.message.includes('insufficient')) return 'INSUFFICIENT_FUNDS';
        if (error.message.includes('rejected')) return 'USER_REJECTED';
        if (error.message.includes('Invalid')) return 'INVALID_INPUT';
        if (error.message.includes('timeout')) return 'NETWORK_TIMEOUT';
        if (error.message.includes('Connection')) return 'CONNECTION_ERROR';
        return 'UNKNOWN_ERROR';
    }

    /**
     * Enhanced balance retrieval with failover
     */
    async getSolanaBalance(publicKey) {
        try {
            this.requestCounters.balance++;

            if (!publicKey) {
                throw new Error('Public key required');
            }

            const keyStr = publicKey.toString();
            const now = Date.now();

            // Use cache if still valid
            if (
                this.balanceCache.has(keyStr) &&
                this.lastBalanceCheck.has(keyStr) &&
                (now - this.lastBalanceCheck.get(keyStr)) < this.cacheTime
            ) {
                console.log(`💰 Using cached balance for ${keyStr.slice(0, 8)}...`);
                return this.balanceCache.get(keyStr);
            }

            console.log(`💰 Fetching fresh balance for ${keyStr.slice(0, 8)}...`);

            let balance;
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);

                    balance = await this.connection.getBalance(new PublicKey(publicKey), {
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    break;
                } catch (fetchErr) {
                    attempts++;
                    console.warn(`Balance fetch attempt ${attempts}/${maxAttempts} failed:`, fetchErr.message);

                    // Handle rate limiting
                    if (fetchErr.message.includes('429')) {
                        await this.handleRateLimiting(fetchErr, 'balance fetch', attempts);
                        continue;
                    }

                    if (fetchErr.name === 'AbortError' || fetchErr.message.includes('timeout')) {
                        if (attempts < maxAttempts) {
                            // Try switching RPC
                            await this.switchRpcEndpoint();
                            continue;
                        }

                        // Return cached value if available
                        if (this.balanceCache.has(keyStr)) {
                            console.log('⚠️ Using cached balance due to timeout');
                            return this.balanceCache.get(keyStr);
                        }
                    }

                    if (attempts >= maxAttempts) {
                        throw fetchErr;
                    }
                }
            }

            const solBalance = balance / LAMPORTS_PER_SOL;

            // Update cache and manage size
            this.balanceCache.set(keyStr, solBalance);
            this.lastBalanceCheck.set(keyStr, now);
            this._manageCache(this.balanceCache);

            return solBalance;
        } catch (err) {
            console.error('❌ Error getting Solana balance:', err);
            throw this._createErrorResponse(err, true);
        }
    }

    /**
     * Enhanced transaction verification with retry and error handling
     */
    async isTransactionValid(signature) {
        try {
            // Skip invalid signature formats
            if (signature.startsWith('dummy_') ||
                signature.startsWith('added_') ||
                signature.startsWith('error_')) {
                return false;
            }

            let attempts = 0;
            const maxAttempts = 5; // Increased max attempts
            let consecutiveErrors = 0;

            while (attempts < maxAttempts) {
                attempts++;
                console.log(`Verifying transaction ${signature.slice(0, 8)}... (Attempt ${attempts}/${maxAttempts})`);

                try {
                    // Use timeout to prevent hanging requests
                    const txData = await Promise.race([
                        this.getTxData(signature),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Request timed out')), 15000)
                        )
                    ]);

                    // Reset consecutive error counter on success
                    consecutiveErrors = 0;

                    if (!txData) {
                        console.log(`Transaction not found (attempt ${attempts}/${maxAttempts})`);

                        // If on last attempt, return false
                        if (attempts >= maxAttempts) {
                            return false;
                        }

                        // Wait before retry with increasing delay
                        const retryDelay = Math.min(1000 * Math.pow(1.5, attempts - 1), 8000);
                        console.log(`Waiting ${retryDelay}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                        continue;
                    }

                    // Transaction is valid if it exists and has no errors
                    const isValid = !txData.meta?.err;
                    console.log(`✓ Transaction ${signature.slice(0, 8)}... validity: ${isValid}`);
                    return isValid;
                } catch (err) {
                    consecutiveErrors++;
                    console.error(`❌ Error checking transaction validity for ${signature} (attempt ${attempts}/${maxAttempts}):`, err.message);

                    // Handle rate limiting explicitly
                    const isRateLimited = await this.handleRateLimiting(err, 'transaction validation', attempts);

                    // If it's a timeout or network error but not rate limited, try switching RPC
                    if (!isRateLimited && (err.name === 'AbortError' || err.message.includes('timeout') || err.message.includes('network'))) {
                        console.log('Timeout or network error, switching RPC endpoint...');
                        await this.switchRpcEndpoint();
                    }

                    // Add increasing delay between retries based on consecutive errors
                    const errorBackoff = Math.min(2000 * Math.pow(1.5, consecutiveErrors - 1), 10000);
                    console.log(`Applying error backoff: ${errorBackoff}ms`);
                    await new Promise(resolve => setTimeout(resolve, errorBackoff));

                    // If on last attempt, return false
                    if (attempts >= maxAttempts) {
                        return false;
                    }
                }
            }

            return false; // Default to false if all attempts failed
        } catch (err) {
            console.error(`❌ Fatal error checking transaction validity for ${signature}:`, err);
            return false;
        }
    }

    /**
     * Get transaction data with caching
     */
    async getTxData(signature) {
        try {
            this.requestCounters.transaction++;

            // Check cache first
            if (this.transactionCache.has(signature)) {
                const cachedTx = this.transactionCache.get(signature);
                // Only use cache if less than 5 minutes old
                if (Date.now() - cachedTx.timestamp < 300000) {
                    console.log(`💾 Using cached transaction data for ${signature.slice(0, 8)}...`);
                    return cachedTx.rawData;
                }
            }

            console.log(`🔍 Getting transaction data for: ${signature.slice(0, 8)}...`);

            // Skip invalid signature formats
            if (
                signature.startsWith('dummy_') ||
                signature.startsWith('added_') ||
                signature.startsWith('error_')
            ) {
                return null;
            }

            let tx = null;
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000);

                    tx = await this.connection.getTransaction(signature, {
                        commitment: 'confirmed',
                        maxSupportedTransactionVersion: 0,
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (tx) break;

                    // Handle not found but no error
                    if (attempts < maxAttempts - 1) {
                        console.log(`Transaction not found in attempt ${attempts + 1}, retrying...`);
                        await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1)));
                    }
                } catch (err) {
                    attempts++;
                    console.warn(`Transaction fetch attempt ${attempts}/${maxAttempts} failed:`, err.message);

                    // Handle rate limiting
                    if (err.message.includes('429')) {
                        await this.handleRateLimiting(err, 'transaction fetch', attempts);
                        continue;
                    }

                    if (err.name === 'AbortError' && attempts < maxAttempts) {
                        await this.switchRpcEndpoint();
                        continue;
                    }

                    if (attempts >= maxAttempts) {
                        if (err.name === 'AbortError') {
                            throw new Error('Request timed out');
                        }
                        throw err;
                    }
                }

                attempts++;
            }

            // Save to cache if found
            if (tx) {
                this.transactionCache.set(signature, {
                    signature,
                    timestamp: Date.now(),
                    rawData: tx
                });
                this._manageCache(this.transactionCache);
            }

            return tx;
        } catch (err) {
            console.error(`❌ Error fetching transaction ${signature}:`, err);
            throw err;
        }
    }

    /**
     * Enhanced transaction details retrieval with improved error handling
     */
    async getTransactionDetails(signature) {
        try {
            // Skip invalid signature formats
            if (!signature ||
                signature.startsWith('dummy_') ||
                signature.startsWith('added_') ||
                signature.startsWith('error_')) {
                return {
                    exists: false,
                    valid: false,
                    message: 'Invalid transaction signature format'
                };
            }

            let txData = null;
            let attempts = 0;
            const maxAttempts = 5; // Increased max attempts
            let lastError = null;
            let consecutiveErrors = 0;

            while (attempts < maxAttempts) {
                attempts++;

                try {
                    console.log(`Getting transaction details for ${signature.slice(0, 8)}... (Attempt ${attempts}/${maxAttempts})`);

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000);

                    try {
                        txData = await this.connection.getTransaction(signature, {
                            commitment: 'confirmed',
                            maxSupportedTransactionVersion: 0,
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);

                        // Reset consecutive error counter on success
                        consecutiveErrors = 0;

                        if (txData) {
                            console.log(`✅ Successfully retrieved transaction data for ${signature.slice(0, 8)}...`);
                            break;
                        }

                        // If transaction not found but no error thrown, wait and retry
                        if (attempts < maxAttempts) {
                            const retryDelay = 1000 * Math.min(attempts, 3);
                            console.log(`Transaction not found, retrying in ${retryDelay}ms (attempt ${attempts}/${maxAttempts})...`);
                            await new Promise(resolve => setTimeout(resolve, retryDelay));
                        }
                    } catch (err) {
                        clearTimeout(timeoutId);
                        consecutiveErrors++;
                        lastError = err;

                        // Handle timeout error
                        if (err.name === 'AbortError') {
                            console.warn(`Transaction fetch timed out (attempt ${attempts}/${maxAttempts})`);

                            if (attempts < maxAttempts) {
                                // Try switching RPC endpoints on timeout
                                await this.switchRpcEndpoint();
                                // Additional delay after endpoint switch
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                continue;
                            }
                        }

                        // Handle rate limiting
                        if (err.message.includes('429') || err.message.toLowerCase().includes('rate')) {
                            await this.handleRateLimiting(err, 'transaction fetch', attempts);
                            continue;
                        }

                        // Apply increasing backoff for consecutive errors
                        const errorBackoff = Math.min(2000 * Math.pow(1.5, consecutiveErrors - 1), 10000);
                        console.log(`Error backoff: ${errorBackoff}ms`);
                        await new Promise(resolve => setTimeout(resolve, errorBackoff));

                        // For other errors, throw on final attempt
                        if (attempts >= maxAttempts) {
                            throw err;
                        }
                    }
                } catch (retryErr) {
                    lastError = retryErr;

                    console.warn(`Transaction fetch attempt ${attempts}/${maxAttempts} failed:`, retryErr.message);

                    // If not on last attempt, try again
                    if (attempts < maxAttempts) {
                        // Try switching RPC endpoints
                        await this.switchRpcEndpoint();
                        continue;
                    }

                    // On last attempt with persistent error, throw
                    throw retryErr;
                }
            }

            // Handle case where transaction is not found after all attempts
            if (!txData) {
                return {
                    exists: false,
                    message: lastError ?
                        `Transaction not found: ${lastError.message}` :
                        `Transaction not found after ${maxAttempts} attempts`,
                    signature
                };
            }

            // Process the transaction data to extract details
            const blockTime = txData.blockTime ? new Date(txData.blockTime * 1000) : null;
            const slot = txData.slot;
            const confirmations = txData.confirmations || 'finalized';
            let fee = (txData.meta?.fee || 0) / LAMPORTS_PER_SOL;
            let from = '';
            let to = '';
            let amount = 0;

            // Extract transaction details
            if (txData.meta && txData.transaction) {
                const accountKeys = txData.transaction.message.accountKeys;
                if (accountKeys.length > 0) {
                    from = accountKeys[0].toString();
                }

                // Improved recipient detection for SOL transfers
                const instructions = txData.transaction.message.instructions;
                const systemProgramId = '11111111111111111111111111111111';

                for (const ix of instructions) {
                    if (ix.programId?.toString() === systemProgramId) {
                        // For SOL transfers, the second account index is typically the recipient
                        if (ix.accounts && ix.accounts.length >= 2) {
                            const recipientIndex = ix.accounts[1];
                            if (recipientIndex < accountKeys.length) {
                                to = accountKeys[recipientIndex].toString();
                                break;
                            }
                        }
                    }
                }

                // Fallback recipient detection
                if (!to && accountKeys.length > 1) {
                    to = accountKeys[1].toString();
                }

                // Enhanced amount calculation from balance changes
                if (txData.meta.preBalances && txData.meta.postBalances && from) {
                    const senderIndex = accountKeys.findIndex(key => key.toString() === from);
                    if (senderIndex !== -1 && senderIndex < txData.meta.preBalances.length) {
                        const preBalance = txData.meta.preBalances[senderIndex];
                        const postBalance = txData.meta.postBalances[senderIndex];
                        const transferFee = txData.meta.fee || 0;

                        // Calculate amount in SOL (excluding fees)
                        // Calculate amount in SOL (excluding fees)
                        amount = Math.max(0, (preBalance - postBalance - transferFee) / LAMPORTS_PER_SOL);
                    }
                }
            }

            // Save to cache for future use
            this.transactionCache.set(signature, {
                signature,
                timestamp: Date.now(),
                rawData: txData
            });
            this._manageCache(this.transactionCache);

            return {
                exists: true,
                valid: !txData.meta?.err,
                status: txData.meta?.err ? 'failed' : 'success',
                blockTime,
                slot,
                confirmations,
                fee,
                from,
                to,
                value: parseFloat(amount.toFixed(9)), // 9 decimals for SOL precision
                signature,
                lamports: Math.round(amount * LAMPORTS_PER_SOL),
                isSolTransfer: true // Will be verified by caller if needed
            };
        } catch (err) {
            console.error(`❌ Error getting transaction details for ${signature}:`, err);

            // For network errors, return a recoverable error
            if (err.name === 'TypeError' || err.message.includes('network') || err.message.includes('connect')) {
                return {
                    exists: false,
                    networkError: true,
                    recoverable: true,
                    error: `Network error: ${err.message}`,
                    signature
                };
            }

            // For other errors, return standard error
            return {
                exists: false,
                error: err.message,
                signature
            };
        }
    }

    /**
     * Improved transaction status check with rate limiting handling
     */
    async getTransactionStatus(signature) {
        try {
            console.log(`🔍 Checking transaction status: ${signature.slice(0, 8)}...`);

            // Skip invalid signature formats
            if (
                !signature ||
                signature.startsWith('dummy_') ||
                signature.startsWith('added_') ||
                signature.startsWith('error_')
            ) {
                return {
                    exists: false,
                    confirmed: false,
                    status: 'invalid',
                    message: 'Invalid transaction signature format'
                };
            }

            let status = null;
            let attempts = 0;
            const maxAttempts = 4; // Increased for better retry chances

            while (attempts < maxAttempts) {
                attempts++;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);

                    try {
                        status = await this.connection.getSignatureStatus(signature, {
                            searchTransactionHistory: true,
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);
                        break;
                    } catch (err) {
                        clearTimeout(timeoutId);

                        // Handle timeout
                        if (err.name === 'AbortError') {
                            console.warn(`Status check timed out (attempt ${attempts}/${maxAttempts})`);

                            if (attempts < maxAttempts) {
                                await this.switchRpcEndpoint();
                                // Additional delay after RPC switch
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                continue;
                            }

                            throw new Error('Request timed out checking transaction status');
                        }

                        // Handle rate limiting
                        if (err.message.includes('429') || err.message.toLowerCase().includes('rate')) {
                            const handled = await this.handleRateLimiting(err, 'status check', attempts);
                            if (handled) continue;
                        }

                        // For other errors, throw if on last attempt
                        if (attempts >= maxAttempts) {
                            throw err;
                        }

                        // Add delay before retry
                        const retryDelay = 1000 * Math.pow(1.2, attempts - 1);
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    }
                } catch (err) {
                    console.warn(`Status check attempt ${attempts}/${maxAttempts} failed:`, err.message);

                    // If not on last attempt, try switching RPC
                    if (attempts < maxAttempts) {
                        await this.switchRpcEndpoint();
                        // Add additional delay
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                        continue;
                    }

                    // On last attempt, throw
                    throw err;
                }
            }

            if (!status || !status.value) {
                return {
                    exists: false,
                    confirmed: false,
                    status: 'not_found'
                };
            }

            return {
                exists: true,
                confirmed: status.value.confirmationStatus === 'confirmed' ||
                    status.value.confirmationStatus === 'finalized',
                status: status.value.confirmationStatus || 'unknown',
                confirmations: status.value.confirmations || 0,
                err: status.value.err ? true : false,
                slot: status.value.slot
            };
        } catch (error) {
            console.error('❌ Error checking transaction status:', error);

            // If error is rate limiting related, return a more specific error
            if (error.message.includes('429') || error.message.toLowerCase().includes('rate limit')) {
                return {
                    rateLimited: true,
                    error: 'Rate limited by RPC, try again later',
                    retryAfter: 5000 // Suggest a retry delay
                };
            }

            return { error: error.message };
        }
    }

    /**
     * Enhanced SOL transfer verification
     */
    async isSolTransfer(signature, expectedAmount = null, expectedRecipient = null) {
        try {
            // Skip invalid signature formats
            if (signature.startsWith('dummy_') ||
                signature.startsWith('added_') ||
                signature.startsWith('error_')) {
                return false;
            }

            // Set retry and timeout handling
            let attempts = 0;
            const maxAttempts = 3;
            let txData = null;

            while (attempts < maxAttempts && !txData) {
                attempts++;
                try {
                    txData = await Promise.race([
                        this.getTxData(signature),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Request timed out')), 15000)
                        )
                    ]);
                } catch (err) {
                    console.warn(`SOL transfer check attempt ${attempts}/${maxAttempts} failed:`, err.message);

                    // Handle rate limiting
                    if (err.message.includes('429')) {
                        await this.handleRateLimiting(err, 'SOL transfer check', attempts);
                        continue;
                    }

                    // For timeout or network errors, try switching RPC
                    if (err.name === 'AbortError' || err.message.includes('network')) {
                        await this.switchRpcEndpoint();
                    }

                    // If on last attempt, stop trying
                    if (attempts >= maxAttempts) {
                        console.error(`Failed to verify SOL transfer after ${maxAttempts} attempts`);
                        return true; // Be permissive if we can't verify
                    }

                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                }
            }

            if (!txData || !txData.meta || !txData.transaction) {
                return false;
            }

            // Check for balance changes as indicator of transfer
            if (txData.meta.preBalances && txData.meta.postBalances) {
                const hasBalanceChanges = txData.meta.preBalances.some((pre, index) => {
                    const post = txData.meta.postBalances[index];
                    return pre !== post;
                });

                if (hasBalanceChanges) {
                    console.log("✓ Transaction has balance changes, considering as valid transfer");

                    // If expectedAmount and recipient are provided, do additional validation
                    if (expectedAmount !== null || expectedRecipient !== null) {
                        try {
                            const txDetails = await this.getTransactionDetails(signature);

                            // Check amount if expected amount provided
                            if (expectedAmount !== null) {
                                const txAmount = txDetails.value || 0;
                                const tolerance = 0.005; // Allow small difference for fees

                                if (Math.abs(txAmount - expectedAmount) > tolerance) {
                                    console.warn(`❌ Transaction amount ${txAmount} doesn't match expected ${expectedAmount}`);
                                    return false;
                                }
                            }

                            // Check recipient if provided
                            if (expectedRecipient !== null && txDetails.to !== expectedRecipient) {
                                console.warn(`❌ Transaction recipient ${txDetails.to} doesn't match expected ${expectedRecipient}`);
                                return false;
                            }
                        } catch (err) {
                            console.error("❌ Error checking transaction details:", err);
                            // Continue, but consider the transfer valid by default
                        }
                    }

                    return true;
                }
            }

            // Check transaction instructions for System Program transfers
            const instructions = txData.transaction.message.instructions;
            const systemProgramId = '11111111111111111111111111111111';
            const hasSystemInstruction = instructions.some(ix => {
                return ix.programId?.toString() === systemProgramId;
            });

            if (hasSystemInstruction) {
                console.log("✓ Found System Program instruction, considering as SOL transfer");
                return true;
            }

            console.log("❌ No SOL transfer indicators found");
            return false;
        } catch (err) {
            console.error(`❌ Error checking SOL transfer for ${signature}:`, err);
            // Be permissive in case of errors
            return true;
        }
    }

    /**
     * Enhanced transaction polling with exponential backoff
     */
    async pollTransactionUntilConfirmed(signature, maxAttempts = 15, initialDelayMs = 2000) {
        if (
            !signature ||
            signature.startsWith('dummy_') ||
            signature.startsWith('added_') ||
            signature.startsWith('error_')
        ) {
            return {
                exists: false,
                confirmed: false,
                status: 'invalid',
                error: 'Invalid transaction signature format'
            };
        }

        let attempts = 0;
        let delay = initialDelayMs;
        let consecutiveErrors = 0;
        let lastError = null;

        console.log(`⏳ Polling transaction ${signature.slice(0, 8)}... until confirmed`);

        while (attempts < maxAttempts) {
            attempts++;

            try {
                const status = await this.getTransactionStatus(signature);

                // Reset consecutive error counter on success
                consecutiveErrors = 0;

                // If transaction is confirmed or finalized, return success
                if (status.exists && status.confirmed) {
                    console.log(`✅ Transaction ${signature.slice(0, 8)}... confirmed after ${attempts} attempts`);
                    return { ...status, attempts, totalTime: (attempts - 1) * delay };
                }

                // If transaction exists but not confirmed, continue polling
                if (status.exists) {
                    console.log(`⏳ Transaction ${signature.slice(0, 8)}... exists but not confirmed (${status.status})`);
                } else {
                    console.log(`🔍 Transaction ${signature.slice(0, 8)}... not found yet`);
                }

                // Wait before next attempt with exponential backoff
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay = Math.min(delay * 1.5, 10000); // Cap at 10 seconds
                }
            } catch (err) {
                consecutiveErrors++;
                lastError = err;
                console.warn(`❌ Polling attempt ${attempts}/${maxAttempts} failed:`, err.message);

                // Handle rate limiting explicitly
                const isRateLimited = await this.handleRateLimiting(err, 'transaction polling', attempts);

                // If not rate limited but got network error, try switching RPC
                if (!isRateLimited && consecutiveErrors > 1) {
                    console.log('Consecutive errors detected, switching RPC endpoint...');
                    await this.switchRpcEndpoint();
                    // Add additional delay after RPC switch
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                // Prevent aggressive retries when getting consistent errors
                const errorBackoff = Math.min(1000 * Math.pow(1.5, consecutiveErrors - 1), 10000);
                if (errorBackoff > 1000) {
                    console.log(`Adding error backoff delay: ${errorBackoff}ms`);
                    await new Promise(resolve => setTimeout(resolve, errorBackoff));
                }
            }
        }

        // Final attempt to get status
        try {
            const finalStatus = await this.getTransactionStatus(signature);
            return {
                ...finalStatus,
                attempts,
                timeout: true,
                error: 'Max polling attempts reached',
                lastError: lastError?.message
            };
        } catch (err) {
            return {
                exists: false,
                confirmed: false,
                attempts,
                timeout: true,
                error: `Polling failed: ${err.message}`
            };
        }
    }

    /**
 * Create a payment transaction directly to the recipient (seller)
 * @param {Object} wallet - Solana wallet adapter object
 * @param {string} recipientAddress - Recipient wallet address (seller)
 * @param {number} amount - Amount in SOL to send
 * @param {Function} progressCallback - Optional callback for progress updates
 * @param {Function} messageCallback - Optional callback for status messages
 * @returns {Promise<string>} Transaction signature
 */
    async createSolanaPayment(wallet, recipientAddress, amount, progressCallback = null, messageCallback = null) {
        try {
            // Validasi wallet connection
            if (!wallet || !wallet.publicKey) {
                throw new Error('Wallet not connected');
            }

            // Validasi recipient
            if (!recipientAddress) {
                throw new Error('Penerima pembayaran (penjual) tidak ditemukan');
            }

            // Update progress
            if (progressCallback) progressCallback(10);
            if (messageCallback) messageCallback(`Persiapan pembayaran ${amount} SOL ke penjual...`);

            console.log(`Creating payment: ${amount} SOL to ${recipientAddress}`);

            // Validasi amount
            const amountInSol = parseFloat(amount);
            if (isNaN(amountInSol) || amountInSol <= 0) {
                throw new Error('Jumlah pembayaran tidak valid');
            }

            // Convert SOL to lamports
            const lamports = amountInSol * LAMPORTS_PER_SOL;

            // Get connection
            const connection = this.connection; // Gunakan connection yang sudah diinisialisasi

            // Convert recipient string to PublicKey
            let recipientPublicKey;
            try {
                recipientPublicKey = new PublicKey(recipientAddress);
            } catch (e) {
                throw new Error('Alamat penjual tidak valid');
            }

            // Update progress
            if (progressCallback) progressCallback(20);
            if (messageCallback) messageCallback('Membuat transaksi...');

            // Create transaction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: recipientPublicKey,
                    lamports,
                })
            );

            // Get recent blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;

            // Update progress
            if (progressCallback) progressCallback(40);
            if (messageCallback) messageCallback('Menunggu persetujuan wallet...');

            // Sign transaction using wallet adapter
            try {
                // Untuk wallet yang mendukung signTransaction
                if (typeof wallet.signTransaction === 'function') {
                    // Sign the transaction
                    const signedTransaction = await wallet.signTransaction(transaction);

                    // Update progress
                    if (progressCallback) progressCallback(60);
                    if (messageCallback) messageCallback('Mengirim transaksi ke blockchain...');

                    // Send the signed transaction
                    const signature = await connection.sendRawTransaction(signedTransaction.serialize());

                    // Update progress
                    if (progressCallback) progressCallback(80);
                    if (messageCallback) messageCallback('Menunggu konfirmasi transaksi...');

                    // Wait for confirmation
                    await connection.confirmTransaction(signature);

                    // Update progress
                    if (progressCallback) progressCallback(100);
                    if (messageCallback) messageCallback('Pembayaran berhasil!');

                    console.log(`Payment of ${amountInSol} SOL sent to ${recipientAddress}. Signature: ${signature}`);
                    return signature;
                }
                // Untuk wallet yang mendukung sendTransaction
                else if (typeof wallet.sendTransaction === 'function') {
                    // Update progress
                    if (progressCallback) progressCallback(60);
                    if (messageCallback) messageCallback('Mengirim transaksi via wallet...');

                    // Send transaction directly through wallet adapter
                    const signature = await wallet.sendTransaction(transaction, connection);

                    // Update progress
                    if (progressCallback) progressCallback(80);
                    if (messageCallback) messageCallback('Menunggu konfirmasi transaksi...');

                    // Wait for confirmation
                    await connection.confirmTransaction(signature);

                    // Update progress
                    if (progressCallback) progressCallback(100);
                    if (messageCallback) messageCallback('Pembayaran berhasil!');

                    console.log(`Payment of ${amountInSol} SOL sent to ${recipientAddress}. Signature: ${signature}`);
                    return signature;
                }
                else {
                    throw new Error('Wallet tidak mendukung metode yang diperlukan');
                }
            } catch (signError) {
                console.error('Error during transaction signing or sending:', signError);

                // Check for user rejection
                if (signError.message.includes('User rejected')) {
                    throw new Error('Transaksi ditolak oleh pengguna');
                }

                throw signError;
            }
        } catch (error) {
            console.error('Error in createSolanaPayment:', error);
            if (messageCallback) messageCallback(`Error: ${error.message}`);
            throw error;
        }
    }
    /**
     * Enhanced invalidate balance cache
     */
    invalidateBalanceCache(publicKeyStr) {
        if (this.balanceCache.has(publicKeyStr)) {
            console.log(`🗑️ Invalidating balance cache for ${publicKeyStr.slice(0, 8)}...`);
            this.balanceCache.delete(publicKeyStr);
            this.lastBalanceCheck.delete(publicKeyStr);
        }
    }

    /**
     * Clear specific cache type or all caches
     */
    clearCache(type = 'all') {
        switch (type) {
            case 'balance':
                this.balanceCache.clear();
                this.lastBalanceCheck.clear();
                console.log('🧹 Balance cache cleared');
                break;
            case 'transaction':
                this.transactionCache.clear();
                console.log('🧹 Transaction cache cleared');
                break;
            case 'all':
            default:
                this.balanceCache.clear();
                this.lastBalanceCheck.clear();
                this.transactionCache.clear();
                console.log('🧹 All caches cleared');
                break;
        }
    }

    /**
     * Reset connection and try all RPCs from the beginning
     */
    async resetConnection() {
        console.log('🔄 Resetting all connections...');

        // Reset state
        this.connectionTested = false;
        this.isConnected = false;
        this.currentRpcIndex = 0;
        this.lastHealthCheck = 0;

        // Clear all caches
        this.clearCache('all');

        // Reset counters
        this.requestCounters = {
            balance: 0,
            transaction: 0,
            confirmation: 0,
            errors: 0,
            rpcSwitches: 0,
            rateLimits: 0
        };

        // Reset rate limit tracking
        this.rateLimitBackoffs = {
            lastBackoff: 0,
            consecutiveRateLimits: 0,
            currentBackoffMs: 1000
        };

        // Reinitialize connection
        this.initializeConnection();

        // Test new connection
        const success = await this.testConnection();
        console.log(success ? '✅ Connection reset successful' : '❌ Connection reset failed');

        return success;
    }

    /**
     * Get comprehensive service statistics
     */
    getStats() {
        return {
            cacheStats: {
                balance: {
                    size: this.balanceCache.size,
                    limit: this.maxCacheSize
                },
                transaction: {
                    size: this.transactionCache.size,
                    limit: this.maxCacheSize
                },
                lastBalanceCheck: this.lastBalanceCheck.size
            },
            connectionStats: {
                currentRpc: this.rpcUrl,
                currentIndex: this.currentRpcIndex + 1,
                totalRpcs: this.rpcUrls.length,
                isConnected: this.isConnected,
                lastHealthCheck: new Date(this.lastHealthCheck).toISOString(),
                healthCheckInterval: this.healthCheckInterval
            },
            performanceStats: {
                requestCounters: { ...this.requestCounters },
                cacheHitRate: {
                    balance: this.requestCounters.balance > 0 ?
                        ((this.requestCounters.balance - this.requestCounters.errors) / this.requestCounters.balance * 100).toFixed(2) + '%' : 'N/A'
                },
                rateLimiting: {
                    consecutiveRateLimits: this.rateLimitBackoffs.consecutiveRateLimits,
                    lastBackoff: new Date(this.rateLimitBackoffs.lastBackoff).toISOString(),
                    currentBackoffMs: this.rateLimitBackoffs.currentBackoffMs
                }
            },
            systemStats: {
                uptime: Date.now() - (this.lastHealthCheck || Date.now()),
                memoryUsage: (this.balanceCache.size + this.transactionCache.size) * 0.001 + 'KB (approx)'
            }
        };
    }
}

// Export singleton instance
const blockchainService = new BlockchainService();
export default blockchainService;