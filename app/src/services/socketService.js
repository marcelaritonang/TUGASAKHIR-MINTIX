// frontend/src/services/socketService.js - ESSENTIAL Socket.IO Client
import { io } from 'socket.io-client';

class SocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.currentConcert = null;
        this.currentUser = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        // Event listeners storage
        this.eventListeners = new Map();
    }

    /**
     * Connect to WebSocket server
     */
    connect(serverUrl = null) {
        const url = serverUrl || process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

        if (this.socket) {
            console.log('🔌 Socket already connected');
            return Promise.resolve();
        }

        console.log(`🔌 Connecting to WebSocket server: ${url}`);

        return new Promise((resolve, reject) => {
            this.socket = io(url, {
                transports: ['websocket', 'polling'],
                timeout: 20000,
                forceNew: true
            });

            // Connection successful
            this.socket.on('connect', () => {
                console.log('✅ Socket connected:', this.socket.id);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                resolve();
            });

            // Connection error
            this.socket.on('connect_error', (error) => {
                console.error('❌ Socket connection error:', error);
                this.isConnected = false;
                reject(error);
            });

            // Disconnection
            this.socket.on('disconnect', (reason) => {
                console.log('🔌 Socket disconnected:', reason);
                this.isConnected = false;

                // Attempt reconnection for certain reasons
                if (reason === 'io server disconnect') {
                    // Server disconnected, try to reconnect
                    this.attemptReconnect();
                }
            });

            // Setup essential event handlers
            this.setupEventHandlers();
        });
    }

    /**
     * Setup essential event handlers
     */
    setupEventHandlers() {
        if (!this.socket) return;

        // Authentication response
        this.socket.on('authenticated', (data) => {
            console.log('✅ Socket authenticated:', data);
            this.emit('authenticated', data);
        });

        // Seat status updates (CRITICAL untuk real-time)
        this.socket.on('seatStatusUpdate', (data) => {
            console.log('🎫 Seat status update:', data);
            this.emit('seatStatusUpdate', data);
        });

        // User's seat locked
        this.socket.on('seatLocked', (data) => {
            console.log('🔒 Seat locked:', data);
            this.emit('seatLocked', data);
        });

        // Seat unavailable
        this.socket.on('seatUnavailable', (data) => {
            console.log('❌ Seat unavailable:', data);
            this.emit('seatUnavailable', data);
        });

        // Seat released
        this.socket.on('seatReleased', (data) => {
            console.log('🔓 Seat released:', data);
            this.emit('seatReleased', data);
        });

        // Lock expiring warning
        this.socket.on('lockExpiring', (data) => {
            console.log('⏰ Lock expiring:', data);
            this.emit('lockExpiring', data);
        });

        // Lock expired
        this.socket.on('lockExpired', (data) => {
            console.log('⏰ Lock expired:', data);
            this.emit('lockExpired', data);
        });

        // Connection health
        this.socket.on('pong', (data) => {
            // Calculate latency
            if (data.timestamp) {
                const latency = Date.now() - data.timestamp;
                this.emit('connectionHealth', { latency, serverTime: data.serverTime });
            }
        });

        // Error handling
        this.socket.on('error', (error) => {
            console.error('🚨 Socket error:', error);
            this.emit('error', error);
        });
    }

    /**
     * Authenticate with wallet address and join concert
     */
    authenticate(walletAddress, concertId = null) {
        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ Socket not connected, cannot authenticate');
            return false;
        }

        console.log(`🔐 Authenticating: ${walletAddress} for concert: ${concertId}`);

        this.currentUser = walletAddress;
        this.currentConcert = concertId;

        this.socket.emit('authenticate', {
            walletAddress,
            concertId
        });

        return true;
    }

    /**
     * Select a seat (request lock)
     */
    selectSeat(concertId, sectionName, seatNumber) {
        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ Socket not connected, cannot select seat');
            return false;
        }

        console.log(`🎫 Selecting seat: ${concertId}-${sectionName}-${seatNumber}`);

        this.socket.emit('selectSeat', {
            concertId,
            sectionName,
            seatNumber
        });

        return true;
    }

    /**
     * Release a seat
     */
    releaseSeat(concertId, sectionName, seatNumber) {
        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ Socket not connected, cannot release seat');
            return false;
        }

        console.log(`🔓 Releasing seat: ${concertId}-${sectionName}-${seatNumber}`);

        this.socket.emit('releaseSeat', {
            concertId,
            sectionName,
            seatNumber
        });

        return true;
    }

    /**
     * Get current seat status
     */
    getSeatStatus(concertId, sectionName, seatNumber) {
        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ Socket not connected, cannot get seat status');
            return false;
        }

        this.socket.emit('getSeatStatus', {
            concertId,
            sectionName,
            seatNumber
        });

        return true;
    }

    /**
     * Get all locks for a concert
     */
    getConcertLocks(concertId) {
        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ Socket not connected, cannot get concert locks');
            return false;
        }

        this.socket.emit('getConcertLocks', {
            concertId
        });

        return true;
    }

    /**
     * Get user's current locks
     */
    getMyLocks(concertId) {
        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ Socket not connected, cannot get my locks');
            return false;
        }

        this.socket.emit('getMyLocks', {
            concertId
        });

        return true;
    }

    /**
     * Ping server for connection health
     */
    ping() {
        if (!this.socket || !this.isConnected) {
            return false;
        }

        this.socket.emit('ping', {
            timestamp: Date.now()
        });

        return true;
    }

    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (!this.eventListeners.has(event)) {
            return;
        }

        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * Emit event to local listeners
     */
    emit(event, data) {
        if (!this.eventListeners.has(event)) {
            return;
        }

        this.eventListeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Attempt reconnection
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            this.emit('reconnectFailed');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000); // Exponential backoff

        console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

        setTimeout(() => {
            if (this.socket) {
                this.socket.connect();
            }
        }, delay);
    }

    /**
     * Disconnect socket
     */
    disconnect() {
        if (this.socket) {
            console.log('🔌 Disconnecting socket...');
            this.socket.disconnect();
            this.socket = null;
        }

        this.isConnected = false;
        this.currentUser = null;
        this.currentConcert = null;
        this.eventListeners.clear();
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            socketId: this.socket?.id || null,
            currentUser: this.currentUser,
            currentConcert: this.currentConcert,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;