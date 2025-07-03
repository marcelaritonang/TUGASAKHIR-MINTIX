// frontend/src/components/SeatSelector.js - COMPLETE VERSION dengan Theater Style Numbering
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import LoadingSpinner from './common/LoadingSpinner';
import ApiService from '../services/ApiService';
import blockchainService from '../services/blockchain';
import socketService from '../services/socketService';

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
    const [lockedSeats, setLockedSeats] = useState(new Map());
    const [processingSeats, setProcessingSeats] = useState(new Set());
    const [myReservation, setMyReservation] = useState(null);
    const [lockTimer, setLockTimer] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connected');
    const [lastUpdate, setLastUpdate] = useState(Date.now());
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

    // Enhanced UI state
    const [hoveredSeat, setHoveredSeat] = useState(null);
    const [debugMintedSeats, setDebugMintedSeats] = useState([]);
    const [debugInfo, setDebugInfo] = useState('');
    const [numberingFormat, setNumberingFormat] = useState('theater'); // 'theater', 'sequential', 'column'

    // Refs
    const lockTimerRef = useRef(null);
    const myTicketsRef = useRef([]);
    const pollingIntervalRef = useRef(null);

    // ✅ ENHANCED: Polling dengan debugging
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

    // ✅ ENHANCED: Setup WebSocket connection
    useEffect(() => {
        if (!wallet?.connected || !concertId) return;

        const setupSocketConnection = async () => {
            try {
                await socketService.connect();
                socketService.authenticate(wallet.publicKey.toString(), concertId);

                // Setup event listeners
                const handleSeatStatusUpdate = (data) => {
                    console.log('🎫 Real-time seat update:', data);

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

                socketService.on('seatStatusUpdate', handleSeatStatusUpdate);
                socketService.on('seatLocked', handleSeatLocked);
                socketService.on('lockExpired', handleLockExpired);
                socketService.on('lockExpiring', handleLockExpiring);

                console.log('✅ WebSocket connection established for concert:', concertId);

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

    // ✅ FIXED: Generate seat layout dengan Theater Style numbering
    useEffect(() => {
        if (!ticketType || !selectedConcert) {
            setAvailableSeats([]);
            return;
        }

        generateSeats();
    }, [ticketType, selectedConcert, debugMintedSeats, refreshTrigger, numberingFormat]);

    // ✅ ENHANCED: Refresh dengan debugging
    const refreshSeatStatus = async () => {
        if (!concertId) return;

        try {
            setConnectionStatus('checking');

            // Get minted seats
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

    // ✅ FIXED: Generate seats dengan THEATER STYLE numbering
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
                        // ✅ THEATER STYLE: Proper seat numbering
                        const rowLabel = String.fromCharCode(65 + row); // A, B, C, D...
                        const colNumber = col + 1; // 1, 2, 3, 4...

                        // Database format: VIP-A1, VIP-A2, VIP-B1, VIP-B2, dst
                        const seatCode = `${ticketType}-${rowLabel}${colNumber}`;
                        const seatNumberCode = `${rowLabel}${colNumber}`; // A1, A2, B1, B2

                        // ✅ DISPLAY FORMAT berdasarkan pilihan
                        let displayNumber;
                        switch (numberingFormat) {
                            case 'theater':
                                displayNumber = `${rowLabel}${colNumber}`; // A1, A2, B1, B2
                                break;
                            case 'sequential':
                                displayNumber = seatNumber.toString(); // 1, 2, 3, 4, 5
                                break;
                            case 'column':
                                displayNumber = colNumber.toString(); // 1, 2, 3 (restart per row)
                                break;
                            default:
                                displayNumber = `${rowLabel}${colNumber}`;
                        }

                        console.log(`Generated seat: ${seatCode} (Display: ${displayNumber})`);

                        // Check if minted using debugMintedSeats
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
                            code: seatCode,              // VIP-A1, VIP-A2, dst
                            seatNumberCode,              // A1, A2, dst (for database)
                            displayNumber,               // A1, A2 atau 1, 2 dst (for UI)
                            row,
                            col,
                            rowLabel,                    // A, B, C, dst
                            colNumber,                   // 1, 2, 3, dst
                            sequentialNumber: seatNumber, // 1, 2, 3, 4, 5, dst
                            isMinted,
                            isOwned
                        });
                    }
                }
            }

            setAvailableSeats(allSeats);

            const mintedCount = allSeats.filter(seat => seat.isMinted).length;
            console.log(`Generated ${allSeats.length} seats for ${ticketType}, ${mintedCount} are minted`);

            // Debug: Log first few seat codes
            const firstFewSeats = allSeats.slice(0, 5).map(s => `${s.displayNumber}(${s.code})`);
            console.log(`First 5 seats: [${firstFewSeats.join(', ')}]`);
            console.log(`API minted seats: [${debugMintedSeats.join(', ')}]`);

        } catch (err) {
            console.error('Error generating seats:', err);
            setError(err.message || 'Failed to create seat layout');
        } finally {
            setLoading(false);
        }
    }, [ticketType, selectedConcert, debugMintedSeats, numberingFormat, myTicketsRef]);

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
                setError(`You already own seat ${seat.displayNumber}`);
            } else {
                setError(`Seat ${seat.displayNumber} is already sold`);
            }
            return;
        }

        // Check if seat is locked by someone else
        const seatLock = lockedSeats.get(seat.code);
        if (seatLock && seatLock.lockedBy === 'other') {
            setError(`Seat ${seat.displayNumber} is currently selected by another user`);
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

    // ✅ ENHANCED: Get seat CSS classes dengan hover effects
    const getSeatClasses = (seat) => {
        const status = getSeatStatus(seat);
        const isHovered = hoveredSeat === seat.code;
        const baseClasses = `
            relative w-10 h-10 flex items-center justify-center rounded-lg text-xs font-medium
            transition-all duration-200 cursor-pointer transform
            ${isHovered && status === 'available' ? 'scale-105 shadow-lg z-10' : ''}
        `;

        const statusStyles = {
            owned: 'bg-green-500 text-white border-2 border-green-300 shadow-green-500/30',
            minted: 'bg-red-500 text-white opacity-75 cursor-not-allowed',
            processing: 'bg-yellow-500 text-white animate-pulse cursor-wait',
            selected: 'bg-purple-600 text-white border-2 border-purple-400 shadow-lg scale-105',
            locked: 'bg-orange-500 text-white opacity-80 cursor-not-allowed',
            available: `bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105 border border-gray-600
                        ${isHovered ? 'border-blue-400 bg-gray-600 shadow-md' : ''}`
        };

        return `${baseClasses} ${statusStyles[status]}`;
    };

    // Get seat tooltip
    const getSeatTooltip = (seat) => {
        const status = getSeatStatus(seat);
        const tooltips = {
            owned: `${seat.displayNumber} (Your Seat)`,
            minted: `${seat.displayNumber} (Already Sold)`,
            processing: `${seat.displayNumber} (Being Processed)`,
            selected: `${seat.displayNumber} (Selected by You)`,
            locked: `${seat.displayNumber} (Selected by Another User)`,
            available: `${seat.displayNumber} (Available - Click to select)`
        };
        return tooltips[status] || seat.displayNumber;
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

    // Get seat statistics
    const seatStats = {
        total: availableSeats.length,
        available: availableSeats.filter(s => getSeatStatus(s) === 'available').length,
        taken: availableSeats.filter(s => ['minted', 'owned'].includes(getSeatStatus(s))).length,
        locked: Array.from(lockedSeats.values()).length,
        processing: processingSeats.size
    };

    // Group seats by row for display
    const seatsByRow = [];
    for (let r = 0; r < rows; r++) {
        seatsByRow.push(availableSeats.filter(seat => seat.row === r));
    }

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
        };
    }, []);

    // Render loading state
    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <LoadingSpinner />
                <span className="ml-3 text-gray-300">Loading seat layout...</span>
            </div>
        );
    }

    // Render if no concert or ticket type selected
    if (!ticketType || !selectedConcert) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-400">Please select a concert and ticket type first</p>
            </div>
        );
    }

    // No seats available
    if (availableSeats.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No seats available for this category</p>
                <button
                    onClick={handleRefresh}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                >
                    Try refreshing
                </button>
            </div>
        );
    }

    // Get section info
    const section = selectedConcert.sections.find(s => s.name === ticketType);
    const price = section ? section.price : 0;

    return (
        <div className="seat-selector">
            {/* ✅ DEBUG INFO SECTION (dapat dihapus di production) */}
            {process.env.NODE_ENV === 'development' && debugInfo && (
                <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-3 mb-4">
                    <p className="text-blue-400 text-sm font-bold">🔍 DEBUG INFO:</p>
                    <p className="text-blue-300 text-xs">{debugInfo}</p>
                    <p className="text-blue-300 text-xs">Concert ID: {concertId}</p>
                    <p className="text-blue-300 text-xs">Numbering: {numberingFormat}</p>
                    <p className="text-blue-300 text-xs">Minted Seats: [{debugMintedSeats.join(', ')}]</p>
                </div>
            )}

            {/* Header with Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
                <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Select Your Seat</h3>
                    <p className="text-gray-400 text-sm">
                        {selectedConcert.name} • {ticketType} Section • {price} SOL
                    </p>
                </div>

                {/* Controls */}
                <div className="flex items-center space-x-4">
                    {/* Numbering Format Toggle */}
                    <div className="flex items-center bg-gray-800 rounded-lg p-1">
                        <button
                            onClick={() => setNumberingFormat('theater')}
                            className={`px-2 py-1 text-xs rounded transition-colors ${numberingFormat === 'theater'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                            title="Theater style: A1, A2, B1, B2"
                        >
                            A1
                        </button>
                        <button
                            onClick={() => setNumberingFormat('sequential')}
                            className={`px-2 py-1 text-xs rounded transition-colors ${numberingFormat === 'sequential'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                            title="Sequential: 1, 2, 3, 4, 5"
                        >
                            123
                        </button>
                        <button
                            onClick={() => setNumberingFormat('column')}
                            className={`px-2 py-1 text-xs rounded transition-colors ${numberingFormat === 'column'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                            title="Column per row: 1-9, 1-9, 1-9"
                        >
                            1-9
                        </button>
                    </div>

                    {/* Connection Status */}
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-400' :
                                connectionStatus === 'reserved' ? 'bg-blue-400' :
                                    connectionStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                            }`}></div>
                        <span className="text-xs text-gray-400">
                            {connectionStatus === 'connected' && 'Real-time'}
                            {connectionStatus === 'reserved' && 'Seat reserved'}
                            {connectionStatus === 'error' && 'Connection error'}
                            {connectionStatus === 'checking' && 'Updating...'}
                            {connectionStatus === 'reserving' && 'Reserving...'}
                            {connectionStatus === 'releasing' && 'Releasing...'}
                        </span>
                    </div>

                    {/* Auto-refresh Toggle */}
                    <button
                        onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${autoRefreshEnabled
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-600 text-gray-300'
                            }`}
                        title={autoRefreshEnabled ? 'Disable auto-refresh' : 'Enable auto-refresh'}
                    >
                        Auto: {autoRefreshEnabled ? 'ON' : 'OFF'}
                    </button>

                    {/* Manual Refresh */}
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="text-xs bg-gray-700 hover:bg-gray-600 p-2 rounded disabled:opacity-50 transition-colors"
                        title="Manual refresh"
                    >
                        <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Enhanced Statistics Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">{seatStats.total}</div>
                    <div className="text-xs text-gray-400">Total Seats</div>
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
                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-yellow-400">{seatStats.processing}</div>
                    <div className="text-xs text-gray-400">Processing</div>
                </div>
            </div>

            {/* Price and Balance Info */}
            <div className="bg-gray-800/50 p-4 rounded-lg mb-6 border border-purple-900/30">
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
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="text-red-400 text-sm font-medium">{error}</p>
                            <p className="text-red-300 text-xs mt-1">Please try selecting a different seat</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setError('')}
                        className="text-red-400 hover:text-red-300 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Stage Indicator */}
            <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white text-center py-3 mb-6 rounded-lg shadow-lg">
                <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12 6-12 7z" />
                    </svg>
                    <span className="text-sm font-medium">STAGE</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </div>
            </div>

            {/* Enhanced Seat Legend */}
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-2 mb-6 text-xs">
                {[
                    { status: 'available', color: 'bg-gray-700', label: 'Available', count: seatStats.available },
                    { status: 'selected', color: 'bg-purple-600', label: 'Selected', count: myReservation ? 1 : 0 },
                    { status: 'locked', color: 'bg-orange-500', label: 'Locked', count: seatStats.locked },
                    { status: 'processing', color: 'bg-yellow-500', label: 'Processing', count: seatStats.processing },
                    { status: 'taken', color: 'bg-red-500', label: 'Sold', count: seatStats.taken }
                ].map(({ status, color, label, count }) => (
                    <div key={status} className="flex items-center space-x-2">
                        <div className={`w-3 h-3 ${color} rounded-sm`}></div>
                        <span className="text-gray-400">{label}</span>
                        {count > 0 && (
                            <span className="text-gray-500">({count})</span>
                        )}
                    </div>
                ))}
            </div>

            {/* ✅ ENHANCED: Seats Display dengan Theater Layout */}
            <div className="overflow-auto max-h-96 border border-gray-700 rounded-lg p-4 bg-gray-950">
                <div className="space-y-4">
                    {seatsByRow.map((rowSeats, rowIndex) => (
                        <div key={`row-${rowIndex}`} className="flex items-center">
                            {/* Row Label - hanya tampil jika bukan sequential numbering */}
                            {numberingFormat !== 'sequential' && (
                                <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-4 flex-shrink-0">
                                    {String.fromCharCode(65 + rowIndex)} {/* A, B, C, dst */}
                                </div>
                            )}

                            {/* Seats dalam row ini */}
                            <div className="flex gap-2 flex-wrap">
                                {rowSeats.map(seat => (
                                    <div
                                        key={seat.code}
                                        onClick={() => handleSeatClick(seat)}
                                        onMouseEnter={() => setHoveredSeat(seat.code)}
                                        onMouseLeave={() => setHoveredSeat(null)}
                                        className={getSeatClasses(seat)}
                                        title={getSeatTooltip(seat)}
                                    >
                                        {seat.displayNumber}

                                        {/* Status Indicators */}
                                        {getSeatStatus(seat) === 'selected' && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full border border-white"></div>
                                        )}
                                        {getSeatStatus(seat) === 'processing' && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                                        )}
                                        {getSeatStatus(seat) === 'locked' && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full"></div>
                                        )}
                                        {getSeatStatus(seat) === 'minted' && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full"></div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Row info */}
                            <div className="ml-4 text-gray-400 text-xs">
                                {rowSeats.filter(s => getSeatStatus(s) === 'available').length} available
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Current Selection Display */}
            {myReservation && (
                <div className="mt-6 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700 rounded-lg p-4">
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
                                    <p className="text-orange-400 text-xs font-mono">
                                        ⏰ Expires in: {lockTimer}
                                    </p>
                                )}
                            </div>
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
            <div className="mt-6 text-center border-t border-gray-700 pt-4">
                <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 mb-2">
                    <span>🔄 Last updated: {new Date(lastUpdate).toLocaleTimeString()}</span>
                    <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${socketService.getStatus().connected ? 'bg-green-400' : 'bg-red-400'
                            }`}></div>
                        <span>WebSocket: {socketService.getStatus().connected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                </div>

                {/* Real-time activity indicators */}
                <div className="flex justify-center space-x-4 text-xs">
                    {seatStats.locked > 0 && (
                        <span className="text-orange-400">
                            🔒 {seatStats.locked} seat(s) locked
                        </span>
                    )}
                    {seatStats.processing > 0 && (
                        <span className="text-yellow-400">
                            ⚙️ {seatStats.processing} seat(s) processing
                        </span>
                    )}
                    {seatStats.taken > 0 && (
                        <span className="text-red-400">
                            🎫 {seatStats.taken} seat(s) sold
                        </span>
                    )}
                </div>

                {/* Connection error recovery */}
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