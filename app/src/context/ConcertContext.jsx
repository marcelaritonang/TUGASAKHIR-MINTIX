// src/context/ConcertContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';

// Create the context
const ConcertContext = createContext();

export const ConcertProvider = ({ children }) => {
    const { publicKey, connected } = useWallet();

    // State for concerts
    const [pendingConcerts, setPendingConcerts] = useState([]);
    const [approvedConcerts, setApprovedConcerts] = useState([]);
    const [rejectedConcerts, setRejectedConcerts] = useState([]);
    const [myTickets, setMyTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Refs untuk mencegah infinite loop
    const loadingRef = useRef(false);
    const lastAuthStateRef = useRef(null);
    const ticketsLoadedTimeRef = useRef(null);

    // Tambahkan polling interval untuk auto-refresh
    const pollIntervalRef = useRef(null);

    // Effect to check authentication status saat startup
    useEffect(() => {
        const checkAuth = async () => {
            const isAuth = AuthService.isAuthenticated();
            console.log("Initial authentication status check:", isAuth);
            setIsAuthenticated(isAuth);
            lastAuthStateRef.current = isAuth;

            if (isAuth) {
                // Load initial data if authenticated
                await Promise.all([
                    loadApprovedConcerts(),
                    loadMyPendingConcerts()
                ]);

                // Setup polling untuk approved concerts
                setupPolling();
            }
        };

        checkAuth();

        // Cleanup polling saat komponen unmount
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    // Fungsi untuk setup polling
    const setupPolling = () => {
        // Bersihkan interval yang ada jika ada
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }

        // Set interval baru - cek setiap 10 detik untuk konser baru yang diapprove
        pollIntervalRef.current = setInterval(() => {
            console.log("Polling for new approved concerts...");
            loadApprovedConcerts(true); // Pass true untuk menandakan ini adalah background refresh
        }, 10000); // 10 detik interval
    };

    // Effect untuk handle perubahan wallet connection
    useEffect(() => {
        const handleWalletConnection = async () => {
            console.log("Wallet connection changed:", connected ? "connected" : "disconnected");

            if (connected && publicKey) {
                console.log("Wallet connected:", publicKey.toString());

                if (!isAuthenticated) {
                    try {
                        console.log("Attempting auto-authentication with connected wallet");
                        const success = await AuthService.loginTest(publicKey.toString());

                        if (success) {
                            console.log("Auto-authentication successful");
                            setIsAuthenticated(true);
                            lastAuthStateRef.current = true;

                            // Load data after authentication
                            await Promise.all([
                                loadApprovedConcerts(),
                                loadMyPendingConcerts()
                            ]);

                            // Start polling after successful authentication
                            setupPolling();
                        } else {
                            console.log("Auto-authentication failed");
                        }
                    } catch (err) {
                        console.error("Error during auto-authentication:", err);
                    }
                }
            } else if (!connected) {
                console.log("Wallet disconnected");
                // Hentikan polling ketika wallet disconnect
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }
            }
        };

        handleWalletConnection();
    }, [connected, publicKey]);

    // Effect untuk memuat tiket pengguna ketika autentikasi berubah
    // Ini mencegah pemanggilan loadMyTickets() berulang-ulang
    useEffect(() => {
        // Jangan panggil jika state autentikasi belum berubah
        if (lastAuthStateRef.current === isAuthenticated) {
            return;
        }

        lastAuthStateRef.current = isAuthenticated;

        // Jika terotentikasi dan waktu terakhir load cukup lama, muat tiket
        const currentTime = Date.now();
        const timeSinceLastLoad = ticketsLoadedTimeRef.current
            ? currentTime - ticketsLoadedTimeRef.current
            : Infinity;

        if (isAuthenticated && (timeSinceLastLoad > 10000 || !ticketsLoadedTimeRef.current)) {
            console.log("Loading tickets due to authentication change");
            loadMyTickets();
        }
    }, [isAuthenticated]);

    // Function to load approved concerts - MODIFIED untuk mendukung silent refresh
    const loadApprovedConcerts = async (silent = false) => {
        try {
            // Hanya tampilkan loading indicator jika bukan silent refresh
            if (!silent) setLoading(true);
            console.log("Loading approved concerts" + (silent ? " (silent refresh)" : ""));

            const data = await ApiService.getConcerts(silent);

            console.log("Approved concerts data:", data ? `${Array.isArray(data) ? data.length : 'non-array'}` : 'no data');

            const formattedConcerts = Array.isArray(data)
                ? data.map(formatConcertFromApi)
                : Array.isArray(data?.concerts)
                    ? data.concerts.map(formatConcertFromApi)
                    : [];

            // Periksa apakah data benar-benar berubah sebelum update state
            // Ini mencegah re-render yang tidak perlu
            const currentJSON = JSON.stringify(approvedConcerts.map(c => c.id).sort());
            const newJSON = JSON.stringify(formattedConcerts.map(c => c.id).sort());

            if (currentJSON !== newJSON) {
                console.log("Concert data has changed, updating state with", formattedConcerts.length, "concerts");
                setApprovedConcerts(formattedConcerts);
            } else if (silent) {
                console.log("No changes in concert data detected during silent refresh");
            } else {
                console.log("No changes in concert data detected");
            }

            if (!silent) setLoading(false);
            return formattedConcerts;
        } catch (err) {
            console.error('Error loading approved concerts:', err);
            if (!silent) setLoading(false);
            return [];
        }
    };

    // Function to load my pending concerts
    const loadMyPendingConcerts = async () => {
        if (!AuthService.isAuthenticated()) {
            console.log("Not authenticated, skipping pending concerts load");
            return [];
        }

        try {
            setLoading(true);
            console.log("Loading my pending concerts");

            const response = await fetch(`${ApiService.baseUrl}/concerts/me/pending`, {
                headers: {
                    'x-auth-token': AuthService.getToken()
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch pending concerts: ${response.status}`);
            }

            const data = await response.json();
            console.log("My pending concerts data:", Array.isArray(data) ? data.length : 'not array');

            const formattedConcerts = Array.isArray(data)
                ? data.map(formatConcertFromApi)
                : [];

            console.log("Formatted my pending concerts:", formattedConcerts.length);
            setPendingConcerts(formattedConcerts);
            setLoading(false);
            return formattedConcerts;
        } catch (err) {
            console.error('Error loading my pending concerts:', err);
            setLoading(false);
            return [];
        }
    };

    // Function to load pending concerts for admin
    const loadAdminPendingConcerts = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log("Loading admin pending concerts");

            // Check if user is admin (has valid token)
            const isAdminResult = await AuthService.checkAdminStatus();
            const isAdmin = isAdminResult.isAdmin;

            if (!isAdmin) {
                console.log('User is not admin or not logged in');
                setLoading(false);
                return [];
            }

            // Try to fetch pending concerts from API
            try {
                console.log('Fetching pending concerts from API');
                const apiPendingConcerts = await ApiService.getPendingConcerts();
                console.log('API response for pending concerts:', apiPendingConcerts ? 'received' : 'empty');

                // Format API concerts to match frontend structure
                const formattedPendingConcerts = Array.isArray(apiPendingConcerts) ?
                    apiPendingConcerts.map(formatConcertFromApi) : [];

                console.log('Formatted pending concerts:', formattedPendingConcerts.length);
                setPendingConcerts(formattedPendingConcerts);

                // Save to localStorage as backup
                localStorage.setItem('pendingConcerts', JSON.stringify(formattedPendingConcerts));

                setLoading(false);
                return formattedPendingConcerts;
            } catch (apiError) {
                console.error('Error fetching pending concerts from API:', apiError);

                // Fallback to localStorage if API fails
                const localPendingConcerts = JSON.parse(localStorage.getItem('pendingConcerts') || '[]');
                console.log('Falling back to localStorage for pending concerts:', localPendingConcerts.length);
                setPendingConcerts(localPendingConcerts);

                setLoading(false);
                return localPendingConcerts;
            }
        } catch (err) {
            console.error('Error in loadAdminPendingConcerts:', err);
            setError(err.message || 'An error occurred');
            setLoading(false);
            return [];
        }
    };

    // Helper function to format concert from API response
    const formatConcertFromApi = (concert) => {
        return {
            id: concert._id,
            name: concert.name,
            venue: concert.venue,
            date: concert.date,
            displayDate: new Date(concert.date).toLocaleString(),
            description: concert.description,
            category: concert.category,
            creator: concert.creator,
            posterUrl: concert.posterUrl,
            status: concert.status,
            sections: concert.sections || [],
            totalTickets: concert.totalTickets,
            ticketsSold: concert.ticketsSold || 0,
            createdAt: concert.createdAt,
            updatedAt: concert.updatedAt,
            approvalHistory: (concert.approvalHistory || []).map(history => ({
                action: history.action,
                admin: history.admin,
                message: history.message,
                timestamp: history.timestamp
            }))
        };
    };

    // Function to create a new concert
    const createConcert = async (concertData) => {
        try {
            setLoading(true);
            setError(null);
            console.log("Creating new concert:", concertData.name);

            // Ensure user is authenticated
            if (!AuthService.isAuthenticated()) {
                throw new Error('Authentication required');
            }

            // Calculate total tickets if not provided
            if (!concertData.totalTickets && concertData.sections) {
                const totalTickets = concertData.sections.reduce(
                    (sum, section) => sum + (parseInt(section.totalSeats) || 0),
                    0
                );
                concertData.totalTickets = totalTickets;
            }

            // Prepare data for API
            const apiData = new FormData();

            // Add basic concert data
            apiData.append('name', concertData.name);
            apiData.append('venue', concertData.venue);
            apiData.append('date', concertData.date);

            if (concertData.description) {
                apiData.append('description', concertData.description);
            }

            if (concertData.category) {
                apiData.append('category', concertData.category);
            }

            apiData.append('totalTickets', concertData.totalTickets.toString());

            // Process sections - ensure availableSeats = totalSeats
            const processedSections = (concertData.sections || []).map(section => ({
                name: section.name,
                price: parseFloat(section.price),
                totalSeats: parseInt(section.totalSeats),
                availableSeats: parseInt(section.totalSeats) // Set available = total
            })).filter(section => section.name && section.totalSeats > 0 && section.price > 0);

            apiData.append('sections', JSON.stringify(processedSections));

            // Add poster image if available
            if (concertData.posterImage instanceof File) {
                apiData.append('posterImage', concertData.posterImage);
            }

            // Send to API
            const response = await fetch(`${ApiService.baseUrl}/concerts`, {
                method: 'POST',
                headers: {
                    'x-auth-token': AuthService.getToken()
                },
                body: apiData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `Failed to create concert: ${response.status}`);
            }

            const result = await response.json();
            console.log("Concert created successfully:", result ? result.name || 'unnamed' : 'no data');

            // Format and add to pending concerts
            const newConcert = formatConcertFromApi(result);
            setPendingConcerts(prev => [newConcert, ...prev]);

            setLoading(false);
            return result;
        } catch (err) {
            console.error('Error creating concert:', err);
            setError(err.message || 'Failed to create concert');
            setLoading(false);
            throw err;
        }
    };

    // Function to approve a concert (admin) - MODIFIED untuk refresh konser yang approved
    const approveConcert = async (concertId, feedback) => {
        try {
            setLoading(true);
            setError(null);
            console.log("Approving concert:", concertId);

            // Send approval to API
            const response = await ApiService.approveConcert(concertId, {
                feedback: feedback || 'Approved'
            });

            console.log('Approve concert response:', response ? 'received' : 'empty');

            // Update local state
            setPendingConcerts(prev => prev.filter(concert => concert.id !== concertId));

            // Add to approved concerts
            const approvedConcert = formatConcertFromApi(response);
            setApprovedConcerts(prev => [approvedConcert, ...prev]);

            // Trigger a refresh of approved concerts to ensure consistency
            setTimeout(() => {
                loadApprovedConcerts(true);
            }, 1000);

            setLoading(false);
            return response;
        } catch (err) {
            console.error('Error approving concert:', err);
            setError(err.message || 'Failed to approve concert');
            setLoading(false);
            throw err;
        }
    };

    // Function to reject a concert (admin)
    const rejectConcert = async (concertId, feedback) => {
        try {
            setLoading(true);
            setError(null);
            console.log("Rejecting concert:", concertId);

            // Send rejection to API
            const response = await ApiService.rejectConcert(concertId, {
                feedback: feedback || 'Rejected'
            });

            console.log('Reject concert response:', response ? 'received' : 'empty');

            // Update local state
            setPendingConcerts(prev => prev.filter(concert => concert.id !== concertId));

            // Add to rejected concerts
            const rejectedConcert = formatConcertFromApi(response);
            setRejectedConcerts(prev => [rejectedConcert, ...prev]);

            setLoading(false);
            return response;
        } catch (err) {
            console.error('Error rejecting concert:', err);
            setError(err.message || 'Failed to reject concert');
            setLoading(false);
            throw err;
        }
    };

    // Function to request more info (admin)
    const requestMoreInfo = async (concertId, requestMessage) => {
        try {
            setLoading(true);
            setError(null);
            console.log("Requesting more info for concert:", concertId);

            // Send request to API
            const response = await ApiService.requestMoreInfo(concertId, {
                message: requestMessage
            });

            console.log('Request more info response:', response ? 'received' : 'empty');

            // Update local state - unlike approval/rejection, the concert stays in pending
            const updatedConcert = formatConcertFromApi(response);

            const updatedConcerts = pendingConcerts.map(concert => {
                if (concert.id === concertId) {
                    return updatedConcert;
                }
                return concert;
            });

            setPendingConcerts(updatedConcerts);

            setLoading(false);
            return updatedConcert;
        } catch (err) {
            console.error('Error requesting more info:', err);
            setError(err.message || 'Failed to request more information');
            setLoading(false);
            throw err;
        }
    };

    // Function to mint a ticket
    const mintTicket = async (concertId, sectionName, quantity = 1, seatNumber = null) => {
        try {
            setLoading(true);
            setError(null);
            console.log("Minting ticket:", { concertId, sectionName, quantity, seatNumber });

            // Make sure user is authenticated
            if (!AuthService.isAuthenticated()) {
                if (publicKey) {
                    try {
                        console.log("Auto-authenticating for ticket minting");
                        await AuthService.loginTest(publicKey.toString());
                    } catch (err) {
                        throw new Error('Authentication required');
                    }
                } else {
                    throw new Error('Wallet connection required');
                }
            }

            // Prepare mint data
            const mintData = {
                concertId,
                sectionName,
                quantity
            };

            // Include seat number if provided
            if (seatNumber) {
                mintData.seatNumber = seatNumber;
            }

            // Log details
            console.log("Sending mint request with token:", AuthService.getToken()?.substring(0, 10) + "...");

            // Send request to API
            const response = await fetch(`${ApiService.baseUrl}/tickets/mint`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': AuthService.getToken()
                },
                body: JSON.stringify(mintData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `Failed to mint ticket: ${response.status}`);
            }

            const result = await response.json();
            console.log("Mint ticket result:", result ? (result.success ? 'success' : 'failed') : 'no data');

            // Update approved concerts to reflect the sold tickets
            const updatedConcerts = approvedConcerts.map(concert => {
                if (concert.id === concertId) {
                    const updatedSections = concert.sections.map(section => {
                        if (section.name === sectionName) {
                            return {
                                ...section,
                                availableSeats: Math.max(0, section.availableSeats - quantity)
                            };
                        }
                        return section;
                    });

                    return {
                        ...concert,
                        sections: updatedSections,
                        ticketsSold: (concert.ticketsSold || 0) + quantity
                    };
                }
                return concert;
            });

            setApprovedConcerts(updatedConcerts);

            // Update minted seats cache
            await updateMintedSeatsCache(concertId, sectionName, seatNumber);

            // Get updated tickets
            await loadMyTickets();

            setLoading(false);
            return { success: true, ...result };
        } catch (err) {
            console.error('Error minting ticket:', err);
            setError(err.message || 'Failed to mint ticket');
            setLoading(false);
            throw err;
        }
    };

    // Function to load user's tickets - perbaikan untuk mencegah loop
    const loadMyTickets = useCallback(async () => {
        // Hindari pemanggilan berulang jika sedang loading
        if (loadingRef.current) {
            console.log("Already loading tickets, skipping duplicate call");
            return myTickets;
        }

        // Periksa autentikasi dulu
        if (!AuthService.isAuthenticated()) {
            console.log("Not authenticated, can't load tickets");
            return [];
        }

        // Periksa koneksi wallet
        if (!publicKey) {
            console.log("No wallet connected, can't load tickets");
            return [];
        }

        // Set flag loading
        loadingRef.current = true;

        try {
            setLoading(true);
            console.log("Loading my tickets for wallet:", publicKey.toString());

            // Catat waktu pemuatan
            ticketsLoadedTimeRef.current = Date.now();

            // Ambil tiket dari API
            const response = await fetch(`${ApiService.baseUrl}/tickets`, {
                headers: {
                    'x-auth-token': AuthService.getToken()
                }
            });

            console.log("Tickets API response status:", response.status);

            if (!response.ok) {
                console.error("Error loading tickets:", response.status);
                throw new Error(`Failed to load tickets: ${response.status}`);
            }

            const ticketsData = await response.json();
            console.log(`Tickets loaded: ${Array.isArray(ticketsData) ? ticketsData.length : 'not an array'}`);

            // Validasi respons
            if (!Array.isArray(ticketsData)) {
                console.warn("Tickets response is not an array:", ticketsData);
                // Cek jika ada format berbeda yang perlu ditangani
                const parsedTickets = ticketsData.tickets || ticketsData.data || [];
                setMyTickets(Array.isArray(parsedTickets) ? parsedTickets : []);
            } else {
                setMyTickets(ticketsData);
            }

            // Cache ke localStorage
            localStorage.setItem('myTickets', JSON.stringify(Array.isArray(ticketsData) ? ticketsData : []));

            setLoading(false);
            loadingRef.current = false;
            return ticketsData;
        } catch (err) {
            console.error('Error loading tickets:', err);

            // Coba ambil dari localStorage jika API gagal
            try {
                console.log("Attempting to load tickets from localStorage");
                const cachedTickets = JSON.parse(localStorage.getItem('myTickets') || '[]');
                console.log(`Found ${cachedTickets.length} tickets in localStorage`);
                setMyTickets(cachedTickets);
                setLoading(false);
                loadingRef.current = false;
                return cachedTickets;
            } catch (cacheErr) {
                console.error("Error loading tickets from cache:", cacheErr);
                setMyTickets([]);
                setLoading(false);
                loadingRef.current = false;
                return [];
            }
        }
    }, [publicKey?.toString()]);

    // Function to verify a ticket
    const verifyTicket = async (ticketId) => {
        try {
            setLoading(true);
            setError(null);
            console.log("Verifying ticket:", ticketId);

            // Make sure user is authenticated
            if (!AuthService.isAuthenticated()) {
                throw new Error('Authentication required');
            }

            // Call API to verify ticket
            const result = await ApiService.verifyTicket(ticketId);
            console.log("Verify ticket result:", result ? 'success' : 'failed');

            // Update tickets in state
            await loadMyTickets();

            setLoading(false);
            return result;
        } catch (err) {
            console.error('Error verifying ticket:', err);
            setError(err.message || 'Failed to verify ticket');
            setLoading(false);
            throw err;
        }
    };

    // Function to test login and force load concerts
    const forceReloadConcerts = async () => {
        try {
            setLoading(true);
            console.log("Force reloading concerts");

            // Try test login if not authenticated
            if (!AuthService.isAuthenticated()) {
                if (publicKey) {
                    await AuthService.loginTest(publicKey.toString());
                    setIsAuthenticated(true);
                    lastAuthStateRef.current = true;
                } else {
                    console.log("No wallet connected for test login");
                }
            }

            // Load concerts based on admin status
            const { isAdmin } = await AuthService.checkAdminStatus();
            console.log("Is admin:", isAdmin);

            if (isAdmin) {
                await loadAdminPendingConcerts();
            }

            await loadApprovedConcerts();
            await loadMyPendingConcerts();

            // Reset loading ref before loading tickets
            loadingRef.current = false;
            await loadMyTickets();

            setLoading(false);
            return true;
        } catch (err) {
            console.error('Error in force reload:', err);
            setError(err.message || 'Failed to reload concerts');
            setLoading(false);
            throw err;
        }
    };

    const updateMintedSeatsCache = async (concertId, sectionName, seatNumber) => {
        try {
            // Get current minted seats from localStorage
            const cacheKey = `minted_seats_${concertId}`;
            const cachedSeats = JSON.parse(localStorage.getItem(cacheKey) || '[]');

            // Format seat code: "SectionName-SeatNumber"
            const seatCode = seatNumber || `${sectionName}-AUTO`;

            // Add to cached seats if not already present
            if (!cachedSeats.includes(seatCode)) {
                cachedSeats.push(seatCode);
                localStorage.setItem(cacheKey, JSON.stringify(cachedSeats));
            }

            console.log(`Updated minted seats cache for concert ${concertId}, added seat ${seatCode}`);

            // Now refresh from API to ensure consistency
            try {
                const freshMintedSeats = await ApiService.getMintedSeats(concertId);
                // No need to do anything with the result - the API call will update its own cache
            } catch (err) {
                console.warn("Could not refresh minted seats from API:", err);
                // Continue using local cache since we've already updated it
            }

            return true;
        } catch (err) {
            console.error("Error updating minted seats cache:", err);
            return false;
        }
    };

    // Function to get minted seats for a concert
    const getMintedSeats = async (concertId) => {
        try {
            console.log("Getting minted seats for concert:", concertId);

            // Call API to get minted seats
            const result = await ApiService.getMintedSeats(concertId);
            console.log("Minted seats result:", result ? `${result.seats?.length || 0} seats` : 'no data');

            return result?.seats || [];
        } catch (err) {
            console.error('Error getting minted seats:', err);

            // Try to get from cache if API fails
            try {
                const cacheKey = `minted_seats_${concertId}`;
                const cachedSeats = JSON.parse(localStorage.getItem(cacheKey) || '[]');
                console.log(`Retrieved ${cachedSeats.length} seats from cache`);
                return cachedSeats;
            } catch (cacheErr) {
                console.error('Error reading cache:', cacheErr);
                return [];
            }
        }
    };
    // Create context value
    const contextValue = {
        pendingConcerts,
        approvedConcerts,
        rejectedConcerts,
        myTickets,
        loading,
        error,
        isAuthenticated,
        createConcert,
        loadApprovedConcerts,
        loadMyPendingConcerts,
        loadAdminPendingConcerts,
        approveConcert,
        rejectConcert,
        requestMoreInfo,
        mintTicket,
        loadMyTickets,
        verifyTicket,
        forceReloadConcerts,
        getMintedSeats
    };

    return (
        <ConcertContext.Provider value={contextValue}>
            {children}
        </ConcertContext.Provider>
    );
};

// Custom hook to use context
export const useConcerts = () => {
    const context = useContext(ConcertContext);
    if (!context) {
        throw new Error('useConcerts must be used within a ConcertProvider');
    }
    return context;
};