// frontend/src/components/SeatSelector.js - SIMPLE VERSION FOKUS MASALAH UTAMA
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import LoadingSpinner from './common/LoadingSpinner';
import ApiService from '../services/ApiService';
import blockchainService from '../services/blockchain';
import socketService from '../services/socketService';
import { API } from '../config/environment';

const SeatSelector = ({
    ticketType,
    concertId,
    selectedConcert,
    onSeatSelected,
    mintedSeats = [],
    refreshTrigger,
    ticketPrice = 0.01
}) => {
    const wallet = useWallet();

    // Core state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [availableSeats, setAvailableSeats] = useState([]);
    const [selectedSeat, setSelectedSeat] = useState('');
    const [rows, setRows] = useState(0);
    const [columns, setColumns] = useState(0);
    const [solanaBalance, setSolanaBalance] = useState(0);

    // Real-time state
    const [wsConnected, setWsConnected] = useState(false);
    const [lockedSeats, setLockedSeats] = useState(new Map());
    const [processingSeats, setProcessingSeats] = useState(new Set());
    const [myReservation, setMyReservation] = useState(null);
    const [lockTimer, setLockTimer] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [lastUpdate, setLastUpdate] = useState(Date.now());
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

    // ✅ KRITIS: Persistent state untuk seat detection
    const [debugMintedSeats, setDebugMintedSeats] = useState([]);
    const [seatDataCache, setSeatDataCache] = useState(null); // Cache untuk prevent data loss
    const [debugInfo, setDebugInfo] = useState('');
    const [numberingFormat, setNumberingFormat] = useState('theater');

    // Refs
    const lockTimerRef = useRef(null);
    const myTicketsRef = useRef([]);
    const pollingIntervalRef = useRef(null);

    // ✅ SIMPLE: API polling dengan data preservation
    useEffect(() => {
        if (!autoRefreshEnabled || !concertId || !ticketType) return;

        const startPolling = () => {
            refreshSeatStatus();
            pollingIntervalRef.current = setInterval(async () => {
                try {
                    await refreshSeatStatus();
                } catch (err) {
                    console.warn('Auto-refresh error:', err);
                }
            }, 3000);
        };

        startPolling();

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [autoRefreshEnabled, concertId, ticketType]);

    // ✅ SIMPLE: WebSocket setup (optional enhancement)
    useEffect(() => {
        if (!wallet?.connected || !concertId) return;

        const setupWebSocket = async () => {
            try {
                await socketService.connect();
                socketService.authenticate(wallet.publicKey.toString(), concertId);
                setWsConnected(true);
                setupWebSocketListeners();
                console.log('✅ WebSocket connected');
            } catch (error) {
                console.warn('⚠️ WebSocket failed, using API only:', error);
                setWsConnected(false);
            }
        };

        // Delay WebSocket to let API load first
        setTimeout(setupWebSocket, 2000);
    }, [wallet?.connected, concertId]);

    // ✅ SIMPLE: WebSocket listeners
    const setupWebSocketListeners = () => {
        // Real-time seat updates
        const handleSeatUpdate = (data) => {
            if (data.concertId !== concertId) return;

            const seatCode = `${data.sectionName}-${data.seatNumber}`;

            switch (data.action) {
                case 'locked':
                    setLockedSeats(prev => {
                        const newMap = new Map(prev);
                        newMap.set(seatCode, { lockedBy: 'other' });
                        return newMap;
                    });
                    break;
                case 'available':
                    setLockedSeats(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(seatCode);
                        return newMap;
                    });
                    break;
                case 'minted':
                    // ✅ KRITIS: Jangan hilangkan data, tambah ke list
                    setDebugMintedSeats(prev => {
                        if (!prev.includes(seatCode)) {
                            return [...prev, seatCode];
                        }
                        return prev;
                    });
                    break;
            }
        };

        // My seat locked
        const handleSeatLocked = (data) => {
            if (data.success) {
                setMyReservation({
                    seatKey: data.seatKey,
                    expiresAt: data.expiresAt,
                    timeRemaining: data.timeRemaining
                });
                startLockTimer(data.expiresAt);
                setConnectionStatus('reserved');
            }
        };

        socketService.on('seatStatusUpdate', handleSeatUpdate);
        socketService.on('seatStatusChanged', handleSeatUpdate);
        socketService.on('seatLocked', handleSeatLocked);
    };

    // Load user tickets
    useEffect(() => {
        const loadUserTickets = async () => {
            if (!wallet?.connected || !concertId) return;

            try {
                const token = localStorage.getItem('auth_token');
                if (!token) return;

                const userTickets = await ApiService.getMyTickets();
                const concertTickets = userTickets.filter(ticket => ticket.concertId === concertId);
                myTicketsRef.current = concertTickets;
            } catch (err) {
                console.error('Error loading user tickets:', err);
            }
        };

        loadUserTickets();
    }, [wallet?.connected, concertId, refreshTrigger]);

    // Get Solana balance
    useEffect(() => {
        const fetchBalance = async () => {
            if (wallet?.publicKey) {
                try {
                    const balance = await blockchainService.getSolanaBalance(wallet.publicKey);
                    setSolanaBalance(balance);
                } catch (err) {
                    console.error('Error fetching balance:', err);
                    setSolanaBalance(0);
                }
            }
        };

        fetchBalance();
    }, [wallet?.publicKey]);

    // ✅ KRITIS: Enhanced refresh dengan data preservation
    const refreshSeatStatus = async () => {
        if (!concertId) return;

        try {
            setConnectionStatus('checking');

            // ✅ STEP 1: Fetch minted seats dari API
            try {
                const mintedResult = await ApiService.getMintedSeats(concertId);

                if (mintedResult?.success && Array.isArray(mintedResult.seats)) {
                    const newSeats = mintedResult.seats;

                    // ✅ KRITIS: Preserve existing data + merge dengan new data
                    setDebugMintedSeats(prev => {
                        // Gabungkan data lama dengan data baru, remove duplicates
                        const combined = [...new Set([...prev, ...newSeats])];
                        console.log(`🔄 Minted seats: ${prev.length} existing + ${newSeats.length} new = ${combined.length} total`);
                        return combined;
                    });

                    // ✅ SIMPLE: Cache data untuk backup
                    setSeatDataCache({
                        seats: [...new Set([...debugMintedSeats, ...newSeats])],
                        timestamp: Date.now()
                    });

                    setDebugInfo(`✅ API: Found ${newSeats.length} minted seats`);

                } else {
                    // ✅ KRITIS: Kalau API gagal, jangan clear data!
                    console.warn('⚠️ API returned no data, preserving existing data');
                    setDebugInfo(`⚠️ API error, preserving ${debugMintedSeats.length} existing seats`);
                }

            } catch (mintedErr) {
                console.error('❌ API Error:', mintedErr);

                // ✅ KRITIS: Fallback ke cache atau preserve existing
                if (seatDataCache && (Date.now() - seatDataCache.timestamp) < 10 * 60 * 1000) {
                    setDebugMintedSeats(seatDataCache.seats);
                    setDebugInfo(`🗄️ Using cache: ${seatDataCache.seats.length} seats`);
                } else {
                    setDebugInfo(`⚠️ API error, keeping ${debugMintedSeats.length} seats`);
                }
            }

            // ✅ STEP 2: Get locks (keep existing logic)
            if (!wsConnected) {
                try {
                    const response = await fetch(`${API.getApiUrl()}/system/locks/${concertId}`, {
                        headers: { 'x-auth-token': localStorage.getItem('auth_token') }
                    });

                    if (response.ok) {
                        const lockData = await response.json();
                        if (lockData.success) {
                            const newLockedSeats = new Map();

                            if (lockData.locks?.temporaryLocks) {
                                lockData.locks.temporaryLocks.forEach(lock => {
                                    const seatCode = `${lock.sectionName}-${lock.seatNumber}`;
                                    newLockedSeats.set(seatCode, {
                                        lockedBy: lock.userId === wallet?.publicKey?.toString() ? 'me' : 'other',
                                        expiresAt: lock.expiresAt
                                    });

                                    if (lock.userId === wallet?.publicKey?.toString()) {
                                        setMyReservation({
                                            seatKey: `${lock.concertId}-${lock.sectionName}-${lock.seatNumber}`,
                                            expiresAt: lock.expiresAt,
                                            timeRemaining: lock.timeRemaining
                                        });
                                        startLockTimer(lock.expiresAt);
                                    }
                                });
                            }

                            if (lockData.locks?.processingLocks) {
                                lockData.locks.processingLocks.forEach(lock => {
                                    const seatCode = `${lock.sectionName}-${lock.seatNumber}`;
                                    setProcessingSeats(prev => new Set([...prev, seatCode]));
                                });
                            }

                            setLockedSeats(newLockedSeats);
                        }
                    }
                } catch (lockErr) {
                    console.warn('Could not fetch seat locks:', lockErr);
                }
            }

            setConnectionStatus(wsConnected ? 'connected' : 'polling');
            setLastUpdate(Date.now());

        } catch (err) {
            console.warn('Error refreshing seat status:', err);
            setConnectionStatus('error');
        }
    };

    // ✅ SIMPLE: Generate seats (tidak berubah, tapi menggunakan preserved data)
    const generateSeats = useCallback(() => {
        setLoading(true);
        setError('');

        try {
            const section = selectedConcert.sections.find(s => s.name === ticketType);
            if (!section) {
                throw new Error(`Section ${ticketType} not found`);
            }

            const totalSeats = section.totalSeats;
            const aspectRatio = 2;
            let cols = Math.ceil(Math.sqrt(totalSeats * aspectRatio));
            let rows = Math.ceil(totalSeats / cols);
            if (rows * cols < totalSeats) cols += 1;

            setRows(rows);
            setColumns(cols);

            const allSeats = [];
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const seatNumber = row * cols + col + 1;
                    if (seatNumber <= totalSeats) {
                        const rowLabel = String.fromCharCode(65 + row);
                        const colNumber = col + 1;
                        const seatCode = `${ticketType}-${rowLabel}${colNumber}`;
                        const seatNumberCode = `${rowLabel}${colNumber}`;

                        let displayNumber;
                        switch (numberingFormat) {
                            case 'theater': displayNumber = `${rowLabel}${colNumber}`; break;
                            case 'sequential': displayNumber = seatNumber.toString(); break;
                            case 'column': displayNumber = colNumber.toString(); break;
                            default: displayNumber = `${rowLabel}${colNumber}`;
                        }

                        // ✅ KRITIS: Menggunakan preserved debugMintedSeats
                        const isMinted = debugMintedSeats.includes(seatCode);
                        const isOwned = myTicketsRef.current.some(ticket =>
                            ticket.sectionName === ticketType && ticket.seatNumber === seatNumberCode
                        );

                        allSeats.push({
                            code: seatCode,
                            seatNumberCode,
                            displayNumber,
                            row, col, rowLabel, colNumber,
                            sequentialNumber: seatNumber,
                            isMinted, isOwned
                        });
                    }
                }
            }

            setAvailableSeats(allSeats);
            console.log(`✅ Generated ${allSeats.length} seats, ${allSeats.filter(s => s.isMinted).length} minted`);

        } catch (err) {
            console.error('Error generating seats:', err);
            setError(err.message || 'Failed to create seat layout');
        } finally {
            setLoading(false);
        }
    }, [ticketType, selectedConcert, debugMintedSeats, numberingFormat]);

    useEffect(() => {
        if (!ticketType || !selectedConcert) {
            setAvailableSeats([]);
            return;
        }
        generateSeats();
    }, [generateSeats]);

    // ✅ SIMPLE: Seat reservation (tidak berubah)
    const reserveSeat = async (seat) => {
        if (!wallet?.connected) {
            setError('Please connect your wallet first');
            return false;
        }

        try {
            setError('');
            setConnectionStatus('reserving');

            // Try WebSocket first
            if (wsConnected && socketService.getStatus().connected) {
                const success = socketService.selectSeat(concertId, ticketType, seat.seatNumberCode);
                if (success) return true;
            }

            // Fallback to API
            const response = await fetch(`${API.getApiUrl()}/tickets/reserve-seat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': localStorage.getItem('auth_token')
                },
                body: JSON.stringify({
                    concertId: concertId,
                    sectionName: ticketType,
                    seatNumber: seat.seatNumberCode
                })
            });

            const result = await response.json();

            if (result.success) {
                setMyReservation({
                    seatKey: result.seatKey,
                    expiresAt: result.expiresAt,
                    timeRemaining: result.timeRemaining
                });
                startLockTimer(result.expiresAt);
                setConnectionStatus('reserved');
                setTimeout(() => refreshSeatStatus(), 500);
                return true;
            } else {
                setError(result.msg || 'Failed to reserve seat');
                setConnectionStatus('error');
                return false;
            }

        } catch (err) {
            console.error('Error reserving seat:', err);
            setError('Network error. Please try again.');
            setConnectionStatus('error');
            return false;
        }
    };

    // Release seat reservation
    const releaseSeatReservation = async () => {
        if (!myReservation) return;

        try {
            setConnectionStatus('releasing');
            const [concertPart, sectionPart, seatPart] = myReservation.seatKey.split('-');

            if (wsConnected && socketService.getStatus().connected) {
                const success = socketService.releaseSeat(concertPart, sectionPart, seatPart);
                if (success) {
                    clearReservation();
                    setConnectionStatus('connected');
                    return;
                }
            }

            const response = await fetch(`${API.getApiUrl()}/tickets/reserve-seat`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': localStorage.getItem('auth_token')
                },
                body: JSON.stringify({
                    concertId: concertPart,
                    sectionName: sectionPart,
                    seatNumber: seatPart
                })
            });

            const result = await response.json();
            if (result.success) {
                clearReservation();
                setConnectionStatus('connected');
                setTimeout(() => refreshSeatStatus(), 500);
            }

        } catch (err) {
            console.error('Error releasing seat:', err);
        }
    };

    // Handle seat click
    const handleSeatClick = async (seat) => {
        if (seat.isMinted) {
            setError(seat.isOwned ? `You already own seat ${seat.displayNumber}` : `Seat ${seat.displayNumber} is already sold`);
            return;
        }

        const seatLock = lockedSeats.get(seat.code);
        if (seatLock && seatLock.lockedBy === 'other') {
            setError(`Seat ${seat.displayNumber} is currently selected by another user`);
            return;
        }

        if (solanaBalance < ticketPrice) {
            setError(`Insufficient SOL balance. Required: ${ticketPrice} SOL, Your balance: ${solanaBalance.toFixed(4)} SOL`);
            return;
        }

        if (myReservation && myReservation.seatKey !== seat.code) {
            await releaseSeatReservation();
        }

        setError('');
        const reserved = await reserveSeat(seat);
        if (reserved) {
            setSelectedSeat(seat.code);
            onSeatSelected(seat.seatNumberCode);
        }
    };

    // Helper functions (simple versions)
    const clearReservation = () => {
        setMyReservation(null);
        clearLockTimer();
        setSelectedSeat('');
        onSeatSelected('');
    };

    const startLockTimer = (expiresAt) => {
        clearLockTimer();
        const updateTimer = () => {
            const now = Date.now();
            const timeRemaining = Math.max(0, expiresAt - now);
            if (timeRemaining <= 0) {
                setLockTimer(null);
                clearReservation();
                setError('Your seat selection has expired');
                return;
            }
            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);
            setLockTimer(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            if (timeRemaining <= 30000 && timeRemaining > 29000) {
                setError('Your seat selection expires in 30 seconds!');
            }
        };
        updateTimer();
        lockTimerRef.current = setInterval(updateTimer, 1000);
    };

    const clearLockTimer = () => {
        if (lockTimerRef.current) {
            clearInterval(lockTimerRef.current);
            lockTimerRef.current = null;
        }
        setLockTimer(null);
    };

    const getSeatStatus = (seat) => {
        if (seat.isOwned) return 'owned';
        if (seat.isMinted) return 'minted';
        if (processingSeats.has(seat.code)) return 'processing';
        if (myReservation && myReservation.seatKey === seat.code) return 'selected';
        const seatLock = lockedSeats.get(seat.code);
        if (seatLock) return seatLock.lockedBy === 'me' ? 'selected' : 'locked';
        return 'available';
    };

    const getSeatClasses = (seat) => {
        const status = getSeatStatus(seat);
        const baseClasses = 'relative w-10 h-10 flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer';
        const statusStyles = {
            owned: 'bg-green-500 text-white border-2 border-green-300',
            minted: 'bg-red-500 text-white opacity-75 cursor-not-allowed',
            processing: 'bg-yellow-500 text-white animate-pulse cursor-wait',
            selected: 'bg-purple-600 text-white border-2 border-purple-400 shadow-lg',
            locked: 'bg-orange-500 text-white opacity-80 cursor-not-allowed',
            available: 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
        };
        return `${baseClasses} ${statusStyles[status]}`;
    };

    const handleRefresh = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await refreshSeatStatus();
        } catch (err) {
            setError('Failed to refresh. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Get stats
    const seatStats = {
        total: availableSeats.length,
        available: availableSeats.filter(s => getSeatStatus(s) === 'available').length,
        taken: availableSeats.filter(s => ['minted', 'owned'].includes(getSeatStatus(s))).length,
        locked: Array.from(lockedSeats.values()).length,
        processing: processingSeats.size
    };

    const seatsByRow = [];
    for (let r = 0; r < rows; r++) {
        seatsByRow.push(availableSeats.filter(seat => seat.row === r));
    }

    // Cleanup
    useEffect(() => {
        return () => {
            clearLockTimer();
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            if (myReservation) releaseSeatReservation();
        };
    }, []);

    // Render
    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <LoadingSpinner />
                <span className="ml-3 text-gray-300">Loading seat layout...</span>
            </div>
        );
    }

    if (!ticketType || !selectedConcert) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-400">Please select a concert and ticket type first</p>
            </div>
        );
    }

    if (availableSeats.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No seats available for this category</p>
                <button onClick={handleRefresh} className="text-blue-400 hover:text-blue-300 text-sm">
                    Try refreshing
                </button>
            </div>
        );
    }

    const section = selectedConcert.sections.find(s => s.name === ticketType);
    const price = section ? section.price : 0;

    return (
        <div className="seat-selector">
            {/* ✅ SIMPLE DEBUG INFO */}
            {process.env.NODE_ENV === 'development' && debugInfo && (
                <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-3 mb-4">
                    <p className="text-blue-400 text-sm font-bold">🔍 SIMPLE DEBUG:</p>
                    <p className="text-blue-300 text-xs">{debugInfo}</p>
                    <p className="text-blue-300 text-xs">Preserved Seats: {debugMintedSeats.length}</p>
                    <p className="text-blue-300 text-xs">Cache: {seatDataCache ? 'Active' : 'Empty'}</p>
                    <p className="text-blue-300 text-xs">WebSocket: {wsConnected ? 'Active' : 'API Only'}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
                <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Select Your Seat</h3>
                    <p className="text-gray-400 text-sm">{selectedConcert.name} • {ticketType} Section • {price} SOL</p>
                </div>
                <div className="flex items-center space-x-4">
                    {/* Connection Status */}
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-400' :
                                connectionStatus === 'reserved' ? 'bg-blue-400' :
                                    connectionStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                            }`}></div>
                        <span className="text-xs text-gray-400">
                            {connectionStatus === 'connected' && (wsConnected ? 'Real-time' : 'API')}
                            {connectionStatus === 'reserved' && 'Reserved'}
                            {connectionStatus === 'error' && 'Error'}
                            {connectionStatus === 'checking' && 'Updating...'}
                        </span>
                    </div>
                    <button onClick={handleRefresh} disabled={loading} className="text-xs bg-gray-700 hover:bg-gray-600 p-2 rounded disabled:opacity-50">
                        <svg className={`w-3 h-3 text-gray-300 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">{seatStats.total}</div>
                    <div className="text-xs text-gray-400">Total</div>
                </div>
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-400">{seatStats.available}</div>
                    <div className="text-xs text-gray-400">Available</div>
                </div>
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-red-400">{seatStats.taken}</div>
                    <div className="text-xs text-gray-400">Taken</div>
                </div>
                <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-orange-400">{seatStats.locked}</div>
                    <div className="text-xs text-gray-400">Locked</div>
                </div>
            </div>

            {/* Price Info */}
            <div className="bg-gray-800/50 p-4 rounded-lg mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 text-sm">Ticket Price:</span>
                    <span className="text-purple-400 font-medium">{price} SOL</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 text-sm">Wallet Balance:</span>
                    <span className={`${solanaBalance < price ? 'text-red-400' : 'text-green-400'} font-medium`}>
                        {solanaBalance.toFixed(4)} SOL
                    </span>
                </div>
                {myReservation && lockTimer && (
                    <div className="flex justify-between items-center p-2 bg-purple-900/30 rounded">
                        <span className="text-gray-300 text-sm">Expires in:</span>
                        <span className="text-orange-400 font-medium font-mono">{lockTimer}</span>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                    <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Stage */}
            <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white text-center py-3 mb-6 rounded-lg">
                <span className="text-sm font-medium">🎭 STAGE</span>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-5 gap-2 mb-6 text-xs">
                {[
                    { color: 'bg-gray-700', label: 'Available' },
                    { color: 'bg-purple-600', label: 'Selected' },
                    { color: 'bg-orange-500', label: 'Locked' },
                    { color: 'bg-yellow-500', label: 'Processing' },
                    { color: 'bg-red-500', label: 'Sold' }
                ].map(({ color, label }) => (
                    <div key={label} className="flex items-center space-x-2">
                        <div className={`w-3 h-3 ${color} rounded-sm`}></div>
                        <span className="text-gray-400">{label}</span>
                    </div>
                ))}
            </div>

            {/* Seats */}
            <div className="overflow-auto max-h-96 border border-gray-700 rounded-lg p-4 bg-gray-950">
                <div className="space-y-4">
                    {seatsByRow.map((rowSeats, rowIndex) => (
                        <div key={`row-${rowIndex}`} className="flex items-center">
                            <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-4">
                                {String.fromCharCode(65 + rowIndex)}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {rowSeats.map(seat => (
                                    <div
                                        key={seat.code}
                                        onClick={() => handleSeatClick(seat)}
                                        className={getSeatClasses(seat)}
                                        title={`${seat.displayNumber} (${getSeatStatus(seat)})`}
                                    >
                                        {seat.displayNumber}
                                        {getSeatStatus(seat) === 'selected' && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full"></div>
                                        )}
                                        {getSeatStatus(seat) === 'minted' && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="ml-4 text-gray-400 text-xs">
                                {rowSeats.filter(s => getSeatStatus(s) === 'available').length} available
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Current Selection */}
            {myReservation && (
                <div className="mt-6 bg-purple-900/30 border border-purple-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-purple-300 text-sm font-medium">
                                    🎫 Selected: Seat {myReservation.seatKey.split('-').pop()}
                                </p>
                                <p className="text-gray-400 text-xs">{ticketType} Section • {price} SOL</p>
                                {lockTimer && (
                                    <p className="text-orange-400 text-xs font-mono">⏰ Expires in: {lockTimer}</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={releaseSeatReservation}
                            disabled={connectionStatus === 'releasing'}
                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded disabled:opacity-50"
                        >
                            {connectionStatus === 'releasing' ? 'Releasing...' : 'Release'}
                        </button>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="mt-6 text-center border-t border-gray-700 pt-4">
                <div className="text-xs text-gray-500 mb-2">
                    Last updated: {new Date(lastUpdate).toLocaleTimeString()} •
                    {wsConnected ? ' Real-time active' : ' API mode'} •
                    {debugMintedSeats.length} seats preserved
                </div>

                {/* Status indicators */}
                <div className="flex justify-center space-x-4 text-xs">
                    {seatStats.taken > 0 && (
                        <span className="text-red-400">🎫 {seatStats.taken} sold</span>
                    )}
                    {wsConnected && seatStats.locked > 0 && (
                        <span className="text-orange-400">🔒 {seatStats.locked} locked</span>
                    )}
                    {seatDataCache && (
                        <span className="text-green-400">💾 Cache active</span>
                    )}
                </div>

                {connectionStatus === 'error' && (
                    <div className="mt-2">
                        <button onClick={handleRefresh} className="text-xs text-blue-400 hover:text-blue-300 underline">
                            Connection error? Try refresh
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SeatSelector;