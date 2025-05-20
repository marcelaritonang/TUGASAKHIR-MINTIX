// src/components/TicketMarketplace.js
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

// Marketplace Ticket Card Component
const MarketplaceTicketCard = ({ ticket, onBuy, isOwner }) => {
    const [loading, setLoading] = useState(false);
    const wallet = useWallet();
    const navigate = useNavigate();

    // Cek harga tiket valid
    const hasValidPrice = ticket.listingPrice && parseFloat(ticket.listingPrice) > 0;

    // Fungsi untuk menangani klik beli
    const handleBuyClick = (e) => {
        e.preventDefault();
        if (onBuy) onBuy(ticket);
    };

    // Fungsi untuk melihat detail tiket
    const handleViewSellerProfile = () => {
        if (ticket.owner) {
            console.log(`Viewing seller profile for ${ticket.owner}`);
            // Navigate ke halaman profil penjual (jika ada)
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 hover:border-indigo-500 transition-colors p-5">
            {/* Concert & Ticket info */}
            <div className="mb-4">
                <h3 className="text-white font-medium text-lg">{ticket.concertName || 'Unknown Concert'}</h3>
                <p className="text-gray-400">{ticket.concertVenue || 'Unknown Venue'}</p>
                {ticket.concertDate && (
                    <p className="text-gray-400 text-sm">{formatDate(ticket.concertDate)}</p>
                )}
            </div>

            {/* Ticket details */}
            <div className="bg-gray-700/30 rounded-lg p-3 mb-4">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <p className="text-gray-400 text-sm">Seksi</p>
                        <p className="text-white">{ticket.sectionName || 'Regular'}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Kursi</p>
                        <p className="text-white">{ticket.seatNumber || 'General'}</p>
                    </div>
                </div>
            </div>

            {/* Pricing info */}
            <div className="bg-indigo-900/20 border border-indigo-700 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-indigo-400 text-sm">Harga</p>
                        <p className="text-white font-medium text-2xl">{hasValidPrice ? `${ticket.listingPrice} SOL` : 'Harga tidak valid'}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs">Terdaftar pada</p>
                        <p className="text-white text-sm">{formatDate(ticket.listingDate)}</p>
                    </div>
                </div>
            </div>

            {/* Seller info */}
            <div className="flex justify-between items-center text-sm mb-4">
                <div>
                    <span className="text-gray-400">Penjual:</span>
                    <span
                        className="text-indigo-400 ml-1 hover:underline cursor-pointer"
                        onClick={handleViewSellerProfile}
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

            {/* Action buttons */}
            <div className="flex justify-between mt-4">
                {isOwner ? (
                    <div className="w-full">
                        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 mb-3">
                            <p className="text-yellow-400 text-sm text-center">Ini tiket Anda yang sedang dijual</p>
                        </div>
                        <Link
                            to={`/ticket/${ticket._id}`}
                            className="w-full block bg-indigo-600 hover:bg-indigo-700 text-center text-white py-2 px-4 rounded-lg transition-colors"
                        >
                            Kelola Tiket
                        </Link>
                    </div>
                ) : (
                    <div className="w-full flex flex-col gap-2">
                        <button
                            onClick={handleBuyClick}
                            disabled={loading || !wallet.connected || !hasValidPrice}
                            className={`w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50`}
                        >
                            {loading ? 'Processing...' : 'Beli Tiket'}
                        </button>

                        {!wallet.connected && (
                            <div className="text-center text-sm text-yellow-400">
                                Hubungkan wallet untuk membeli
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Main TicketMarketplace Component
const TicketMarketplace = () => {
    const wallet = useWallet();
    const navigate = useNavigate();
    const { approvedConcerts, loadApprovedConcerts } = useConcerts();

    // States
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [filterConcert, setFilterConcert] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [sortBy, setSortBy] = useState('price_asc');

    // Purchase states
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showBuyConfirm, setShowBuyConfirm] = useState(false);
    const [processingPurchase, setProcessingPurchase] = useState(false);
    const [purchaseProgress, setPurchaseProgress] = useState(0);
    const [purchaseMessage, setPurchaseMessage] = useState('');
    const [solanaBalance, setSolanaBalance] = useState(0);

    // Authentication check
    useEffect(() => {
        const checkAuth = async () => {
            const isAuth = AuthService.isAuthenticated();
            setIsAuthenticated(isAuth);
        };

        checkAuth();
    }, [wallet]);

    // Load marketplace tickets
    useEffect(() => {
        const loadMarketplaceTickets = async () => {
            try {
                setLoading(true);
                console.log('Loading marketplace tickets...');

                // Determine which concert ID to filter by, if any
                const concertId = filterConcert || null;

                // Get all listed tickets
                const marketplaceTickets = await ApiService.getTicketsForSale(concertId);

                console.log(`Got ${marketplaceTickets.length} marketplace tickets`);

                if (!Array.isArray(marketplaceTickets)) {
                    console.error('Invalid marketplace tickets data:', marketplaceTickets);
                    setTickets([]);
                    setError('Data tiket pasar tidak valid');
                    return;
                }

                // Enhance ticket data with concert info
                const enhancedTickets = await Promise.all(
                    marketplaceTickets.map(async (ticket) => {
                        try {
                            // Get concert data if not already included
                            if (!ticket.concertName && ticket.concertId) {
                                const concertData = await ApiService.getConcert(ticket.concertId);
                                if (concertData) {
                                    return {
                                        ...ticket,
                                        concertName: concertData.name,
                                        concertVenue: concertData.venue,
                                        concertDate: concertData.date
                                    };
                                }
                            }
                            return ticket;
                        } catch (err) {
                            console.error(`Error fetching concert data for ticket ${ticket._id}:`, err);
                            return ticket;
                        }
                    })
                );

                // Apply filters and sorting
                let filteredTickets = enhancedTickets;

                // Filter by section if selected
                if (filterSection) {
                    filteredTickets = filteredTickets.filter(
                        ticket => ticket.sectionName === filterSection
                    );
                }

                // Apply sorting
                filteredTickets.sort((a, b) => {
                    switch (sortBy) {
                        case 'price_asc':
                            return parseFloat(a.listingPrice || 0) - parseFloat(b.listingPrice || 0);
                        case 'price_desc':
                            return parseFloat(b.listingPrice || 0) - parseFloat(a.listingPrice || 0);
                        case 'date_asc':
                            return new Date(a.listingDate || 0) - new Date(b.listingDate || 0);
                        case 'date_desc':
                            return new Date(b.listingDate || 0) - new Date(a.listingDate || 0);
                        default:
                            return 0;
                    }
                });

                setTickets(filteredTickets);
            } catch (err) {
                console.error('Error loading marketplace tickets:', err);
                setError('Gagal memuat tiket pasar. Silakan coba lagi nanti.');
            } finally {
                setLoading(false);
            }
        };

        loadMarketplaceTickets();
    }, [filterConcert, filterSection, sortBy]);

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

    // Handle buy ticket click
    const handleBuyTicket = (ticket) => {
        setSelectedTicket(ticket);
        setShowBuyConfirm(true);
    };

    // Handle buy confirmation
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

            // PERBAIKAN: Clear caches lebih komprehensif
            try {
                // Clear semua cache terkait tiket
                ApiService.clearAllCaches();

                // Hapus tiket yang dibeli dari array tiket lokal
                setTickets(tickets.filter(t => t._id !== selectedTicket._id));

                // Hapus tiket dari localStorage
                const marketplaceTickets = JSON.parse(localStorage.getItem('marketplaceTickets') || '[]');
                localStorage.setItem(
                    'marketplaceTickets',
                    JSON.stringify(marketplaceTickets.filter(t => t._id !== selectedTicket._id))
                );

                // Wajib refresh data supaya tiket yang sudah dibeli hilang dari marketplace
                setTimeout(() => {
                    window.location.reload();
                }, 3000);

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

            // Provide specific error messages
            if (err.message.includes("Insufficient") || err.message.includes("Saldo tidak mencukupi")) {
                setPurchaseMessage(`Error: Saldo tidak mencukupi. Dibutuhkan: ${selectedTicket.listingPrice} SOL. Saldo Anda: ${solanaBalance.toFixed(4)} SOL`);
            } else if (err.message.includes("User rejected") || err.message.includes("ditolak")) {
                setPurchaseMessage("Error: Transaksi ditolak di dompet Anda. Silakan coba lagi.");
            } else if (err.message.includes("timeout") || err.message.includes("Timeout")) {
                setPurchaseMessage("Error: Waktu transaksi habis. Jaringan Solana mungkin sibuk, silakan coba lagi nanti.");
            } else {
                setPurchaseMessage(`Error: ${err.message || "Gagal membeli tiket"}`);
            }

            // Clear purchase state after showing error
            setTimeout(() => {
                setProcessingPurchase(false);
            }, 5000);
        }
    };


    // Get unique section names for filter
    const getUniqueSections = () => {
        const sections = tickets
            .map(ticket => ticket.sectionName)
            .filter((value, index, self) => self.indexOf(value) === index);
        return sections;
    };

    // Check if user owns this ticket
    const isTicketOwner = (ticket) => {
        return wallet.connected && wallet.publicKey &&
            ticket.owner && wallet.publicKey.toString() === ticket.owner;
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col items-center justify-center mt-20">
                        <LoadingSpinner size="lg" />
                        <p className="text-gray-300 mt-4">Memuat marketplace tiket...</p>
                    </div>
                </div>
            </div>
        );
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
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Marketplace Tiket</h1>
                        <p className="text-gray-400">
                            Jelajahi dan beli tiket dari pengguna lain
                        </p>
                    </div>

                    {!wallet.connected && (
                        <div className="mt-4 md:mt-0">
                            <WalletMultiButton className="bg-indigo-600 hover:bg-indigo-700" />
                        </div>
                    )}
                </div>

                {/* Filter and Sort */}
                <div className="bg-gray-800 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    </div>

                    {/* Stats */}
                    <div className="flex justify-between mt-4 pt-4 border-t border-gray-700">
                        <div className="text-sm text-gray-400">
                            {tickets.length} tiket ditemukan
                        </div>
                        {wallet.connected && (
                            <div className="text-sm text-gray-400">
                                Saldo SOL Anda: <span className="text-white font-medium">{solanaBalance.toFixed(4)} SOL</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* No tickets message */}
                {tickets.length === 0 && !loading && !error && (
                    <div className="bg-gray-800 rounded-lg p-8 text-center">
                        <h2 className="text-xl text-white mb-4">Tidak Ada Tiket yang Dijual</h2>
                        <p className="text-gray-400 mb-6">
                            Tidak ditemukan tiket yang dijual di marketplace saat ini. Silakan coba lagi nanti.
                        </p>
                        <Link
                            to="/mint-ticket"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-lg transition-colors"
                        >
                            Beli Tiket Baru
                        </Link>
                    </div>
                )}

                {/* Tickets grid */}
                {tickets.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tickets.map(ticket => (
                            <MarketplaceTicketCard
                                key={ticket._id}
                                ticket={ticket}
                                onBuy={handleBuyTicket}
                                isOwner={isTicketOwner(ticket)}
                            />
                        ))}
                    </div>
                )}

                {/* Navigation links */}
                <div className="mt-8 flex justify-center gap-4">
                    <Link
                        to="/my-tickets"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-lg transition-colors"
                    >
                        Tiket Saya
                    </Link>
                    <Link
                        to="/mint-ticket"
                        className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg transition-colors"
                    >
                        Beli Tiket Baru
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default TicketMarketplace;