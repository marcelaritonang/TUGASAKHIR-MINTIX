// src/components/TicketMarketplace.js - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Link, useNavigate } from 'react-router-dom';

// Import services
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import blockchainService from '../services/blockchain';
import { useConcerts } from '../context/ConcertContext';

// Import components
import LoadingSpinner from './common/LoadingSpinner';
import LoadingOverlay from './common/LoadingOverlay';

// Helper functions
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatAddress = (address, start = 6, end = 4) => {
    if (!address) return 'N/A';
    return `${address.slice(0, start)}...${address.slice(-end)}`;
};

// ✅ ENHANCED LOADING COMPONENT untuk Marketplace
const MarketplaceLoadingSpinner = ({ message = 'Memuat marketplace tiket...' }) => (
    <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col items-center justify-center mt-20">
                <div className="relative">
                    <LoadingSpinner size="lg" />
                    <div className="absolute inset-0 border-4 border-indigo-400 rounded-full animate-ping opacity-20"></div>
                    <div className="absolute inset-2 border-2 border-blue-400 rounded-full animate-pulse opacity-30"></div>
                </div>
                <p className="text-gray-300 mt-4 text-lg">{message}</p>
                <p className="text-gray-500 text-sm mt-2">Menganalisis tiket yang dijual pengguna</p>

                {/* Loading steps */}
                <div className="mt-8 space-y-2">
                    <div className="flex items-center text-sm text-gray-400">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                        Mengambil daftar tiket marketplace
                    </div>
                    <div className="flex items-center text-sm text-gray-400">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3 animate-pulse"></div>
                        Memverifikasi status tiket
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                        <div className="w-2 h-2 bg-gray-600 rounded-full mr-3"></div>
                        Menyiapkan informasi konser
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// ✅ ENHANCED Marketplace Ticket Card Component
const MarketplaceTicketCard = ({ ticket, onBuy, isOwner, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const wallet = useWallet();
    const navigate = useNavigate();

    // ✅ ENHANCED: Better price validation
    const hasValidPrice = ticket.listingPrice &&
        !isNaN(parseFloat(ticket.listingPrice)) &&
        parseFloat(ticket.listingPrice) > 0;

    // ✅ ENHANCED: Better concert info handling
    const getConcertDisplayInfo = () => {
        return {
            name: ticket.concertName || 'Konser Tidak Diketahui',
            venue: ticket.concertVenue || 'Venue Tidak Diketahui',
            date: ticket.concertDate || null,
            hasInfo: !!(ticket.concertName && ticket.concertVenue)
        };
    };

    const concertInfo = getConcertDisplayInfo();

    // Fungsi untuk menangani klik beli
    const handleBuyClick = (e) => {
        e.preventDefault();
        if (onBuy && hasValidPrice) onBuy(ticket);
    };

    // Fungsi untuk melihat detail tiket
    const handleViewSellerProfile = () => {
        if (ticket.owner) {
            console.log(`Viewing seller profile for ${ticket.owner}`);
        }
    };

    // ✅ ENHANCED: Handle manage ticket
    const handleManageTicket = () => {
        navigate(`/ticket/${ticket._id}`);
    };

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 hover:border-indigo-500 transition-colors p-5">
            {/* ✅ ENHANCED: Better concert info display */}
            <div className="mb-4">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <h3 className="text-white font-medium text-lg">{concertInfo.name}</h3>
                        <p className="text-gray-400">{concertInfo.venue}</p>
                        {concertInfo.date && (
                            <p className="text-gray-400 text-sm">{formatDate(concertInfo.date)}</p>
                        )}
                    </div>

                    {/* Status badges */}
                    <div className="flex flex-col gap-1">
                        {isOwner && (
                            <div className="px-2 py-1 rounded text-xs bg-blue-900/30 text-blue-400 border border-blue-700">
                                Tiket Anda
                            </div>
                        )}
                        <div className="px-2 py-1 rounded text-xs bg-green-900/30 text-green-400 border border-green-700">
                            Dijual
                        </div>
                    </div>
                </div>

                {/* Warning jika concert info tidak lengkap */}
                {!concertInfo.hasInfo && (
                    <div className="mt-2 text-xs text-yellow-400">
                        ⚠️ Informasi konser tidak lengkap
                    </div>
                )}
            </div>

            {/* ✅ ENHANCED: Ticket details dengan better layout */}
            <div className="bg-gray-700/30 rounded-lg p-3 mb-4">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <p className="text-gray-400 text-sm">Seksi</p>
                        <p className="text-white font-medium">{ticket.sectionName || 'Regular'}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Kursi</p>
                        <p className="text-white font-medium">{ticket.seatNumber || 'General'}</p>
                    </div>
                </div>

                {/* Ticket ID untuk debugging */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-2 pt-2 border-t border-gray-600">
                        <p className="text-gray-500 text-xs">ID: {formatAddress(ticket._id, 8, 8)}</p>
                    </div>
                )}
            </div>

            {/* ✅ ENHANCED: Pricing info dengan better validation */}
            <div className="bg-indigo-900/20 border border-indigo-700 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-indigo-400 text-sm">Harga</p>
                        {hasValidPrice ? (
                            <p className="text-white font-medium text-2xl">{ticket.listingPrice} SOL</p>
                        ) : (
                            <p className="text-red-400 font-medium text-lg">Harga tidak valid</p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400 text-xs">Terdaftar pada</p>
                        <p className="text-white text-sm">{formatDate(ticket.listingDate)}</p>
                    </div>
                </div>

                {/* Original price comparison jika ada */}
                {ticket.originalPrice && hasValidPrice && (
                    <div className="mt-2 pt-2 border-t border-indigo-800">
                        <p className="text-gray-400 text-xs">
                            Harga asli: <span className="text-gray-300">{ticket.originalPrice} SOL</span>
                            {parseFloat(ticket.listingPrice) !== parseFloat(ticket.originalPrice) && (
                                <span className={`ml-2 ${parseFloat(ticket.listingPrice) > parseFloat(ticket.originalPrice) ? 'text-red-400' : 'text-green-400'}`}>
                                    ({parseFloat(ticket.listingPrice) > parseFloat(ticket.originalPrice) ? '+' : ''}
                                    {(((parseFloat(ticket.listingPrice) - parseFloat(ticket.originalPrice)) / parseFloat(ticket.originalPrice)) * 100).toFixed(1)}%)
                                </span>
                            )}
                        </p>
                    </div>
                )}
            </div>

            {/* ✅ ENHANCED: Seller info */}
            <div className="flex justify-between items-center text-sm mb-4">
                <div>
                    <span className="text-gray-400">Penjual:</span>
                    <span
                        className="text-indigo-400 ml-1 hover:underline cursor-pointer"
                        onClick={handleViewSellerProfile}
                        title={ticket.owner}
                    >
                        {formatAddress(ticket.owner)}
                    </span>
                </div>
                {ticket.sellerRating && (
                    <div className="flex items-center">
                        <span className="text-yellow-400 mr-1">★</span>
                        <span className="text-white">{ticket.sellerRating}/5</span>
                    </div>
                )}
            </div>

            {/* ✅ ENHANCED: Action buttons dengan better logic */}
            <div className="flex flex-col gap-2">
                {isOwner ? (
                    <>
                        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
                            <p className="text-yellow-400 text-sm text-center font-medium">
                                🏪 Ini adalah tiket Anda yang sedang dijual
                            </p>
                        </div>
                        <button
                            onClick={handleManageTicket}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                            📋 Kelola Tiket
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={handleBuyClick}
                            disabled={loading || !wallet.connected || !hasValidPrice}
                            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${!hasValidPrice
                                    ? 'bg-red-600/50 text-red-300 cursor-not-allowed'
                                    : loading || !wallet.connected
                                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Processing...
                                </div>
                            ) : !hasValidPrice ? (
                                '❌ Harga Tidak Valid'
                            ) : !wallet.connected ? (
                                '🔐 Hubungkan Wallet'
                            ) : (
                                '💰 Beli Tiket'
                            )}
                        </button>

                        {!wallet.connected && (
                            <div className="text-center text-sm text-yellow-400">
                                Hubungkan wallet untuk membeli tiket
                            </div>
                        )}

                        {!hasValidPrice && (
                            <div className="text-center text-sm text-red-400">
                                Tiket ini memiliki harga yang tidak valid
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ✅ DEBUG: Ticket info untuk development */}
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-3 p-2 bg-blue-900/10 border border-blue-800 rounded text-xs">
                    <p className="text-blue-400">DEBUG INFO:</p>
                    <p className="text-gray-400">isListed: {ticket.isListed ? 'true' : 'false'}</p>
                    <p className="text-gray-400">Owner: {ticket.owner}</p>
                    <p className="text-gray-400">Price: {ticket.listingPrice}</p>
                    <p className="text-gray-400">Valid Price: {hasValidPrice ? 'true' : 'false'}</p>
                </div>
            )}
        </div>
    );
};

// ✅ ENHANCED Main TicketMarketplace Component
const TicketMarketplace = () => {
    const wallet = useWallet();
    const navigate = useNavigate();
    const { approvedConcerts, loadApprovedConcerts } = useConcerts();

    // ✅ ENHANCED: States dengan better organization
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Filter states
    const [filterConcert, setFilterConcert] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [sortBy, setSortBy] = useState('price_asc');
    const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);

    // Purchase states
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showBuyConfirm, setShowBuyConfirm] = useState(false);
    const [processingPurchase, setProcessingPurchase] = useState(false);
    const [purchaseProgress, setPurchaseProgress] = useState(0);
    const [purchaseMessage, setPurchaseMessage] = useState('');
    const [solanaBalance, setSolanaBalance] = useState(0);

    // ✅ ENHANCED: Debug states
    const [debugInfo, setDebugInfo] = useState('');
    const [lastRefresh, setLastRefresh] = useState(Date.now());

    // Authentication check
    useEffect(() => {
        const checkAuth = async () => {
            const isAuth = AuthService.isAuthenticated();
            setIsAuthenticated(isAuth);
        };

        checkAuth();
    }, [wallet]);

    // ✅ FIXED: Enhanced load marketplace tickets dengan debugging
    useEffect(() => {
        const loadMarketplaceTickets = async () => {
            try {
                setLoading(true);
                setError('');
                console.log('🏪 Loading marketplace tickets...');

                // ✅ FIXED: Use the marketplace-specific API endpoint
                let marketplaceTickets;

                try {
                    // Try marketplace endpoint first
                    marketplaceTickets = await ApiService.getTicketsForSale(filterConcert);
                    console.log(`📋 Got ${marketplaceTickets?.length || 0} tickets from marketplace API`);
                } catch (apiErr) {
                    console.warn('⚠️ Marketplace API failed, trying alternative method:', apiErr);

                    // ✅ FALLBACK: Try getting tickets from /tickets/market endpoint
                    try {
                        const response = await fetch('/api/tickets/market', {
                            headers: {
                                'x-auth-token': localStorage.getItem('auth_token')
                            }
                        });

                        if (response.ok) {
                            const data = await response.json();
                            marketplaceTickets = data.tickets || [];
                            console.log(`📋 Got ${marketplaceTickets.length} tickets from fallback API`);
                        } else {
                            throw new Error(`API response not ok: ${response.status}`);
                        }
                    } catch (fallbackErr) {
                        console.error('❌ Fallback API also failed:', fallbackErr);
                        throw new Error('Could not load marketplace tickets from any source');
                    }
                }

                // ✅ ENHANCED: Better data validation
                if (!Array.isArray(marketplaceTickets)) {
                    console.error('❌ Invalid marketplace tickets data:', marketplaceTickets);
                    setTickets([]);
                    setError('Data tiket marketplace tidak valid');
                    setDebugInfo('API returned non-array data');
                    return;
                }

                // ✅ ENHANCED: Filter untuk hanya tiket yang benar-benar listed
                const validListedTickets = marketplaceTickets.filter(ticket => {
                    const isListed = ticket.isListed === true;
                    const hasValidPrice = ticket.listingPrice &&
                        !isNaN(parseFloat(ticket.listingPrice)) &&
                        parseFloat(ticket.listingPrice) > 0;
                    const hasOwner = ticket.owner && ticket.owner.length > 0;

                    const isValid = isListed && hasValidPrice && hasOwner;

                    if (!isValid) {
                        console.log(`🚫 Filtering out invalid ticket ${ticket._id}:`, {
                            isListed,
                            hasValidPrice,
                            hasOwner,
                            listingPrice: ticket.listingPrice
                        });
                    }

                    return isValid;
                });

                console.log(`✅ Filtered to ${validListedTickets.length} valid listed tickets`);

                // ✅ ENHANCED: Enhance ticket data dengan concert info
                const enhancedTickets = await Promise.allSettled(
                    validListedTickets.map(async (ticket) => {
                        try {
                            let enhancedTicket = { ...ticket };

                            // Get concert data if not already included
                            if (!ticket.concertName && ticket.concertId) {
                                try {
                                    const concertData = await ApiService.getConcert(ticket.concertId);
                                    if (concertData) {
                                        enhancedTicket = {
                                            ...enhancedTicket,
                                            concertName: concertData.name,
                                            concertVenue: concertData.venue,
                                            concertDate: concertData.date
                                        };
                                    }
                                } catch (concertErr) {
                                    console.warn(`⚠️ Could not get concert data for ${ticket.concertId}:`, concertErr);
                                    // Keep original ticket data
                                }
                            }

                            return enhancedTicket;
                        } catch (err) {
                            console.error(`❌ Error enhancing ticket ${ticket._id}:`, err);
                            return ticket; // Return original ticket if enhancement fails
                        }
                    })
                );

                // Extract successful results
                const processedTickets = enhancedTickets
                    .filter(result => result.status === 'fulfilled')
                    .map(result => result.value);

                console.log(`🎯 Successfully processed ${processedTickets.length} tickets`);

                // ✅ ENHANCED: Apply filters and sorting
                let filteredTickets = processedTickets;

                // Filter by concert if selected
                if (filterConcert) {
                    filteredTickets = filteredTickets.filter(
                        ticket => ticket.concertId === filterConcert
                    );
                }

                // Filter by section if selected
                if (filterSection) {
                    filteredTickets = filteredTickets.filter(
                        ticket => ticket.sectionName === filterSection
                    );
                }

                // Filter out tickets owned by current user if showOnlyAvailable is true
                if (showOnlyAvailable && wallet.connected && wallet.publicKey) {
                    const userAddress = wallet.publicKey.toString();
                    filteredTickets = filteredTickets.filter(
                        ticket => ticket.owner !== userAddress
                    );
                }

                // ✅ ENHANCED: Apply sorting dengan better error handling
                filteredTickets.sort((a, b) => {
                    switch (sortBy) {
                        case 'price_asc':
                            return (parseFloat(a.listingPrice || 0) - parseFloat(b.listingPrice || 0));
                        case 'price_desc':
                            return (parseFloat(b.listingPrice || 0) - parseFloat(a.listingPrice || 0));
                        case 'date_asc':
                            return new Date(a.listingDate || 0) - new Date(b.listingDate || 0);
                        case 'date_desc':
                            return new Date(b.listingDate || 0) - new Date(a.listingDate || 0);
                        default:
                            return 0;
                    }
                });

                setTickets(filteredTickets);
                setDebugInfo(`Loaded ${processedTickets.length} total tickets, ${filteredTickets.length} after filters`);
                setLastRefresh(Date.now());

                console.log(`✅ Marketplace loaded successfully: ${filteredTickets.length} tickets displayed`);

            } catch (err) {
                console.error('❌ Error loading marketplace tickets:', err);
                setError('Gagal memuat tiket marketplace. Silakan coba lagi nanti.');
                setDebugInfo(`Error: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        loadMarketplaceTickets();
    }, [filterConcert, filterSection, sortBy, showOnlyAvailable, wallet.connected, wallet.publicKey]);

    // Fetch balances when wallet connects
    useEffect(() => {
        const fetchBalance = async () => {
            if (wallet && wallet.publicKey) {
                try {
                    const balance = await blockchainService.getSolanaBalance(wallet.publicKey);
                    setSolanaBalance(balance);
                } catch (err) {
                    console.error("Error fetching balance:", err);
                }
            }
        };

        fetchBalance();
    }, [wallet.publicKey, wallet.connected]);

    // Load concerts for the filter
    useEffect(() => {
        if (approvedConcerts.length === 0) {
            loadApprovedConcerts();
        }
    }, [approvedConcerts, loadApprovedConcerts]);

    // ✅ ENHANCED: Manual refresh function
    const handleRefresh = async () => {
        setLoading(true);
        setError('');
        console.log('🔄 Manual refresh triggered');

        // Force reload by clearing any cached data
        try {
            ApiService.clearAllCaches();
        } catch (err) {
            console.warn('Could not clear caches:', err);
        }

        // Trigger reload by updating a dependency
        setLastRefresh(Date.now());
    };

    // Handle buy ticket click
    const handleBuyTicket = (ticket) => {
        setSelectedTicket(ticket);
        setShowBuyConfirm(true);
    };

    // ✅ COMPLETE: Handle buy confirmation dengan COMPLETE error handling
    const processBuyTicket = async () => {
        if (!selectedTicket || !wallet.connected) {
            console.error("Cannot process purchase: No selected ticket or wallet not connected");
            return;
        }

        setShowBuyConfirm(false);
        setProcessingPurchase(true);
        setPurchaseProgress(10);
        setPurchaseMessage('Mempersiapkan pembelian tiket...');

        try {
            console.log("Starting purchase process for ticket:", selectedTicket);

            // Check if user is authenticated
            if (!isAuthenticated) {
                setPurchaseMessage('Melakukan autentikasi...');
                try {
                    const success = await AuthService.loginTest(wallet.publicKey.toString());
                    if (!success) {
                        throw new Error("Authentication failed");
                    }
                    console.log("Authentication successful");
                    setIsAuthenticated(true);
                } catch (authError) {
                    throw new Error("Failed to authenticate with wallet: " + authError.message);
                }
            }

            // Verify ticket is still available
            setPurchaseProgress(20);
            setPurchaseMessage('Memverifikasi ketersediaan tiket...');

            const ticketCheck = await ApiService.getTicketsForSale();
            const isStillAvailable = ticketCheck.some(t => t._id === selectedTicket._id);

            if (!isStillAvailable) {
                throw new Error('Tiket ini tidak lagi tersedia untuk dijual');
            }

            // Validate buyer has sufficient balance
            const ticketPrice = parseFloat(selectedTicket.listingPrice);
            if (solanaBalance < ticketPrice) {
                throw new Error(`Saldo SOL tidak mencukupi. Dibutuhkan: ${ticketPrice} SOL, Saldo: ${solanaBalance.toFixed(4)} SOL`);
            }

            // Get seller's wallet address
            const sellerAddress = selectedTicket.owner;
            if (!sellerAddress) {
                throw new Error("Alamat wallet penjual tidak ditemukan");
            }

            console.log(`Preparing payment of ${ticketPrice} SOL to seller: ${sellerAddress}`);

            // Process payment
            setPurchaseProgress(30);
            setPurchaseMessage(`Membuat transaksi blockchain untuk membayar penjual...`);

            // Create payment DIRECTLY to ticket owner (penjual)
            let signature;
            try {
                signature = await blockchainService.createSolanaPayment(
                    wallet,
                    sellerAddress, // Pay directly to the ticket owner
                    ticketPrice,
                    (progress) => {
                        setPurchaseProgress(30 + Math.floor(progress * 0.5));
                    },
                    (message) => {
                        setPurchaseMessage(message);
                    }
                );

                console.log("Transaction created with signature:", signature);
            } catch (txError) {
                console.error("Transaction error:", txError);

                // Handle specific transaction errors
                if (txError.message.includes("Insufficient")) {
                    throw new Error(`Saldo tidak mencukupi. Dibutuhkan: ${ticketPrice} SOL.`);
                } else if (txError.message.includes("reject")) {
                    throw new Error("Transaksi ditolak di wallet Anda.");
                } else {
                    throw new Error("Error saat membuat transaksi: " + txError.message);
                }
            }

            // Ensure transaction signature is valid
            if (!signature) {
                throw new Error("Tidak mendapatkan signature transaksi valid");
            }

            // Register purchase with API
            setPurchaseProgress(80);
            setPurchaseMessage("Menyelesaikan proses pembelian tiket...");

            console.log(`Calling buyTicket API with ticketId: ${selectedTicket._id}, signature: ${signature}`);
            const result = await ApiService.buyTicket(selectedTicket._id, signature);

            if (!result || !result.success) {
                throw new Error(result?.msg || "Gagal membeli tiket");
            }

            // Success
            setPurchaseProgress(100);
            setPurchaseMessage("Pembelian tiket berhasil! Tiket telah ditambahkan ke koleksi Anda.");

            // Refresh balances
            try {
                const newBalance = await blockchainService.getSolanaBalance(wallet.publicKey);
                setSolanaBalance(newBalance);
            } catch (balanceErr) {
                console.warn("Non-critical: Could not refresh balance", balanceErr);
            }

            // ✅ ENHANCED: Better cache clearing dan UI update
            try {
                // Clear semua cache terkait tiket
                ApiService.clearAllCaches();

                // Remove purchased ticket dari local state
                setTickets(prevTickets => prevTickets.filter(t => t._id !== selectedTicket._id));

                // Clear marketplace cache
                const marketplaceTickets = JSON.parse(localStorage.getItem('marketplaceTickets') || '[]');
                localStorage.setItem(
                    'marketplaceTickets',
                    JSON.stringify(marketplaceTickets.filter(t => t._id !== selectedTicket._id))
                );

                // Refresh after delay
                setTimeout(() => {
                    handleRefresh();
                }, 2000);

            } catch (cacheErr) {
                console.warn("Non-critical: Could not clear caches", cacheErr);
            }

            // Navigate to my tickets after delay
            setTimeout(() => {
                setProcessingPurchase(false);
                navigate('/my-tickets');
            }, 3000);

        } catch (err) {
            console.error("Error during ticket purchase:", err);

            // ✅ COMPLETE: Enhanced error handling dengan semua skenario
            if (err.message.includes("Insufficient") || err.message.includes("Saldo tidak mencukupi")) {
                setPurchaseMessage(`Error: Saldo tidak mencukupi. Dibutuhkan: ${selectedTicket.listingPrice} SOL. Saldo Anda: ${solanaBalance.toFixed(4)} SOL`);
            } else if (err.message.includes("User rejected") || err.message.includes("ditolak")) {
                setPurchaseMessage("Error: Transaksi ditolak di dompet Anda. Silakan coba lagi.");
            } else if (err.message.includes("timeout") || err.message.includes("Timeout")) {
                setPurchaseMessage("Error: Waktu transaksi habis. Jaringan Solana mungkin sibuk, silakan coba lagi nanti.");
            } else if (err.message.includes("Network Error") || err.message.includes("network")) {
                setPurchaseMessage("Error: Masalah koneksi jaringan. Periksa koneksi internet Anda dan coba lagi.");
            } else if (err.message.includes("Authentication failed") || err.message.includes("autentikasi")) {
                setPurchaseMessage("Error: Autentikasi gagal. Silakan disconnect dan connect ulang wallet Anda.");
            } else if (err.message.includes("tidak lagi tersedia")) {
                setPurchaseMessage("Error: Tiket ini sudah dibeli oleh orang lain. Silakan pilih tiket lain.");
            } else if (err.message.includes("Invalid signature") || err.message.includes("signature")) {
                setPurchaseMessage("Error: Signature transaksi tidak valid. Silakan coba lagi.");
            } else if (err.message.includes("Rate limit") || err.message.includes("Too many requests")) {
                setPurchaseMessage("Error: Terlalu banyak permintaan. Tunggu sebentar dan coba lagi.");
            } else if (err.message.includes("Server error") || err.message.includes("500")) {
                setPurchaseMessage("Error: Server sedang bermasalah. Silakan coba lagi dalam beberapa menit.");
            } else if (err.message.includes("Not found") || err.message.includes("404")) {
                setPurchaseMessage("Error: Tiket tidak ditemukan. Mungkin sudah terjual atau dihapus.");
            } else if (err.message.includes("Forbidden") || err.message.includes("403")) {
                setPurchaseMessage("Error: Akses ditolak. Periksa izin wallet Anda.");
            } else if (err.message.includes("Bad request") || err.message.includes("400")) {
                setPurchaseMessage("Error: Data permintaan tidak valid. Silakan refresh halaman dan coba lagi.");
            } else if (err.message.includes("Contract error") || err.message.includes("blockchain")) {
                setPurchaseMessage("Error: Masalah dengan smart contract. Silakan coba lagi nanti.");
            } else if (err.message.includes("Gas") || err.message.includes("fee")) {
                setPurchaseMessage("Error: Biaya transaksi terlalu tinggi. Coba lagi nanti saat jaringan tidak sibuk.");
            } else {
                // Generic error dengan details untuk debugging
                setPurchaseMessage(`Error: ${err.message || "Gagal membeli tiket"}. Jika masalah berlanjut, silakan hubungi support.`);
            }

            // Log error untuk debugging
            console.error("Purchase error details:", {
                message: err.message,
                stack: err.stack,
                ticketId: selectedTicket._id,
                userWallet: wallet.publicKey?.toString(),
                timestamp: new Date().toISOString()
            });

            // Clear purchase state after showing error
            setTimeout(() => {
                setProcessingPurchase(false);

                // Reset purchase progress untuk error yang memerlukan retry
                if (!err.message.includes("tidak lagi tersedia") &&
                    !err.message.includes("ditolak") &&
                    !err.message.includes("Insufficient")) {
                    setPurchaseProgress(0);
                }
            }, 5000);
        }
    };

    // ✅ ENHANCED: Get unique section names for filter
    const getUniqueSections = () => {
        const sections = tickets
            .map(ticket => ticket.sectionName)
            .filter((value, index, self) => value && self.indexOf(value) === index)
            .sort();
        return sections;
    };

    // Check if user owns this ticket
    const isTicketOwner = (ticket) => {
        return wallet.connected && wallet.publicKey &&
            ticket.owner && wallet.publicKey.toString() === ticket.owner;
    };

    // ✅ ENHANCED: Stats calculation
    const getMarketplaceStats = () => {
        const totalTickets = tickets.length;
        const ownedByUser = tickets.filter(t => isTicketOwner(t)).length;
        const availableToBuy = tickets.filter(t => !isTicketOwner(t)).length;
        const averagePrice = tickets.length > 0
            ? (tickets.reduce((sum, t) => sum + (parseFloat(t.listingPrice) || 0), 0) / tickets.length).toFixed(3)
            : 0;

        return {
            totalTickets,
            ownedByUser,
            availableToBuy,
            averagePrice
        };
    };

    const marketStats = getMarketplaceStats();

    // ✅ ENHANCED: Loading state
    if (loading) {
        return <MarketplaceLoadingSpinner message="Memuat marketplace tiket..." />;
    }

    return (
        <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
            {/* Purchase overlay */}
            {processingPurchase && (
                <LoadingOverlay
                    message={purchaseMessage}
                    progress={purchaseProgress}
                    isVisible={true}
                />
            )}

            {/* Buy confirmation modal */}
            {showBuyConfirm && selectedTicket && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg border border-indigo-800/50">
                        <h3 className="text-xl text-white font-medium mb-4">Konfirmasi Pembelian</h3>

                        <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                            <div className="mb-2">
                                <p className="text-gray-300 text-sm">Konser</p>
                                <p className="text-white">{selectedTicket.concertName || 'Unknown Concert'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-300 text-sm">Seksi</p>
                                    <p className="text-white">{selectedTicket.sectionName || 'Regular'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-300 text-sm">Kursi</p>
                                    <p className="text-white">{selectedTicket.seatNumber || 'General'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-900/20 border border-indigo-600 rounded-lg p-4 mb-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-indigo-400 text-sm">Harga</p>
                                    <p className="text-white font-bold text-2xl">{selectedTicket.listingPrice} SOL</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-300 text-sm">Saldo Anda</p>
                                    <p className={`font-medium ${parseFloat(selectedTicket.listingPrice) > solanaBalance ? 'text-red-400' : 'text-green-400'}`}>
                                        {solanaBalance.toFixed(4)} SOL
                                    </p>
                                </div>
                            </div>
                        </div>

                        {parseFloat(selectedTicket.listingPrice) > solanaBalance && (
                            <div className="bg-red-900/20 border border-red-600 rounded-lg p-3 mb-4">
                                <p className="text-red-400 text-sm">
                                    Saldo SOL Anda tidak mencukupi untuk pembelian ini.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-between mt-2">
                            <p className="text-gray-300 text-sm">Pembayaran ke:</p>
                            <p className="text-gray-300 text-sm font-mono">{formatAddress(selectedTicket.owner, 10, 8)}</p>
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowBuyConfirm(false)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={processBuyTicket}
                                disabled={parseFloat(selectedTicket.listingPrice) > solanaBalance}
                                className={`px-4 py-2 text-white rounded-lg transition-colors ${parseFloat(selectedTicket.listingPrice) > solanaBalance
                                    ? 'bg-gray-500 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700'
                                    }`}
                            >
                                Beli Sekarang
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                {/* ✅ ENHANCED: Header dengan statistics */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">🏪 Marketplace Tiket</h1>
                        <p className="text-gray-400">
                            Jelajahi dan beli tiket dari pengguna lain
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                            <span className="text-green-400">{marketStats.availableToBuy} tersedia untuk dibeli</span>
                            {marketStats.ownedByUser > 0 && (
                                <span className="text-blue-400">{marketStats.ownedByUser} tiket Anda</span>
                            )}
                            {marketStats.averagePrice > 0 && (
                                <span className="text-gray-400">Rata-rata: {marketStats.averagePrice} SOL</span>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 md:mt-0 flex items-center space-x-3">
                        {/* Refresh button */}
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Memuat...
                                </>
                            ) : (
                                <>
                                    🔄 Refresh
                                </>
                            )}
                        </button>

                        {!wallet.connected && (
                            <WalletMultiButton className="bg-indigo-600 hover:bg-indigo-700" />
                        )}
                    </div>
                </div>

                {/* ✅ ENHANCED: Filter and Sort dengan show only available option */}
                <div className="bg-gray-800 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        {/* Concert filter */}
                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Filter Konser
                            </label>
                            <select
                                value={filterConcert}
                                onChange={(e) => setFilterConcert(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white"
                            >
                                <option value="">Semua Konser</option>
                                {approvedConcerts.map(concert => (
                                    <option key={concert.id} value={concert.id}>
                                        {concert.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Section filter */}
                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Filter Seksi
                            </label>
                            <select
                                value={filterSection}
                                onChange={(e) => setFilterSection(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white"
                            >
                                <option value="">Semua Seksi</option>
                                {getUniqueSections().map(section => (
                                    <option key={section} value={section}>
                                        {section}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Sort */}
                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Urutkan
                            </label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white"
                            >
                                <option value="price_asc">Harga: Terendah ke Tertinggi</option>
                                <option value="price_desc">Harga: Tertinggi ke Terendah</option>
                                <option value="date_asc">Tanggal: Terlama</option>
                                <option value="date_desc">Tanggal: Terbaru</option>
                            </select>
                        </div>

                        {/* Show only available */}
                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Tampilan
                            </label>
                            <div className="flex items-center h-10">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showOnlyAvailable}
                                        onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                                        className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <span className="text-gray-300 text-sm">Hanya yang bisa dibeli</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* ✅ ENHANCED: Stats dengan wallet balance */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-gray-700">
                        <div className="text-sm text-gray-400 mb-2 sm:mb-0">
                            {tickets.length} tiket ditemukan
                            {marketStats.ownedByUser > 0 && (
                                <span className="text-blue-400 ml-2">({marketStats.ownedByUser} milik Anda)</span>
                            )}
                        </div>
                        {wallet.connected && (
                            <div className="text-sm text-gray-400">
                                Saldo SOL Anda: <span className="text-white font-medium">{solanaBalance.toFixed(4)} SOL</span>
                            </div>
                        )}
                    </div>

                    {/* ✅ DEBUG INFO untuk development */}
                    {process.env.NODE_ENV === 'development' && debugInfo && (
                        <div className="mt-3 p-2 bg-blue-900/10 border border-blue-800 rounded text-xs">
                            <p className="text-blue-400">DEBUG: {debugInfo}</p>
                            <p className="text-gray-400">Last refresh: {new Date(lastRefresh).toLocaleTimeString()}</p>
                        </div>
                    )}
                </div>

                {/* ✅ ENHANCED: Error message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <p className="text-red-400">{error}</p>
                            <button
                                onClick={handleRefresh}
                                className="text-red-400 hover:text-red-300 underline text-sm"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    </div>
                )}

                {/* ✅ ENHANCED: No tickets message */}
                {tickets.length === 0 && !loading && !error && (
                    <div className="bg-gray-800 rounded-lg p-8 text-center">
                        <div className="text-6xl mb-4">🏪</div>
                        <h2 className="text-xl text-white mb-4">Tidak Ada Tiket yang Dijual</h2>
                        <p className="text-gray-400 mb-6">
                            {showOnlyAvailable
                                ? "Tidak ditemukan tiket yang bisa Anda beli saat ini."
                                : "Tidak ditemukan tiket yang dijual di marketplace saat ini."
                            }
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={handleRefresh}
                                className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-6 rounded-lg transition-colors"
                            >
                                🔄 Refresh
                            </button>
                            <Link
                                to="/mint-ticket"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-lg transition-colors"
                            >
                                🎫 Beli Tiket Baru
                            </Link>
                            {showOnlyAvailable && (
                                <button
                                    onClick={() => setShowOnlyAvailable(false)}
                                    className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded-lg transition-colors"
                                >
                                    👁️ Lihat Semua Tiket
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ✅ ENHANCED: Tickets grid */}
                {tickets.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tickets.map(ticket => (
                            <MarketplaceTicketCard
                                key={ticket._id}
                                ticket={ticket}
                                onBuy={handleBuyTicket}
                                isOwner={isTicketOwner(ticket)}
                                onRefresh={handleRefresh}
                            />
                        ))}
                    </div>
                )}

                {/* ✅ ENHANCED: Navigation links */}
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                    <Link
                        to="/my-tickets"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                    >
                        🎫 Tiket Saya
                    </Link>
                    <Link
                        to="/mint-ticket"
                        className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                    >
                        🛒 Beli Tiket Baru
                    </Link>
                    <Link
                        to="/collections"
                        className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                    >
                        🎵 Lihat Konser
                    </Link>
                </div>

                {/* ✅ ENHANCED: Footer info */}
                <div className="mt-8 text-center text-gray-500 text-sm">
                    <p>🔐 Semua transaksi diamankan oleh blockchain Solana</p>
                    <p className="mt-1">💰 Pembayaran langsung ke wallet penjual</p>
                    {process.env.NODE_ENV === 'development' && (
                        <p className="mt-1 text-blue-400">
                            🔧 Development Mode: Debug info aktif
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TicketMarketplace;