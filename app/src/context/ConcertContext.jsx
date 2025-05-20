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

    // Function to load pending concerts for admin - PERBAIKAN UTAMA
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

            let pendingConcertsData = [];
            let success = false;

            // Try multiple methods to get pending concerts
            // Method 1: Use ApiService.getPendingConcerts if available
            try {
                if (typeof ApiService.getPendingConcerts === 'function') {
                    console.log('Using ApiService.getPendingConcerts');
                    pendingConcertsData = await ApiService.getPendingConcerts();
                    console.log('API response for pending concerts:', pendingConcertsData ? 'received' : 'empty');
                    success = true;
                } else {
                    throw new Error('ApiService.getPendingConcerts not available');
                }
            } catch (apiError) {
                console.error('Error using ApiService.getPendingConcerts:', apiError);

                // Method 2: Try direct fetch to main endpoint
                try {
                    console.log('Trying direct fetch to concerts/pending endpoint');
                    const response = await fetch('http://localhost:5000/api/concerts/pending', {
                        headers: {
                            'x-auth-token': AuthService.getToken()
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`API returned ${response.status}`);
                    }

                    pendingConcertsData = await response.json();
                    console.log('Direct fetch successful:', pendingConcertsData.length, 'concerts');
                    success = true;
                } catch (fetchError) {
                    console.error('Error with direct fetch:', fetchError);

                    // Method 3: Try admin endpoint
                    try {
                        console.log('Trying admin endpoint');
                        const adminResponse = await fetch('http://localhost:5000/api/admin/concerts/pending', {
                            headers: {
                                'x-auth-token': AuthService.getToken()
                            }
                        });

                        if (!adminResponse.ok) {
                            throw new Error(`Admin API returned ${adminResponse.status}`);
                        }

                        pendingConcertsData = await adminResponse.json();
                        console.log('Admin endpoint fetch successful:', pendingConcertsData.length, 'concerts');
                        success = true;
                    } catch (adminError) {
                        console.error('Error with admin endpoint:', adminError);
                    }
                }
            }

            // Fallback to localStorage if all API calls failed
            if (!success) {
                console.log('Falling back to localStorage for pending concerts');
                const localPendingConcerts = JSON.parse(localStorage.getItem('pendingConcerts') || '[]');
                console.log('Retrieved', localPendingConcerts.length, 'concerts from localStorage');
                pendingConcertsData = localPendingConcerts;
            } else {
                // If API call was successful, update localStorage
                localStorage.setItem('pendingConcerts', JSON.stringify(pendingConcertsData));
            }

            // Format API concerts to match frontend structure
            const formattedPendingConcerts = Array.isArray(pendingConcertsData) ?
                pendingConcertsData.map(formatConcertFromApi) : [];

            console.log('Formatted pending concerts:', formattedPendingConcerts.length);
            setPendingConcerts(formattedPendingConcerts);
            setLoading(false);

            return formattedPendingConcerts;
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
            id: concert._id || concert.id,
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

    // Function to approve a concert (admin) - PERBAIKAN UTAMA
    const approveConcert = async (concertId, feedback) => {
        try {
            setLoading(true);
            setError(null);
            console.log(`Approving concert with ID: ${concertId}`);

            // Ensure we have auth token
            const token = AuthService.getToken();
            if (!token) {
                await AuthService.loginTest();
            }

            let approvedConcertData = null;
            let success = false;

            // Try multiple methods to approve the concert
            // Method 1: Try ApiService if available
            try {
                if (typeof ApiService.approveConcert === 'function') {
                    console.log('Using ApiService.approveConcert');
                    approvedConcertData = await ApiService.approveConcert(concertId, feedback || 'Approved');
                    success = true;
                } else {
                    throw new Error('ApiService.approveConcert not available');
                }
            } catch (apiError) {
                console.error('Error using ApiService.approveConcert:', apiError);

                // Method 2: Try direct fetch to concerts endpoint
                try {
                    console.log('Trying direct fetch to concerts endpoint');
                    const response = await fetch(`http://localhost:5000/api/concerts/${concertId}/approve`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': AuthService.getToken()
                        },
                        body: JSON.stringify({ feedback: feedback || 'Approved' })
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.msg || `API returned ${response.status}`);
                    }

                    approvedConcertData = await response.json();
                    success = true;
                } catch (fetchError) {
                    console.error('Error with concerts endpoint:', fetchError);

                    // Method 3: Try admin endpoint
                    try {
                        console.log('Trying admin endpoint');
                        const adminResponse = await fetch(`http://localhost:5000/api/admin/concerts/${concertId}/approve`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-auth-token': AuthService.getToken()
                            },
                            body: JSON.stringify({ feedback: feedback || 'Approved' })
                        });

                        if (!adminResponse.ok) {
                            const errorData = await adminResponse.json().catch(() => ({}));
                            throw new Error(errorData.msg || `Admin API returned ${adminResponse.status}`);
                        }

                        approvedConcertData = await adminResponse.json();
                        success = true;
                    } catch (adminError) {
                        console.error('Error with admin endpoint:', adminError);
                    }
                }
            }

            if (!success || !approvedConcertData) {
                throw new Error('Failed to approve concert after trying all methods');
            }

            console.log('Concert approved successfully:', approvedConcertData.name || approvedConcertData.id);

            // Update local state
            setPendingConcerts(prev => prev.filter(concert =>
                concert.id !== concertId && concert._id !== concertId
            ));

            // Add to approved concerts
            const approvedConcert = formatConcertFromApi(approvedConcertData);
            setApprovedConcerts(prev => [approvedConcert, ...prev]);

            // Trigger a refresh of approved concerts to ensure consistency
            setTimeout(() => {
                loadApprovedConcerts(true);
            }, 1000);

            setLoading(false);
            return approvedConcertData;
        } catch (err) {
            console.error('Error approving concert:', err);
            setError(err.message || 'Failed to approve concert');
            setLoading(false);
            throw err;
        }
    };

    // Function to reject a concert (admin) - PERBAIKAN UTAMA
    const rejectConcert = async (concertId, feedback) => {
        try {
            setLoading(true);
            setError(null);
            console.log(`Rejecting concert with ID: ${concertId}`);

            // Ensure we have auth token
            const token = AuthService.getToken();
            if (!token) {
                await AuthService.loginTest();
            }

            let rejectedConcertData = null;
            let success = false;

            // Try multiple methods to reject the concert
            // Method 1: Try ApiService if available
            try {
                if (typeof ApiService.rejectConcert === 'function') {
                    console.log('Using ApiService.rejectConcert');
                    rejectedConcertData = await ApiService.rejectConcert(concertId, feedback);
                    success = true;
                } else {
                    throw new Error('ApiService.rejectConcert not available');
                }
            } catch (apiError) {
                console.error('Error using ApiService.rejectConcert:', apiError);

                // Method 2: Try direct fetch to concerts endpoint
                try {
                    console.log('Trying direct fetch to concerts endpoint');
                    const response = await fetch(`http://localhost:5000/api/concerts/${concertId}/reject`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': AuthService.getToken()
                        },
                        body: JSON.stringify({ feedback })
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.msg || `API returned ${response.status}`);
                    }

                    rejectedConcertData = await response.json();
                    success = true;
                } catch (fetchError) {
                    console.error('Error with concerts endpoint:', fetchError);

                    // Method 3: Try admin endpoint
                    try {
                        console.log('Trying admin endpoint');
                        const adminResponse = await fetch(`http://localhost:5000/api/admin/concerts/${concertId}/reject`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-auth-token': AuthService.getToken()
                            },
                            body: JSON.stringify({ feedback })
                        });

                        if (!adminResponse.ok) {
                            const errorData = await adminResponse.json().catch(() => ({}));
                            throw new Error(errorData.msg || `Admin API returned ${adminResponse.status}`);
                        }

                        rejectedConcertData = await adminResponse.json();
                        success = true;
                    } catch (adminError) {
                        console.error('Error with admin endpoint:', adminError);
                    }
                }
            }

            if (!success || !rejectedConcertData) {
                throw new Error('Failed to reject concert after trying all methods');
            }

            console.log('Concert rejected successfully:', rejectedConcertData.name || rejectedConcertData.id);

            // Update local state
            setPendingConcerts(prev => prev.filter(concert =>
                concert.id !== concertId && concert._id !== concertId
            ));

            // Add to rejected concerts
            const rejectedConcert = formatConcertFromApi(rejectedConcertData);
            setRejectedConcerts(prev => [rejectedConcert, ...prev]);

            setLoading(false);
            return rejectedConcertData;
        } catch (err) {
            console.error('Error rejecting concert:', err);
            setError(err.message || 'Failed to reject concert');
            setLoading(false);
            throw err;
        }
    };

    // Function to request more info (admin) - PERBAIKAN UTAMA
    const requestMoreInfo = async (concertId, requestMessage) => {
        try {
            setLoading(true);
            setError(null);
            console.log(`Requesting more info for concert with ID: ${concertId}`);

            // Ensure we have auth token
            const token = AuthService.getToken();
            if (!token) {
                await AuthService.loginTest();
            }

            let updatedConcertData = null;
            let success = false;

            // Try multiple methods to request more info
            // Method 1: Try ApiService if available
            try {
                if (typeof ApiService.requestMoreInfo === 'function') {
                    console.log('Using ApiService.requestMoreInfo');
                    updatedConcertData = await ApiService.requestMoreInfo(concertId, requestMessage);
                    success = true;
                } else {
                    throw new Error('ApiService.requestMoreInfo not available');
                }
            } catch (apiError) {
                console.error('Error using ApiService.requestMoreInfo:', apiError);

                // Method 2: Try direct fetch to concerts endpoint
                try {
                    console.log('Trying direct fetch to concerts endpoint');
                    const response = await fetch(`http://localhost:5000/api/concerts/${concertId}/request-info`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': AuthService.getToken()
                        },
                        body: JSON.stringify({ message: requestMessage })
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.msg || `API returned ${response.status}`);
                    }

                    updatedConcertData = await response.json();
                    success = true;
                } catch (fetchError) {
                    console.error('Error with concerts endpoint:', fetchError);

                    // Method 3: Try admin endpoint
                    try {
                        console.log('Trying admin endpoint');
                        const adminResponse = await fetch(`http://localhost:5000/api/admin/concerts/${concertId}/request-info`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-auth-token': AuthService.getToken()
                            },
                            body: JSON.stringify({ message: requestMessage })
                        });

                        if (!adminResponse.ok) {
                            const errorData = await adminResponse.json().catch(() => ({}));
                            throw new Error(errorData.msg || `Admin API returned ${adminResponse.status}`);
                        }

                        updatedConcertData = await adminResponse.json();
                        success = true;
                    } catch (adminError) {
                        console.error('Error with admin endpoint:', adminError);
                    }
                }
            }

            if (!success || !updatedConcertData) {
                throw new Error('Failed to request more info after trying all methods');
            }

            console.log('Request for more info sent successfully:', updatedConcertData.name || updatedConcertData.id);

            // Update local state - unlike approval/rejection, the concert stays in pending
            const updatedConcert = formatConcertFromApi(updatedConcertData);

            const updatedConcerts = pendingConcerts.map(concert => {
                if (concert.id === concertId || concert._id === concertId) {
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
    const mintTicket = async (concertId, sectionName, quantity = 1, seatNumber = null, transactionSignature = null) => {
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

            // If transaction signature is provided (from direct blockchain), include it
            if (transactionSignature) {
                mintData.transactionSignature = transactionSignature;
                console.log("Including transaction signature:", transactionSignature);
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

            // Update minted seats cache using the enhanced method
            await ApiService.updateMintedSeatsCache(concertId, sectionName, seatNumber);

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
    const clearConcertCache = () => {
        console.log("Clearing concert cache from context");

        // Reset approvedConcerts state
        setApprovedConcerts([]);

        // Also clear from ApiService if available
        if (typeof ApiService.clearConcertCache === 'function') {
            ApiService.clearConcertCache();
        } else {
            console.warn("ApiService.clearConcertCache is not a function");
            // Alternative: clear from localStorage
            localStorage.removeItem('concerts');
        }
    };

    //
    // Function to load user's tickets - perbaikan untuk mencegah loop
    const loadMyTickets = useCallback(async (forceRefresh = false) => {
        // Jika forceRefresh true, bersihkan flag loading dan cache
        if (forceRefresh) {
            console.log("Force refreshing tickets...");
            loadingRef.current = false;

            // Hapus cache dari localStorage
            localStorage.removeItem('myTickets');
            localStorage.removeItem('my_tickets_true');
            localStorage.removeItem('my_tickets_false');
            localStorage.removeItem('my_tickets_last_update');
        }

        // Hindari pemanggilan berulang jika sedang loading, kecuali force refresh
        if (loadingRef.current && !forceRefresh) {
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

            // Tambahkan retry logic untuk keandalan
            let attempts = 0;
            const maxAttempts = 3;
            let lastError = null;

            while (attempts < maxAttempts) {
                attempts++;

                try {
                    // Set timeout untuk mencegah request hang
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000);

                    // Ambil tiket dari API dengan parameter force refresh
                    const response = await fetch(`${ApiService.baseUrl}/tickets?forceRefresh=${forceRefresh}`, {
                        headers: {
                            'x-auth-token': AuthService.getToken(),
                            'Cache-Control': forceRefresh ? 'no-cache, no-store' : 'default'
                        },
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);
                    console.log("Tickets API response status:", response.status);

                    // Tangani berbagai response status
                    if (response.status === 401) {
                        console.warn("Token tidak valid, coba login ulang...");
                        // Coba login ulang otomatis
                        if (publicKey) {
                            const success = await AuthService.loginTest(publicKey.toString());
                            if (success) {
                                console.log("Re-authentication successful, retrying ticket fetch");
                                continue; // Coba lagi dengan token baru
                            }
                        }
                        throw new Error("Authentication failed");
                    }

                    if (response.status === 429) {
                        console.warn(`Rate limit hit (attempt ${attempts}), waiting before retry...`);
                        // Tunggu dengan backoff eksponensial sebelum retry
                        const backoffTime = Math.min(1000 * Math.pow(2, attempts - 1), 10000);
                        await new Promise(resolve => setTimeout(resolve, backoffTime));
                        continue;
                    }

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

                        if (Array.isArray(parsedTickets)) {
                            setMyTickets(parsedTickets);
                            // Cache ke localStorage
                            localStorage.setItem('myTickets', JSON.stringify(parsedTickets));
                            setLoading(false);
                            loadingRef.current = false;
                            return parsedTickets;
                        } else {
                            throw new Error("Invalid response format");
                        }
                    }

                    // Set ke state
                    setMyTickets(ticketsData);

                    // Cache ke localStorage
                    localStorage.setItem('myTickets', JSON.stringify(ticketsData));
                    localStorage.setItem('my_tickets_last_update', Date.now().toString());

                    setLoading(false);
                    loadingRef.current = false;
                    return ticketsData;

                } catch (fetchErr) {
                    // Tangani berbagai error
                    lastError = fetchErr;
                    console.error(`Error fetching tickets (attempt ${attempts}/${maxAttempts}):`, fetchErr.message);

                    // Untuk timeout, coba langsung lagi
                    if (fetchErr.name === 'AbortError') {
                        console.warn("Request time out, will retry...");
                        continue;
                    }

                    // Untuk error lain, tunggu sebelum retry
                    if (attempts < maxAttempts) {
                        const retryDelay = 1000 * attempts;
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    }
                }
            }

            console.error("All attempts to load tickets failed");

            // Jika semua percobaan gagal, coba ambil dari localStorage
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
        } catch (err) {
            console.error('Error in loadMyTickets:', err);

            // Coba ambil dari localStorage jika API gagal
            try {
                console.log("Attempting to load tickets from localStorage after main error");
                const cachedTickets = JSON.parse(localStorage.getItem('myTickets') || '[]');
                console.log(`Found ${cachedTickets.length} tickets in localStorage`);
                setMyTickets(cachedTickets);
                setLoading(false);
                loadingRef.current = false;
                return cachedTickets;
            } catch (cacheErr) {
                console.error('Error loading tickets from cache after main error:', cacheErr);
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

    // Update minted seats cache
    const updateMintedSeatsCache = async (concertId, sectionName, seatNumber) => {
        try {
            if (!concertId) {
                console.error("Missing concertId in updateMintedSeatsCache");
                return false;
            }

            // Normalisasi concertId ke string
            const normalizedConcertId = concertId.toString();

            // Ambil data kursi terjual dari localStorage
            const cacheKey = `minted_seats_${normalizedConcertId}`;
            const cachedSeats = JSON.parse(localStorage.getItem(cacheKey) || '[]');

            // Format kode kursi: "SectionName-SeatNumber"
            const seatCode = seatNumber || `${sectionName}-AUTO`;

            // Tambahkan ke cache kursi jika belum ada
            if (!cachedSeats.includes(seatCode)) {
                cachedSeats.push(seatCode);
                localStorage.setItem(cacheKey, JSON.stringify(cachedSeats));
            }

            console.log(`Updated minted seats cache for concert ${normalizedConcertId}, added seat ${seatCode}`);

            // Sekarang refresh dari API untuk memastikan konsistensi
            try {
                if (typeof ApiService.getMintedSeats === 'function') {
                    const freshMintedSeats = await ApiService.getMintedSeats(normalizedConcertId);
                    // Tidak perlu melakukan apa-apa dengan hasilnya - API call akan memperbarui cache-nya sendiri
                }
            } catch (err) {
                console.warn("Could not refresh minted seats from API:", err);
                // Lanjutkan menggunakan cache lokal karena kita sudah memperbaruinya
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

            // Call API to get minted seats if the function exists
            if (typeof ApiService.getMintedSeats === 'function') {
                const result = await ApiService.getMintedSeats(concertId);
                console.log("Minted seats result:", result ? `${result.seats?.length || 0} seats` : 'no data');
                return result?.seats || [];
            } else {
                throw new Error('ApiService.getMintedSeats not available');
            }
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

export default ConcertContext;