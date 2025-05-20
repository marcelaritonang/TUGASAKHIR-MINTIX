// src/components/SeatSelector.js
import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import LoadingSpinner from './common/LoadingSpinner';
import ApiService from '../services/ApiService';
import blockchainService from '../services/blockchain';

const SeatSelector = ({ ticketType, concertId, selectedConcert, onSeatSelected, mintedSeats = [], refreshTrigger, ticketPrice = 0.01 }) => {
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [availableSeats, setAvailableSeats] = useState([]);
    const [selectedSeat, setSelectedSeat] = useState('');
    const [rows, setRows] = useState(0);
    const [columns, setColumns] = useState(0);
    const [solanaBalance, setSolanaBalance] = useState(0);
    const [exactMintedSeats, setExactMintedSeats] = useState([]);
    const [sectionAvailableSeats, setSectionAvailableSeats] = useState(0);
    const [sectionTotalSeats, setSectionTotalSeats] = useState(0);
    const [refreshInterval, setRefreshInterval] = useState(null);
    const [myTickets, setMyTickets] = useState([]); // State to store user's tickets

    // Ref to prevent multiple API calls
    const loadingRef = useRef(false);
    const lastRefreshRef = useRef(Date.now());

    // Debug log
    useEffect(() => {
        console.log("SeatSelector Props:", {
            ticketType,
            concertId,
            mintedSeats: mintedSeats?.length || 0,
            refreshTrigger
        });
    }, [ticketType, concertId, mintedSeats, refreshTrigger]);

    // Load user's tickets to check owned seats
    useEffect(() => {
        const loadUserTickets = async () => {
            if (!wallet || !wallet.connected || !concertId) return;

            try {
                // Check if already authenticated
                const token = localStorage.getItem('auth_token');
                if (!token) return;

                // Get user's tickets
                const userTickets = await ApiService.getMyTickets();

                // Filter tickets for current concert
                const concertTickets = userTickets.filter(ticket =>
                    ticket.concertId === concertId
                );

                console.log(`Loaded ${concertTickets.length} user tickets for concert ${concertId}`);
                setMyTickets(concertTickets);
            } catch (err) {
                console.error("Error loading user tickets:", err);
            }
        };

        loadUserTickets();
    }, [wallet, wallet.connected, concertId, refreshTrigger]);

    // Set up polling for automatic refresh of minted seats
    useEffect(() => {
        // Clear existing interval if any
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }

        // Only set up polling if there is a concertId and ticketType
        if (concertId && ticketType) {
            // Set interval for refreshing data every 10 seconds
            const interval = setInterval(() => {
                const now = Date.now();
                // Avoid refreshing too often (minimum 8 seconds since last refresh)
                if (now - lastRefreshRef.current >= 8000 && !loadingRef.current) {
                    console.log("Auto-refreshing minted seats...");
                    refreshMintedSeats();
                }
            }, 10000);

            setRefreshInterval(interval);
        }

        // Cleanup when component unmounts
        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [concertId, ticketType]);

    // Function to refresh minted seats
    const refreshMintedSeats = async () => {
        if (!concertId || loadingRef.current) return;

        loadingRef.current = true;
        lastRefreshRef.current = Date.now();

        try {
            // Try to use ApiService.getMintedSeats if available
            const result = await ApiService.getMintedSeats(concertId);
            if (result && result.seats) {
                // Filter based on ticket type
                const filtered = result.seats.filter(seat => {
                    return seat.startsWith(`${ticketType}-`);
                });

                // Check if there are changes
                const currentSeats = new Set(exactMintedSeats);
                const newSeats = new Set(filtered);
                let hasChanges = false;

                // Check if number of seats is different
                if (currentSeats.size !== newSeats.size) {
                    hasChanges = true;
                } else {
                    // Check for different seats
                    for (const seat of newSeats) {
                        if (!currentSeats.has(seat)) {
                            hasChanges = true;
                            break;
                        }
                    }
                }

                // Update only if there are changes
                if (hasChanges) {
                    console.log(`Minted seats changed: ${exactMintedSeats.length} → ${filtered.length}`);
                    setExactMintedSeats(filtered);
                    // Regenerate seats
                    generateSeats(filtered);
                }
            }
        } catch (err) {
            console.error("Error refreshing minted seats:", err);
        } finally {
            loadingRef.current = false;
        }
    };

    // Filter minted seats for specific ticket type
    useEffect(() => {
        if (Array.isArray(mintedSeats) && ticketType) {
            // Filter to get only seats matching current ticket type
            const filtered = mintedSeats.filter(seat => {
                // Seat format is typically: "TicketType-SeatCode" (e.g., "VIP-A12")
                return seat.startsWith(`${ticketType}-`);
            });

            console.log(`Filtered seats for ${ticketType}:`, filtered);
            setExactMintedSeats(filtered);

            // If selectedConcert is available, update available seats count
            if (selectedConcert) {
                const section = selectedConcert.sections.find(s => s.name === ticketType);
                if (section) {
                    // Set available seats based on total seats minus sold seats
                    const availableCount = Math.max(0, section.totalSeats - filtered.length);
                    setSectionAvailableSeats(availableCount);
                    setSectionTotalSeats(section.totalSeats);

                    // Important: Update section.availableSeats in selectedConcert prop
                    // by calling the callback to update
                    if (section.availableSeats !== availableCount) {
                        console.log(`Updating available seats for ${ticketType}: ${availableCount}/${section.totalSeats}`);
                        // Send data change via onSeatSelected with special parameter
                        onSeatSelected(null, {
                            updateAvailability: true,
                            ticketType: ticketType,
                            availableSeats: availableCount,
                            totalSeats: section.totalSeats
                        });
                    }
                }
            }
        } else {
            setExactMintedSeats([]);
        }
    }, [mintedSeats, ticketType, selectedConcert]);

    // Fetch Solana wallet balance
    useEffect(() => {
        const fetchSolanaBalance = async () => {
            if (wallet && wallet.publicKey) {
                try {
                    // Use blockchainService to get balance
                    const balance = await blockchainService.getSolanaBalance(wallet.publicKey);
                    setSolanaBalance(balance);
                    console.log(`Solana balance: ${balance} SOL`);
                } catch (err) {
                    console.error("Error fetching Solana balance:", err);
                }
            }
        };

        fetchSolanaBalance();
    }, [wallet, wallet.publicKey]);

    // Generate seat layout when component loads or props change
    useEffect(() => {
        if (!ticketType || !selectedConcert) {
            setAvailableSeats([]);
            return;
        }

        generateSeats();
    }, [ticketType, selectedConcert, exactMintedSeats, refreshTrigger, myTickets]);

    // Check if seat is owned by current user
    const isOwnedByUser = (seatCode) => {
        return myTickets.some(ticket =>
            ticket.sectionName === ticketType &&
            ticket.seatNumber === seatCode.split('-')[1]
        );
    };

    // Generate seat layout based on total seats and minted seats
    const generateSeats = (mintedSeatsArray = null) => {
        setLoading(true);
        setError('');

        try {
            // Find selected ticket section
            const section = selectedConcert.sections.find(s => s.name === ticketType);

            if (!section) {
                throw new Error(`Ticket type ${ticketType} not found`);
            }

            // Use mintedSeatsArray parameter if provided, otherwise use exactMintedSeats state
            const seatsToCheck = mintedSeatsArray || exactMintedSeats;

            console.log(`Generating seats for ${ticketType}:`, {
                availableSeats: section.availableSeats,
                totalSeats: section.totalSeats,
                exactMintedSeats: seatsToCheck.length
            });

            // Calculate correct available seats
            const realAvailableSeats = section.totalSeats - seatsToCheck.length;
            setSectionAvailableSeats(realAvailableSeats);
            setSectionTotalSeats(section.totalSeats);

            // Determine seat layout (rows and columns)
            const totalSeats = section.totalSeats;
            const aspectRatio = 2; // Width:height ratio

            // Calculate number of rows and columns
            let cols = Math.ceil(Math.sqrt(totalSeats * aspectRatio));
            let rows = Math.ceil(totalSeats / cols);

            // Ensure seats are sufficient
            if (rows * cols < totalSeats) {
                cols += 1;
            }

            setRows(rows);
            setColumns(cols);

            // Create array of seats with appropriate codes
            const allSeats = [];
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const seatNumber = row * cols + col + 1;
                    if (seatNumber <= totalSeats) {
                        // Format: VIP-A12
                        const rowLabel = String.fromCharCode(65 + Math.floor(row / 10)); // A, B, C, ...
                        const seatCode = `${ticketType}-${rowLabel}${seatNumber}`;
                        const seatNumberCode = `${rowLabel}${seatNumber}`;

                        // Check if seat is already minted with exact matching
                        const isMinted = seatsToCheck.includes(seatCode);

                        // Check if seat is owned by current user
                        const isOwned = myTickets.some(ticket =>
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

            console.log(`Generated ${allSeats.length} seats, ${allSeats.filter(s => s.isMinted).length} already minted, ${allSeats.filter(s => s.isOwned).length} owned by user`);
            setAvailableSeats(allSeats);

            // If selected seat is already sold, reset selection
            if (selectedSeat && allSeats.find(s => s.code === selectedSeat)?.isMinted) {
                setSelectedSeat('');
                onSeatSelected('');
            }
        } catch (err) {
            console.error("Error generating seat layout:", err);
            setError(err.message || "Failed to create seat layout");
        } finally {
            setLoading(false);
        }
    };

    // Handler for seat click
    const handleSeatClick = (seat) => {
        if (seat.isMinted) {
            // If seat is owned by the user, show a special message
            if (seat.isOwned) {
                console.log(`Seat ${seat.code} is owned by you`);
                setError(`You already own seat ${seat.seatNumberCode}`);
            } else {
                console.log(`Seat ${seat.code} is already sold and cannot be selected`);
            }
            return; // Don't do anything if seat is already minted
        }

        // Check Solana balance
        if (solanaBalance < ticketPrice) {
            setError(`Insufficient Solana balance. Required: ${ticketPrice} SOL, Your balance: ${solanaBalance.toFixed(4)} SOL`);
            return;
        }

        console.log(`Selecting seat: ${seat.code}`);
        setSelectedSeat(seat.code);
        onSeatSelected(seat.seatNumberCode);  // Pass only the seat number part
    };

    // Handle manual refresh
    const handleRefresh = async () => {
        if (loadingRef.current) return;

        console.log("Manual refreshing minted seats...");
        setLoading(true);
        await refreshMintedSeats();
        setLoading(false);
    };

    // Render loading state
    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <LoadingSpinner />
                <span className="ml-2 text-gray-300">Loading seat layout...</span>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
                <p className="text-red-500 text-sm">{error}</p>
                <button
                    onClick={() => setError('')}
                    className="mt-2 text-xs text-gray-300 hover:text-white"
                >
                    Close
                </button>
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

    // Render if no seats available
    if (availableSeats.length === 0) {
        return (
            <div className="text-center py-4">
                <p className="text-gray-400">No seats available for this category</p>
            </div>
        );
    }

    // Get price from section
    const section = selectedConcert.sections.find(s => s.name === ticketType);
    const price = section ? section.price : 0;

    // Group seats by row for better display
    const seatsByRow = [];
    for (let r = 0; r < rows; r++) {
        seatsByRow.push(availableSeats.filter(seat => seat.row === r));
    }

    return (
        <div className="seat-selector">
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
                <div className="flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                        <span className="text-gray-300 text-sm">Available Seats:</span>
                        <button
                            onClick={handleRefresh}
                            className="text-xs bg-gray-700 hover:bg-gray-600 p-1 rounded"
                            title="Refresh available seats"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                    <span className="text-purple-400 font-medium">
                        {sectionAvailableSeats}/{sectionTotalSeats}
                    </span>
                </div>
                {solanaBalance < price && (
                    <div className="mt-2 text-xs text-red-400">
                        Insufficient balance to purchase this ticket
                    </div>
                )}
            </div>

            {/* Stage */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-2 mb-4 rounded-lg">
                <span className="text-sm font-medium">STAGE</span>
            </div>

            {/* Seat Legend */}
            <div className="flex justify-center mb-4 space-x-4">
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-700 rounded-sm mr-2"></div>
                    <span className="text-gray-400 text-xs">Available</span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-purple-600 rounded-sm mr-2"></div>
                    <span className="text-gray-400 text-xs">Selected</span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500/50 rounded-sm mr-2"></div>
                    <span className="text-gray-400 text-xs">Sold</span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500/50 rounded-sm mr-2"></div>
                    <span className="text-gray-400 text-xs">Your Seats</span>
                </div>
            </div>

            {/* Seats Grid */}
            <div className="overflow-auto max-h-60 my-2 pb-2 px-1">
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
                                className={`
                                    w-6 h-6 flex items-center justify-center rounded-sm text-xs
                                    transition-all duration-200 
                                    ${seat.isOwned
                                        ? 'bg-green-500/50 text-white cursor-not-allowed border border-green-300'
                                        : seat.isMinted
                                            ? 'bg-red-500/50 text-gray-200 cursor-not-allowed'
                                            : selectedSeat === seat.code
                                                ? 'bg-purple-600 text-white cursor-pointer transform hover:scale-110'
                                                : 'bg-gray-700 text-gray-300 cursor-pointer hover:bg-gray-600'
                                    }
                                `}
                                title={`${seat.code} ${seat.isOwned
                                    ? '(Your Seat)'
                                    : seat.isMinted
                                        ? '(Already Sold)'
                                        : ''}`}
                            >
                                {seat.col + 1}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Row Labels */}
            <div className="grid grid-cols-3 gap-2 text-center mt-4">
                {Array.from({ length: Math.min(rows, 9) }).map((_, index) => (
                    <div key={index} className="text-xs text-gray-400">
                        Row {String.fromCharCode(65 + index)}
                    </div>
                ))}
            </div>

            {/* Selected Seat Info */}
            {selectedSeat && (
                <div className="mt-4 text-center">
                    <button
                        onClick={() => onSeatSelected(selectedSeat.split('-')[1])}
                        className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md text-sm transition-colors"
                        disabled={solanaBalance < price}
                    >
                        Select Seat {selectedSeat.split('-')[1]}
                    </button>
                </div>
            )}

            {/* Auto-refresh notification */}
            <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">Seat display automatically refreshes every 10 seconds</p>
            </div>
        </div>
    );
};

export default SeatSelector;