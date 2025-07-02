// frontend/src/components/SeatSelector.js - COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import LoadingSpinner from './common/LoadingSpinner';
import ApiService from '../services/ApiService';
import blockchainService from '../services/blockchain';
import socketService from '../services/socketService'; // Import your socketService

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

    // Basic state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [availableSeats, setAvailableSeats] = useState([]);
    const [selectedSeat, setSelectedSeat] = useState('');
    const [rows, setRows] = useState(0);
    const [columns, setColumns] = useState(0);
    const [solanaBalance, setSolanaBalance] = useState(0);

    // Real-time state
    const [lockedSeats, setLockedSeats] = useState(new Map());
    const [processingSeats, setProcessingSeats] = useState(new Set());
    const [myReservation, setMyReservation] = useState(null);
    const [lockTimer, setLockTimer] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connected');
    const [lastUpdate, setLastUpdate] = useState(Date.now());
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

    // ✅ DEBUG: State untuk track minted seats
    const [debugMintedSeats, setDebugMintedSeats] = useState([]);
    const [debugInfo, setDebugInfo] = useState('');

    // Refs
    const lockTimerRef = useRef(null);
    const myTicketsRef = useRef([]);
    const pollingIntervalRef = useRef(null);

    // ✅ ENHANCED: Polling dengan debugging minted seats
    useEffect(() => {
        if (!autoRefreshEnabled || !concertId || !ticketType) return;

        const startPolling = () => {
            // Initial fetch
            refreshSeatStatus();

            // Then poll every 2 seconds
            pollingIntervalRef.current = setInterval(async () => {
                try {
                    await refreshSeatStatus();
                } catch (err) {
                    console.warn('Auto-refresh error:', err);
                }
            }, 2000);
        };

        startPolling();

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [autoRefreshEnabled, concertId, ticketType]);

    // Load user's tickets
    useEffect(() => {
        const loadUserTickets = async () => {
            if (!wallet?.connected || !concertId) return;

            try {
                const token = localStorage.getItem('auth_token');
                if (!token) return;

                const userTickets = await ApiService.getMyTickets();
                const concertTickets = userTickets.filter(ticket => ticket.concertId === concertId);

                myTicketsRef.current = concertTickets;
                console.log(`📋 Loaded ${concertTickets.length} user tickets for concert`);
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

    // ✅ ENHANCED: Setup WebSocket connection and event listeners
    useEffect(() => {
        if (!wallet?.connected || !concertId) return;

        const setupSocketConnection = async () => {
            try {
                // Connect to WebSocket
                await socketService.connect();

                // Authenticate user
                socketService.authenticate(wallet.publicKey.toString(), concertId);

                // Setup event listeners
                const handleSeatStatusUpdate = (data) => {
                    console.log('🎫 Real-time seat update:', data);

                    // Update local state based on real-time updates
                    if (data.action === 'locked') {
                        setLockedSeats(prev => {
                            const newMap = new Map(prev);
                            const seatCode = `${data.sectionName}-${data.seatNumber}`;
                            newMap.set(seatCode, {
                                lockedBy: data.lockedBy === 'other_user' ? 'other' : 'me',
                                expiresAt: data.expiresAt,
                                lockType: data.lockType || 'selection'
                            });
                            return newMap;
                        });
                    } else if (data.action === 'available') {
                        setLockedSeats(prev => {
                            const newMap = new Map(prev);
                            const seatCode = `${data.sectionName}-${data.seatNumber}`;
                            newMap.delete(seatCode);
                            return newMap;
                        });
                    } else if (data.action === 'minted') {
                        // Refresh minted seats when someone completes purchase
                        setTimeout(() => {
                            refreshSeatStatus();
                        }, 1000);
                    }
                };

                const handleSeatLocked = (data) => {
                    console.log('🔒 My seat locked:', data);
                    if (data.success) {
                        setMyReservation({
                            seatKey: data.seatKey,
                            expiresAt: data.expiresAt,
                            timeRemaining: data.timeRemaining,
                            lockType: data.lockType
                        });
                        startLockTimer(data.expiresAt);
                    }
                };

                const handleLockExpired = (data) => {
                    console.log('⏰ Lock expired:', data);
                    clearReservation();
                    setError('Your seat selection has expired');
                };

                const handleLockExpiring = (data) => {
                    console.log('⏰ Lock expiring soon:', data);
                    setError('Your seat selection expires in 30 seconds!');
                };

                // Register event listeners
                socketService.on('seatStatusUpdate', handleSeatStatusUpdate);
                socketService.on('seatLocked', handleSeatLocked);
                socketService.on('lockExpired', handleLockExpired);
                socketService.on('lockExpiring', handleLockExpiring);

                console.log('✅ WebSocket connection established for concert:', concertId);

                // Cleanup function
                return () => {
                    socketService.off('seatStatusUpdate', handleSeatStatusUpdate);
                    socketService.off('seatLocked', handleSeatLocked);
                    socketService.off('lockExpired', handleLockExpired);
                    socketService.off('lockExpiring', handleLockExpiring);
                };
            } catch (err) {
                console.error('Error setting up WebSocket connection:', err);
                setConnectionStatus('error');
            }
        };

        const cleanup = setupSocketConnection();

        return () => {
            if (cleanup && typeof cleanup.then === 'function') {
                cleanup.then(cleanupFn => {
                    if (typeof cleanupFn === 'function') {
                        cleanupFn();
                    }
                });
            }
        };
    }, [wallet?.connected, concertId]);

    // Generate seat layout
    useEffect(() => {
        if (!ticketType || !selectedConcert) {
            setAvailableSeats([]);
            return;
        }

        generateSeats();
    }, [ticketType, selectedConcert, debugMintedSeats, refreshTrigger, lockedSeats, processingSeats, lastUpdate]);

    // ✅ ENHANCED: Refresh dengan debugging minted seats
    const refreshSeatStatus = async () => {
        if (!concertId) return;

        try {
            setConnectionStatus('checking');

            // ✅ DEBUG: Get minted seats dengan detailed logging
            console.log(`🔍 Fetching minted seats for concert: ${concertId}`);

            try {
                const mintedResult = await ApiService.getMintedSeats(concertId);
                console.log('🎫 Minted seats API response:', mintedResult);

                if (mintedResult?.seats) {
                    setDebugMintedSeats(mintedResult.seats);
                    setDebugInfo(`Found ${mintedResult.seats.length} minted seats: ${mintedResult.seats.join(', ')}`);
                    console.log(`✅ Updated minted seats: ${mintedResult.seats.length} seats`);
                } else {
                    setDebugInfo('No minted seats found or API error');
                    console.warn('⚠️ No minted seats data in API response');
                }
            } catch (mintedErr) {
                console.error('❌ Error fetching minted seats:', mintedErr);
                setDebugInfo(`Error fetching minted seats: ${mintedErr.message}`);
            }

            // Get current seat locks
            try {
                const response = await fetch(`/api/system/locks/${concertId}`, {
                    headers: {
                        'x-auth-token': localStorage.getItem('auth_token')
                    }
                });

                if (response.ok) {
                    const lockData = await response.json();

                    if (lockData.success) {
                        const newLockedSeats = new Map();
                        const newProcessingSeats = new Set();

                        // Process temporary locks
                        if (lockData.locks?.temporaryLocks) {
                            lockData.locks.temporaryLocks.forEach(lock => {
                                const seatCode = `${lock.sectionName}-${lock.seatNumber}`;
                                newLockedSeats.set(seatCode, {
                                    lockedBy: lock.userId === wallet?.publicKey?.toString() ? 'me' : 'other',
                                    expiresAt: lock.expiresAt,
                                    lockType: 'selection',
                                    timeRemaining: lock.timeRemaining
                                });

                                // If it's my lock, update reservation
                                if (lock.userId === wallet?.publicKey?.toString()) {
                                    setMyReservation({
                                        seatKey: `${lock.concertId}-${lock.sectionName}-${lock.seatNumber}`,
                                        expiresAt: lock.expiresAt,
                                        timeRemaining: lock.timeRemaining,
                                        lockType: 'selection'
                                    });
                                    startLockTimer(lock.expiresAt);
                                }
                            });
                        }

                        // Process processing locks
                        if (lockData.locks?.processingLocks) {
                            lockData.locks.processingLocks.forEach(lock => {
                                const seatCode = `${lock.sectionName}-${lock.seatNumber}`;
                                newProcessingSeats.add(seatCode);
                                newLockedSeats.set(seatCode, {
                                    lockedBy: lock.userId === wallet?.publicKey?.toString() ? 'me' : 'other',
                                    expiresAt: lock.expiresAt,
                                    lockType: 'processing',
                                    operationType: lock.operationType
                                });
                            });
                        }

                        setLockedSeats(newLockedSeats);
                        setProcessingSeats(newProcessingSeats);

                        console.log(`🔄 Updated: ${newLockedSeats.size} locked, ${newProcessingSeats.size} processing`);
                    }
                }
            } catch (lockErr) {
                console.warn('Could not fetch seat locks:', lockErr);
            }

            setConnectionStatus('connected');
            setLastUpdate(Date.now());
        } catch (err) {
            console.warn('Error refreshing seat status:', err);
            setConnectionStatus('error');
        }
    };

    // ✅ FIXED: Generate seats dengan correct numbering logic
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

            if (rows * cols < totalSeats) {
                cols += 1;
            }

            setRows(rows);
            setColumns(cols);

            const allSeats = [];
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const seatNumber = row * cols + col + 1;
                    if (seatNumber <= totalSeats) {
                        // ✅ FIXED: Correct seat numbering logic to match database
                        const rowLabel = String.fromCharCode(65 + row); // A, B, C, D...
                        const seatCode = `${ticketType}-${rowLabel}${col + 1}`; // VIP-A1, VIP-A2, VIP-A3...
                        const seatNumberCode = `${rowLabel}${col + 1}`; // A1, A2, A3...

                        console.log(`Generated seat: ${seatCode} (DB lookup)`);

                        // ✅ Check if minted using debugMintedSeats (from API)
                        const isMinted = debugMintedSeats.includes(seatCode);

                        if (isMinted) {
                            console.log(`🎫 FOUND MINTED SEAT: ${seatCode}`);
                        }

                        // Check if owned by user
                        const isOwned = myTicketsRef.current.some(ticket =>
                            ticket.sectionName === ticketType &&
                            ticket.seatNumber === seatNumberCode
                        );

                        allSeats.push({
                            code: seatCode,
                            seatNumberCode,
                            row,
                            col,
                            isMinted,
                            isOwned
                        });
                    }
                }
            }

            setAvailableSeats(allSeats);

            const mintedCount = allSeats.filter(seat => seat.isMinted).length;
            console.log(`Generated ${allSeats.length} seats for ${ticketType}, ${mintedCount} are minted`);

            // ✅ Debug: Log first few seat codes to verify
            const firstFewSeats = allSeats.slice(0, 5).map(s => s.code);
            console.log(`First 5 seat codes: [${firstFewSeats.join(', ')}]`);
            console.log(`API minted seats: [${debugMintedSeats.join(', ')}]`);

        } catch (err) {
            console.error('Error generating seats:', err);
            setError(err.message || 'Failed to create seat layout');
        } finally {
            setLoading(false);
        }
    }, [ticketType, selectedConcert, debugMintedSeats, myTicketsRef, lockedSeats, processingSeats]);

    // Reserve seat via API
    const reserveSeat = async (seat) => {
        if (!wallet?.connected) {
            setError('Please connect your wallet first');
            return false;
        }

        try {
            setError('');
            setConnectionStatus('reserving');

            console.log(`🎫 Reserving seat: ${seat.code}`);

            const response = await fetch('/api/tickets/reserve-seat', {
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
                console.log('✅ Seat reserved successfully');

                setMyReservation({
                    seatKey: result.seatKey,
                    expiresAt: result.expiresAt,
                    timeRemaining: result.timeRemaining
                });

                startLockTimer(result.expiresAt);
                setConnectionStatus('reserved');

                // Immediate refresh
                setTimeout(() => {
                    refreshSeatStatus();
                }, 500);

                return true;
            } else {
                console.log('❌ Seat reservation failed:', result.msg);
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

            console.log(`🔓 Releasing seat reservation: ${myReservation.seatKey}`);

            const response = await fetch('/api/tickets/reserve-seat', {
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
                console.log('✅ Seat released successfully');
                clearReservation();
                setConnectionStatus('connected');

                // Immediate refresh
                setTimeout(() => {
                    refreshSeatStatus();
                }, 500);
            } else {
                console.log('❌ Failed to release seat:', result.msg);
            }

        } catch (err) {
            console.error('Error releasing seat:', err);
        }
    };

    // Handle seat click
    const handleSeatClick = async (seat) => {
        if (seat.isMinted) {
            if (seat.isOwned) {
                setError(`You already own seat ${seat.seatNumberCode}`);
            } else {
                setError(`Seat ${seat.seatNumberCode} is already sold`);
            }
            return;
        }

        // Check if seat is locked by someone else
        const seatLock = lockedSeats.get(seat.code);
        if (seatLock && seatLock.lockedBy === 'other') {
            setError(`Seat ${seat.seatNumberCode} is currently selected by another user`);
            return;
        }

        // Check balance
        if (solanaBalance < ticketPrice) {
            setError(`Insufficient SOL balance. Required: ${ticketPrice} SOL, Your balance: ${solanaBalance.toFixed(4)} SOL`);
            return;
        }

        // If user already has a reservation, release it first
        if (myReservation && myReservation.seatKey !== seat.code) {
            await releaseSeatReservation();
        }

        // Clear any previous errors
        setError('');

        // Reserve seat
        const reserved = await reserveSeat(seat);

        if (reserved) {
            setSelectedSeat(seat.code);
            onSeatSelected(seat.seatNumberCode);
        }
    };

    // Clear reservation state
    const clearReservation = () => {
        setMyReservation(null);
        clearLockTimer();
        setSelectedSeat('');
        onSeatSelected('');
    };

    // Start countdown timer
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

            // Warning when 30 seconds left
            if (timeRemaining <= 30000 && timeRemaining > 29000) {
                setError('Your seat selection expires in 30 seconds!');
            }
        };

        updateTimer();
        lockTimerRef.current = setInterval(updateTimer, 1000);
    };

    // Clear timer
    const clearLockTimer = () => {
        if (lockTimerRef.current) {
            clearInterval(lockTimerRef.current);
            lockTimerRef.current = null;
        }
        setLockTimer(null);
    };

    // Get seat status for styling
    const getSeatStatus = (seat) => {
        if (seat.isOwned) return 'owned';
        if (seat.isMinted) return 'minted';
        if (processingSeats.has(seat.code)) return 'processing';
        if (myReservation && myReservation.seatKey === seat.code) return 'selected';

        const seatLock = lockedSeats.get(seat.code);
        if (seatLock) {
            return seatLock.lockedBy === 'me' ? 'selected' : 'locked';
        }

        return 'available';
    };

    // Get seat CSS classes
    const getSeatClasses = (seat) => {
        const status = getSeatStatus(seat);
        const baseClasses = 'w-6 h-6 flex items-center justify-center rounded-sm text-xs transition-all duration-200 cursor-pointer relative';

        switch (status) {
            case 'owned':
                return `${baseClasses} bg-green-500/80 text-white border border-green-300 cursor-not-allowed`;
            case 'minted':
                return `${baseClasses} bg-red-500/60 text-gray-200 cursor-not-allowed`;
            case 'processing':
                return `${baseClasses} bg-yellow-500/80 text-white animate-pulse cursor-not-allowed`;
            case 'selected':
                return `${baseClasses} bg-purple-600 text-white border-2 border-purple-400 shadow-lg scale-110`;
            case 'locked':
                return `${baseClasses} bg-orange-500/60 text-gray-200 cursor-not-allowed`;
            case 'available':
            default:
                return `${baseClasses} bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105 hover:shadow-md`;
        }
    };

    // Get seat tooltip
    const getSeatTooltip = (seat) => {
        const status = getSeatStatus(seat);

        switch (status) {
            case 'owned': return `${seat.code} (Your Seat)`;
            case 'minted': return `${seat.code} (Already Sold)`;
            case 'processing': return `${seat.code} (Being Processed)`;
            case 'selected': return `${seat.code} (Selected by You)`;
            case 'locked': return `${seat.code} (Selected by Another User)`;
            case 'available': return `${seat.code} (Available - Click to select)`;
            default: return seat.code;
        }
    };

    // Manual refresh
    const handleRefresh = async () => {
        if (loading) return;

        console.log('🔄 Manual refresh requested');
        setLoading(true);

        try {
            await refreshSeatStatus();
        } catch (err) {
            console.error('Error during manual refresh:', err);
            setError('Failed to refresh. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Component cleanup
    useEffect(() => {
        return () => {
            clearLockTimer();
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
            if (myReservation) {
                releaseSeatReservation();
            }
            // Don't disconnect socket here as it might be used by other components
        };
    }, []);

    // Render loading state
    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <LoadingSpinner />
                <span className="ml-2 text-gray-300">Loading seat layout...</span>
            </div>
        );
    }

    // Render if no concert or ticket type selected
    if (!ticketType || !selectedConcert) {
        return (
            <div className="text-center py-4">
                <p className="text-gray-400">Please select a concert and ticket type first</p>
            </div>
        );
    }

    // No seats available
    if (availableSeats.length === 0) {
        return (
            <div className="text-center py-4">
                <p className="text-gray-400">No seats available for this category</p>
                <button
                    onClick={handleRefresh}
                    className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                >
                    Try refreshing
                </button>
            </div>
        );
    }

    // Get section info
    const section = selectedConcert.sections.find(s => s.name === ticketType);
    const price = section ? section.price : 0;

    // Group seats by row
    const seatsByRow = [];
    for (let r = 0; r < rows; r++) {
        seatsByRow.push(availableSeats.filter(seat => seat.row === r));
    }

    return (
        <div className="seat-selector">
            {/* ✅ DEBUG INFO SECTION */}
            {debugInfo && (
                <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-3 mb-4">
                    <p className="text-blue-400 text-sm font-bold">🔍 DEBUG INFO:</p>
                    <p className="text-blue-300 text-xs">{debugInfo}</p>
                    <p className="text-blue-300 text-xs">Concert ID: {concertId}</p>
                    <p className="text-blue-300 text-xs">Debug Minted Seats: [{debugMintedSeats.join(', ')}]</p>
                    <p className="text-blue-300 text-xs">Original Minted Seats: [{mintedSeats.join(', ')}]</p>
                </div>
            )}

            {/* Connection Status */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-400' :
                        connectionStatus === 'reserved' ? 'bg-blue-400' :
                            connectionStatus === 'error' ? 'bg-red-400' :
                                'bg-yellow-400'
                        }`}></div>
                    <span className="text-xs text-gray-400">
                        {connectionStatus === 'connected' && 'Real-time updates active (WebSocket + API polling)'}
                        {connectionStatus === 'reserved' && 'Seat reserved'}
                        {connectionStatus === 'reserving' && 'Reserving seat...'}
                        {connectionStatus === 'releasing' && 'Releasing seat...'}
                        {connectionStatus === 'checking' && 'Checking status...'}
                        {connectionStatus === 'error' && 'Connection error'}
                    </span>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                        className={`text-xs px-2 py-1 rounded ${autoRefreshEnabled
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-600 text-gray-300'
                            }`}
                        title={autoRefreshEnabled ? 'Disable auto-refresh' : 'Enable auto-refresh'}
                    >
                        Auto: {autoRefreshEnabled ? 'ON' : 'OFF'}
                    </button>

                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="text-xs bg-gray-700 hover:bg-gray-600 p-1 rounded disabled:opacity-50"
                        title="Manual refresh"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Price and Balance Info */}
            <div className="bg-gray-800/50 p-3 rounded-lg mb-4 border border-purple-900/30">
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

                {/* Lock Timer */}
                {myReservation && lockTimer && (
                    <div className="flex justify-between items-center mb-2 p-2 bg-purple-900/30 rounded">
                        <span className="text-gray-300 text-sm">Reservation expires in:</span>
                        <span className="text-orange-400 font-medium font-mono">{lockTimer}</span>
                    </div>
                )}

                {solanaBalance < price && (
                    <div className="mt-2 text-xs text-red-400">
                        Insufficient balance to purchase this ticket
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 mb-4">
                    <p className="text-red-500 text-sm">{error}</p>
                    <button
                        onClick={() => setError('')}
                        className="mt-2 text-xs text-gray-300 hover:text-white"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Stage */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-2 mb-4 rounded-lg shadow-lg">
                <span className="text-sm font-medium">🎭 STAGE</span>
            </div>

            {/* Seat Legend */}
            <div className="flex flex-wrap justify-center mb-4 gap-3">
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-700 rounded-sm mr-2"></div>
                    <span className="text-gray-400 text-xs">Available</span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-purple-600 rounded-sm mr-2"></div>
                    <span className="text-gray-400 text-xs">Selected</span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-orange-500/60 rounded-sm mr-2"></div>
                    <span className="text-gray-400 text-xs">
                        Locked ({lockedSeats.size})
                    </span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500/80 rounded-sm mr-2"></div>
                    <span className="text-gray-400 text-xs">
                        Processing ({processingSeats.size})
                    </span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500/60 rounded-sm mr-2"></div>
                    <span className="text-gray-400 text-xs">
                        Sold ({debugMintedSeats.length})
                    </span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500/80 rounded-sm mr-2"></div>
                    <span className="text-gray-400 text-xs">Your Seats</span>
                </div>
            </div>

            {/* Seats Grid */}
            <div className="overflow-auto max-h-64 my-2 pb-2 px-1 border border-gray-700 rounded">
                {seatsByRow.map((rowSeats, rowIndex) => (
                    <div
                        key={`row-${rowIndex}`}
                        className="grid gap-1 mx-auto mb-1"
                        style={{
                            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                            maxWidth: `${columns * 28}px`
                        }}
                    >
                        {rowSeats.map(seat => (
                            <div
                                key={seat.code}
                                onClick={() => handleSeatClick(seat)}
                                className={getSeatClasses(seat)}
                                title={getSeatTooltip(seat)}
                            >
                                {seat.col + 1}
                                {/* Status indicators */}
                                {getSeatStatus(seat) === 'selected' && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full"></div>
                                )}
                                {getSeatStatus(seat) === 'processing' && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                )}
                                {getSeatStatus(seat) === 'locked' && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"></div>
                                )}
                                {getSeatStatus(seat) === 'minted' && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full"></div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Current Selection Display */}
            {myReservation && (
                <div className="mt-4 p-3 bg-purple-900/30 border border-purple-700 rounded-lg">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-purple-300 text-sm font-medium">
                                🎫 Selected: Seat {myReservation.seatKey.split('-').pop()}
                            </p>
                            {lockTimer && (
                                <p className="text-orange-400 text-xs font-mono">
                                    ⏰ Expires in: {lockTimer}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={releaseSeatReservation}
                            disabled={connectionStatus === 'releasing'}
                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                        >
                            {connectionStatus === 'releasing' ? 'Releasing...' : 'Release'}
                        </button>
                    </div>
                </div>
            )}

            {/* System Status Footer */}
            <div className="mt-4 text-center border-t border-gray-700 pt-3">
                <p className="text-xs text-gray-500">
                    🔄 Last updated: {new Date(lastUpdate).toLocaleTimeString()} •
                    {autoRefreshEnabled ? ' Auto-refresh ON (2s)' : ' Auto-refresh OFF'} •
                    WebSocket + API Polling Mode
                </p>

                {/* Real-time activity indicators */}
                <div className="flex justify-center space-x-4 mt-2 text-xs">
                    {lockedSeats.size > 0 && (
                        <span className="text-orange-400">
                            🔒 {lockedSeats.size} seat(s) locked
                        </span>
                    )}
                    {processingSeats.size > 0 && (
                        <span className="text-yellow-400">
                            ⚙️ {processingSeats.size} seat(s) processing
                        </span>
                    )}
                    {debugMintedSeats.length > 0 && (
                        <span className="text-red-400">
                            🎫 {debugMintedSeats.length} seat(s) sold
                        </span>
                    )}
                </div>

                {/* WebSocket connection status */}
                <div className="flex justify-center mt-2">
                    <span className={`text-xs ${socketService.getStatus().connected ? 'text-green-400' : 'text-red-400'}`}>
                        WebSocket: {socketService.getStatus().connected ? 'Connected' : 'Disconnected'}
                        {socketService.getStatus().socketId && ` (ID: ${socketService.getStatus().socketId.substring(0, 8)}...)`}
                    </span>
                </div>

                {/* Manual refresh button */}
                {connectionStatus === 'error' && (
                    <div className="mt-2">
                        <button
                            onClick={handleRefresh}
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                            Connection error? Try manual refresh
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SeatSelector;