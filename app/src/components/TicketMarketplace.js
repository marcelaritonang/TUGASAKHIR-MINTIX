// src/components/TicketMarketplace.js - ENHANCED VERSION: Show All Tickets with Better UX
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
                <p className="text-gray-500 text-sm mt-2">Menganalisis semua tiket yang dijual</p>

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

// ✅ ENHANCED Marketplace Ticket Card Component dengan Better UX
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
        if (onBuy && hasValidPrice && !isOwner) onBuy(ticket);
    };

    // ✅ ENHANCED: Handle manage ticket
    const handleManageTicket = () => {
        navigate(`/ticket/${ticket._id}`);
    };

    // ✅ ENHANCED: Handle share ticket
    const handleShareTicket = () => {
        const shareUrl = `${window.location.origin}/marketplace?ticket=${ticket._id}`;
        if (navigator.share) {
            navigator.share({
                title: `Tiket ${concertInfo.name}`,
                text: `Lihat tiket konser ${concertInfo.name} seharga ${ticket.listingPrice} SOL`,
                url: shareUrl
            });
        } else {
            navigator.clipboard.writeText(shareUrl);
            // You can add a toast notification here
            console.log('Link copied to clipboard');
        }
    };

    return (
        <div className={`bg-gray-800 rounded-lg border transition-all duration-300 p-5 ${isOwner
                ? 'border-blue-500/50 shadow-lg shadow-blue-500/10'
                : 'border-gray-700 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10'
            }`}>
            {/* ✅ ENHANCED: Better concert info display dengan owner indicator */}
            <div className="mb-4">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-medium text-lg">{concertInfo.name}</h3>
                            {isOwner && (
                                <div className="px-2 py-1 rounded-full text-xs bg-blue-500 text-white font-medium">
                                    ANDA
                                </div>
                            )}
                        </div>
                        <p className="text-gray-400">{concertInfo.venue}</p>
                        {concertInfo.date && (
                            <p className="text-gray-400 text-sm">{formatDate(concertInfo.date)}</p>
                        )}
                    </div>

                    {/* ✅ ENHANCED: Status badges dengan better styling */}
                    <div className="flex flex-col gap-1">
                        <div className="px-2 py-1 rounded text-xs bg-green-900/30 text-green-400 border border-green-700 flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            Dijual
                        </div>
                        {/* Verified badge jika ada */}
                        {ticket.blockchainVerified && (
                            <div className="px-2 py-1 rounded text-xs bg-purple-900/30 text-purple-400 border border-purple-700">
                                ✅ Verified
                            </div>
                        )}
                    </div>
                </div>

                {/* Warning jika concert info tidak lengkap */}
                {!concertInfo.hasInfo && (
                    <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-700 rounded text-xs text-yellow-400">
                        ⚠️ Informasi konser tidak lengkap
                    </div>
                )}
            </div>

            {/* ✅ ENHANCED: Ticket details dengan better layout */}
            <div className="bg-gray-700/30 rounded-lg p-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-gray-400 text-sm">Seksi</p>
                        <p className="text-white font-medium">{ticket.sectionName || 'Regular'}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Kursi</p>
                        <p className="text-white font-medium">{ticket.seatNumber || 'General'}</p>
                    </div>
                </div>

                {/* ✅ ENHANCED: Additional ticket info */}
                <div className="mt-3 pt-3 border-t border-gray-600 grid grid-cols-2 gap-3 text-xs">
                    <div>
                        <p className="text-gray-500">Original Price</p>
                        <p className="text-gray-300">{ticket.price || ticket.originalPrice || 'N/A'} SOL</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Listed</p>
                        <p className="text-gray-300">{formatDate(ticket.listingDate)}</p>
                    </div>
                </div>
            </div>

            {/* ✅ ENHANCED: Pricing info dengan better validation dan comparison */}
            <div className={`border rounded-lg p-4 mb-4 ${isOwner
                    ? 'bg-blue-900/20 border-blue-700'
                    : 'bg-indigo-900/20 border-indigo-700'
                }`}>
                <div className="flex justify-between items-center">
                    <div>
                        <p className={`text-sm ${isOwner ? 'text-blue-400' : 'text-indigo-400'}`}>
                            {isOwner ? 'Harga Jual Anda' : 'Harga'}
                        </p>
                        {hasValidPrice ? (
                            <div className="flex items-baseline gap-2">
                                <p className="text-white font-bold text-2xl">{ticket.listingPrice} SOL</p>
                                {/* Price comparison */}
                                {ticket.price && parseFloat(ticket.listingPrice) !== parseFloat(ticket.price) && (
                                    <span className={`text-sm ${parseFloat(ticket.listingPrice) > parseFloat(ticket.price)
                                            ? 'text-red-400'
                                            : 'text-green-400'
                                        }`}>
                                        ({parseFloat(ticket.listingPrice) > parseFloat(ticket.price) ? '+' : ''}
                                        {(((parseFloat(ticket.listingPrice) - parseFloat(ticket.price)) / parseFloat(ticket.price)) * 100).toFixed(1)}%)
                                    </span>
                                )}
                            </div>
                        ) : (
                            <p className="text-red-400 font-medium text-lg">Harga tidak valid</p>
                        )}
                    </div>

                    {/* ✅ ENHANCED: Market indicator */}
                    <div className="text-right">
                        <div className={`px-2 py-1 rounded text-xs ${parseFloat(ticket.listingPrice) <= parseFloat(ticket.price || 0)
                                ? 'bg-green-900/30 text-green-400 border border-green-700'
                                : 'bg-orange-900/30 text-orange-400 border border-orange-700'
                            }`}>
                            {parseFloat(ticket.listingPrice) <= parseFloat(ticket.price || 0)
                                ? '💰 Fair Price'
                                : '📈 Premium'
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* ✅ ENHANCED: Seller info dengan better styling */}
            <div className="flex justify-between items-center text-sm mb-4 p-3 bg-gray-700/20 rounded-lg">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-xs text-white">
                        {isOwner ? 'YOU' : '👤'}
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs">
                            {isOwner ? 'Penjual: Anda' : 'Penjual:'}
                        </p>
                        <p className="text-indigo-400 font-mono text-sm" title={ticket.owner}>
                            {formatAddress(ticket.owner, 8, 6)}
                        </p>
                    </div>
                </div>

                {/* ✅ Share button */}
                <button
                    onClick={handleShareTicket}
                    className="p-2 text-gray-400 hover:text-indigo-400 transition-colors"
                    title="Share this ticket"
                >
                    📤
                </button>
            </div>

            {/* ✅ ENHANCED: Action buttons dengan better logic dan styling */}
            <div className="flex flex-col gap-3">
                {isOwner ? (
                    <>
                        {/* Owner actions */}
                        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                            <p className="text-blue-400 text-sm text-center font-medium flex items-center justify-center gap-2">
                                <span className="text-lg">🏪</span>
                                Tiket Anda yang sedang dijual
                            </p>
                            <p className="text-blue-300 text-xs text-center mt-1">
                                Anda akan menerima pembayaran langsung ke wallet
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleManageTicket}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-lg transition-colors text-sm font-medium"
                            >
                                📋 Kelola
                            </button>
                            <button
                                onClick={handleShareTicket}
                                className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded-lg transition-colors text-sm font-medium"
                            >
                                📤 Share
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Buyer actions */}
                        <button
                            onClick={handleBuyClick}
                            disabled={loading || !wallet.connected || !hasValidPrice}
                            className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 ${!hasValidPrice
                                    ? 'bg-red-600/50 text-red-300 cursor-not-allowed'
                                    : loading || !wallet.connected
                                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
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
                                <div className="flex items-center justify-center gap-2">
                                    <span>💰 Beli Tiket</span>
                                    <span className="text-sm opacity-75">({ticket.listingPrice} SOL)</span>
                                </div>
                            )}
                        </button>

                        {/* ✅ ENHANCED: Helper messages */}
                        {!wallet.connected && (
                            <div className="text-center text-sm text-yellow-400 bg-yellow-900/20 border border-yellow-700 rounded p-2">
                                <span className="text-base mr-1">⚠️</span>
                                Hubungkan wallet untuk membeli tiket
                            </div>
                        )}

                        {!hasValidPrice && (
                            <div className="text-center text-sm text-red-400 bg-red-900/20 border border-red-700 rounded p-2">
                                <span className="text-base mr-1">❌</span>
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
                    <p className="text-gray-400">Current User: {wallet.publicKey?.toString()}</p>
                    <p className="text-gray-400">Is Owner: {isOwner ? 'true' : 'false'}</p>
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
    const [sortBy, setSortBy] = useState('date_desc'); // Changed default to newest first
    const [viewMode, setViewMode] = useState('all'); // all, available, mine

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

    // ✅ ENHANCED: Load marketplace tickets - SHOW ALL TICKETS
    useEffect(() => {
        const loadMarketplaceTickets = async () => {
            try {
                setLoading(true);
                setError('');
                console.log('🏪 Loading ALL marketplace tickets...');

                let marketplaceTickets;

                try {
                    // Use API service to get tickets
                    marketplaceTickets = await ApiService.getTicketsForSale(filterConcert);
                    console.log(`📋 Got ${marketplaceTickets?.length || 0} tickets from marketplace API`);
                } catch (apiErr) {
                    console.warn('⚠️ Marketplace API failed, trying fallback:', apiErr);

                    // Fallback to direct API call
                    try {
                        const response = await fetch('/api/tickets/market');
                        if (response.ok) {
                            const data = await response.json();
                            marketplaceTickets = data.tickets || [];
                            console.log(`📋 Got ${marketplaceTickets.length} tickets from fallback API`);
                        } else {
                            throw new Error(`API response not ok: ${response.status}`);
                        }
                    } catch (fallbackErr) {
                        console.error('❌ Fallback API also failed:', fallbackErr);
                        throw new Error('Could not load marketplace tickets');
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

                    return isListed && hasValidPrice && hasOwner;
                });

                console.log(`✅ Filtered to ${validListedTickets.length} valid listed tickets`);

                // ✅ ENHANCED: Process tickets dengan concert info
                const processedTickets = validListedTickets.map(ticket => ({
                    ...ticket,
                    // Ensure we have all necessary fields
                    concertName: ticket.concertName || 'Unknown Concert',
                    concertVenue: ticket.concertVenue || 'Unknown Venue',
                    concertDate: ticket.concertDate || null,
                    concertExists: ticket.concertExists !== false
                }));

                // ✅ ENHANCED: Apply filters
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

                // ✅ ENHANCED: Apply view mode filter
                if (viewMode === 'available' && wallet.connected && wallet.publicKey) {
                    const userAddress = wallet.publicKey.toString();
                    filteredTickets = filteredTickets.filter(
                        ticket => ticket.owner !== userAddress
                    );
                } else if (viewMode === 'mine' && wallet.connected && wallet.publicKey) {
                    const userAddress = wallet.publicKey.toString();
                    filteredTickets = filteredTickets.filter(
                        ticket => ticket.owner === userAddress
                    );
                }

                // ✅ ENHANCED: Apply sorting
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
                        case 'concert_name':
                            return (a.concertName || '').localeCompare(b.concertName || '');
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
    }, [filterConcert, filterSection, sortBy, viewMode, wallet.connected, wallet.publicKey]);

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

        try {
            ApiService.clearAllCaches();
        } catch (err) {
            console.warn('Could not clear caches:', err);
        }

        setLastRefresh(Date.now());
    };

    // Handle buy ticket click
    const handleBuyTicket = (ticket) => {
        setSelectedTicket(ticket);
        setShowBuyConfirm(true);
    };

    // ✅ Buy ticket process (keep existing implementation)
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
            setPurchaseMessage(`Membuat transaksi blockchain...`);

            let signature;
            try {
                signature = await blockchainService.createSolanaPayment(
                    wallet,
                    sellerAddress,
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
                if (txError.message.includes("Insufficient")) {
                    throw new Error(`Saldo tidak mencukupi. Dibutuhkan: ${ticketPrice} SOL.`);
                } else if (txError.message.includes("reject")) {
                    throw new Error("Transaksi ditolak di wallet Anda.");
                } else {
                    throw new Error("Error saat membuat transaksi: " + txError.message);
                }
            }

            if (!signature) {
                throw new Error("Tidak mendapatkan signature transaksi valid");
            }

            // Register purchase with API
            setPurchaseProgress(80);
            setPurchaseMessage("Menyelesaikan proses pembelian tiket...");

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

            // Remove purchased ticket dari local state
            setTickets(prevTickets => prevTickets.filter(t => t._id !== selectedTicket._id));

            // Navigate to my tickets after delay
            setTimeout(() => {
                setProcessingPurchase(false);
                navigate('/my-tickets');
            }, 3000);

        } catch (err) {
            console.error("Error during ticket purchase:", err);
            setPurchaseMessage(`Error: ${err.message || "Gagal membeli tiket"}`);

            setTimeout(() => {
                setProcessingPurchase(false);
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

        const priceRange = tickets.length > 0 ? {
            min: Math.min(...tickets.map(t => parseFloat(t.listingPrice) || 0)),
            max: Math.max(...tickets.map(t => parseFloat(t.listingPrice) || 0))
        } : { min: 0, max: 0 };

        return {
            totalTickets,
            ownedByUser,
            availableToBuy,
            averagePrice,
            priceRange
        };
    };

    const marketStats = getMarketplaceStats();

    // ✅ ENHANCED: Loading state
    if (loading) {
        return <MarketplaceLoadingSpinner message="Memuat semua tiket marketplace..." />;
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
                {/* ✅ ENHANCED: Header dengan better statistics */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">🏪 Marketplace Tiket</h1>
                        <p className="text-gray-400 mb-3">
                            Jelajahi semua tiket yang dijual di marketplace
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                <span className="text-green-400">{marketStats.availableToBuy} dapat dibeli</span>
                            </div>
                            {marketStats.ownedByUser > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                                    <span className="text-blue-400">{marketStats.ownedByUser} tiket Anda</span>
                                </div>
                            )}
                            {marketStats.averagePrice > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                                    <span className="text-gray-400">
                                        Rata-rata: {marketStats.averagePrice} SOL
                                        {marketStats.priceRange.min !== marketStats.priceRange.max && (
                                            <span className="text-gray-500 ml-1">
                                                ({marketStats.priceRange.min} - {marketStats.priceRange.max})
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-indigo-400 rounded-full"></div>
                                <span className="text-gray-400">{marketStats.totalTickets} total tiket</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 md:mt-0 flex items-center space-x-3">
                        {/* Refresh button */}
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
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

                {/* ✅ ENHANCED: Filter and Sort dengan view mode */}
                <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
                    {/* ✅ ENHANCED: View Mode Tabs */}
                    <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setViewMode('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'all'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                🌐 Semua Tiket ({marketStats.totalTickets})
                            </button>
                            <button
                                onClick={() => setViewMode('available')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'available'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                💰 Dapat Dibeli ({marketStats.availableToBuy})
                            </button>
                            {wallet.connected && marketStats.ownedByUser > 0 && (
                                <button
                                    onClick={() => setViewMode('mine')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'mine'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    👤 Tiket Saya ({marketStats.ownedByUser})
                                </button>
                            )}
                        </div>
                    </div>

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

                        {/* Enhanced Sort */}
                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Urutkan
                            </label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white"
                            >
                                <option value="date_desc">Terbaru Daftar</option>
                                <option value="date_asc">Terlama Daftar</option>
                                <option value="price_asc">Harga: Terendah</option>
                                <option value="price_desc">Harga: Tertinggi</option>
                                <option value="concert_name">Nama Konser</option>
                            </select>
                        </div>

                        {/* Wallet Balance Display */}
                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                {wallet.connected ? 'Saldo Anda' : 'Wallet Status'}
                            </label>
                            <div className="bg-gray-700 border border-gray-600 rounded-lg p-2 text-white h-10 flex items-center">
                                {wallet.connected ? (
                                    <span className="text-green-400 font-medium">
                                        {solanaBalance.toFixed(4)} SOL
                                    </span>
                                ) : (
                                    <span className="text-gray-400 text-sm">
                                        Tidak terhubung
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ✅ DEBUG INFO untuk development */}
                    {process.env.NODE_ENV === 'development' && debugInfo && (
                        <div className="mt-3 p-2 bg-blue-900/10 border border-blue-800 rounded text-xs">
                            <p className="text-blue-400">DEBUG: {debugInfo}</p>
                            <p className="text-gray-400">Last refresh: {new Date(lastRefresh).toLocaleTimeString()}</p>
                            <p className="text-gray-400">View mode: {viewMode}</p>
                            <p className="text-gray-400">Connected wallet: {wallet.publicKey?.toString() || 'None'}</p>
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

                {/* ✅ ENHANCED: No tickets message dengan better UX */}
                {tickets.length === 0 && !loading && !error && (
                    <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
                        <div className="text-6xl mb-4">
                            {viewMode === 'mine' ? '👤' : viewMode === 'available' ? '💰' : '🏪'}
                        </div>
                        <h2 className="text-xl text-white mb-4">
                            {viewMode === 'mine'
                                ? 'Anda Belum Menjual Tiket'
                                : viewMode === 'available'
                                    ? 'Tidak Ada Tiket yang Dapat Dibeli'
                                    : 'Tidak Ada Tiket di Marketplace'
                            }
                        </h2>
                        <p className="text-gray-400 mb-6">
                            {viewMode === 'mine'
                                ? 'Anda belum memiliki tiket yang sedang dijual di marketplace.'
                                : viewMode === 'available'
                                    ? 'Tidak ada tiket yang tersedia untuk dibeli saat ini.'
                                    : 'Belum ada tiket yang dijual di marketplace.'
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
                            {viewMode !== 'all' && (
                                <button
                                    onClick={() => setViewMode('all')}
                                    className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded-lg transition-colors"
                                >
                                    👁️ Lihat Semua Tiket
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ✅ ENHANCED: Tickets grid dengan better responsive */}
                {tickets.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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

                {/* ✅ ENHANCED: Navigation links dengan better organization */}
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                    <Link
                        to="/my-tickets"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
                    >
                        🎫 Tiket Saya
                    </Link>
                    <Link
                        to="/mint-ticket"
                        className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
                    >
                        🛒 Beli Tiket Baru
                    </Link>
                    <Link
                        to="/collections"
                        className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
                    >
                        🎵 Lihat Konser
                    </Link>
                </div>

                {/* ✅ ENHANCED: Footer info dengan better styling */}
                <div className="mt-12 bg-gray-800/50 rounded-lg p-6 text-center border border-gray-700">
                    <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🔐</span>
                            <span>Transaksi diamankan blockchain Solana</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">💰</span>
                            <span>Pembayaran langsung ke wallet penjual</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">⚡</span>
                            <span>Transaksi instan & mudah</span>
                        </div>
                    </div>
                    {process.env.NODE_ENV === 'development' && (
                        <p className="mt-4 text-blue-400 text-sm">
                            🔧 Development Mode: Debug features aktif
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TicketMarketplace;