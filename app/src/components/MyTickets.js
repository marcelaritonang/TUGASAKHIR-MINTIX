// src/components/MyTickets.js - ENHANCED VERSION with Deleted Concert Support
import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useNavigate, Link } from 'react-router-dom';

// Import services
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import { useConcerts } from '../context/ConcertContext';

// Import components
import LoadingSpinner from './common/LoadingSpinner';

// Helper functions
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

const formatAddress = (address, start = 6, end = 4) => {
    if (!address) return 'N/A';
    return `${address.slice(0, start)}...${address.slice(-end)}`;
};

// Enhanced Ticket Card Component with Better Concert Info Handling
const TicketCard = ({ ticket, onViewDetails, refreshTickets }) => {
    const [loading, setLoading] = useState(false);
    const [processingAction, setProcessingAction] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSellForm, setShowSellForm] = useState(false);
    const [listingPrice, setListingPrice] = useState('');
    const [processingListing, setProcessingListing] = useState(false);
    const [showMintingTime, setShowMintingTime] = useState(false);

    // Enhanced state untuk menampilkan pesan sukses
    const [successMessage, setSuccessMessage] = useState('');
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    // Enhanced blockchain status check
    const getBlockchainStatus = () => {
        // Check for direct verification flag first
        if (ticket.isVerified || (ticket.blockchainStatus && ticket.blockchainStatus.verified)) {
            return 'verified';
        }

        // Check for valid transaction signature format
        if (ticket.transactionSignature &&
            !ticket.transactionSignature.startsWith('dummy_') &&
            !ticket.transactionSignature.startsWith('added_') &&
            !ticket.transactionSignature.startsWith('error_')) {
            return 'valid';
        }

        return 'invalid';
    };

    // Enhanced concert info extraction
    const getConcertDisplayInfo = () => {
        // If concert exists in API, use that
        if (ticket.concertExists) {
            return {
                displayName: ticket.concertName || 'Konser',
                displayVenue: ticket.concertVenue || 'Lokasi Tidak Diketahui',
                displayDate: ticket.concertDate,
                isDeleted: false,
                badgeText: 'Aktif',
                badgeColor: 'bg-green-900/30 text-green-400 border-green-700'
            };
        }

        // If concert doesn't exist but we have name from transaction history
        if (ticket.concertName && ticket.concertName !== 'Konser Tidak Diketahui') {
            return {
                displayName: ticket.concertName,
                displayVenue: ticket.concertVenue || 'Venue Tidak Diketahui',
                displayDate: null,
                isDeleted: true,
                badgeText: 'Konser Dihapus',
                badgeColor: 'bg-yellow-900/30 text-yellow-400 border-yellow-700'
            };
        }

        // Fallback for completely unknown concerts
        return {
            displayName: 'Konser Tidak Tersedia',
            displayVenue: 'Lokasi Tidak Diketahui',
            displayDate: null,
            isDeleted: true,
            badgeText: 'Data Hilang',
            badgeColor: 'bg-red-900/30 text-red-400 border-red-700'
        };
    };

    // Cek apakah tiket dapat dijual
    const canSellTicket = () => {
        const blockchainStatus = getBlockchainStatus();
        return blockchainStatus === 'verified' || blockchainStatus === 'valid';
    };

    // Enhanced minting performance extraction
    const getMintingPerformance = () => {
        try {
            const performanceData = localStorage.getItem('mint_performance_metrics');
            if (!performanceData) return null;

            const perfMetrics = JSON.parse(performanceData);
            if (!Array.isArray(perfMetrics) || perfMetrics.length === 0) return null;

            // Find matching metrics based on concert ID and seat number
            const matchingMetrics = perfMetrics.filter(metric => {
                if (metric.ticketData) {
                    if (metric.ticketData.concertId === ticket.concertId &&
                        metric.ticketData.seatNumber === ticket.seatNumber) {
                        return true;
                    }
                }

                // Match based on timestamp near createdAt
                if (metric.timestamp && ticket.createdAt) {
                    const metricTime = new Date(metric.timestamp).getTime();
                    const ticketTime = new Date(ticket.createdAt).getTime();
                    const fiveMinutes = 5 * 60 * 1000;
                    return Math.abs(metricTime - ticketTime) < fiveMinutes;
                }

                return false;
            });

            return matchingMetrics.length > 0 ? matchingMetrics[matchingMetrics.length - 1] : null;
        } catch (err) {
            console.error("Error getting minting performance:", err);
            return null;
        }
    };

    const mintingPerformance = getMintingPerformance();
    const blockchainStatus = getBlockchainStatus();
    const concertInfo = getConcertDisplayInfo();

    // Enhanced success message display
    const showTemporarySuccess = (message) => {
        setSuccessMessage(message);
        setShowSuccessMessage(true);
        setTimeout(() => {
            setShowSuccessMessage(false);
        }, 5000);
    };

    // Enhanced Minting Time Info Component
    const MintingTimeInfo = () => {
        if (!mintingPerformance) return null;

        return (
            <div className="mt-3 bg-gray-700/30 rounded-lg p-3 overflow-hidden">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-purple-400">Minting Performance</h4>
                    <button
                        onClick={() => setShowMintingTime(!showMintingTime)}
                        className="text-xs text-indigo-400 hover:underline focus:outline-none"
                    >
                        {showMintingTime ? 'Hide Details' : 'Show Details'}
                    </button>
                </div>

                <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Total Time:</span>
                    <span className="text-white font-medium">{mintingPerformance.totalTime.toFixed(2)}s</span>
                </div>

                <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Network:</span>
                    <span className="text-white">Solana Testnet</span>
                </div>

                {showMintingTime && (
                    <div className="mt-2 space-y-1 border-t border-gray-600 pt-2">
                        <div className="text-xs text-gray-400 mb-1">Step Breakdown:</div>

                        {mintingPerformance.steps.map((step, index) => (
                            <div key={index} className="grid grid-cols-12 gap-1 text-xs">
                                <div className="col-span-8 text-gray-400 truncate">{step.name}</div>
                                <div className="col-span-2 text-right text-gray-400">{step.time.toFixed(2)}s</div>
                                <div className="col-span-2 text-right text-gray-500">({step.percentage?.toFixed(1) || 0}%)</div>
                            </div>
                        ))}

                        <div className="text-right text-xs text-gray-500 mt-1">
                            Minted: {new Date(mintingPerformance.timestamp).toLocaleString()}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Enhanced action handlers
    const handleDeleteTicket = async () => {
        try {
            setProcessingAction(true);
            const response = await ApiService.deleteTicket(ticket._id);
            if (response.success) {
                showTemporarySuccess('Tiket berhasil dihapus');
                if (refreshTickets) await refreshTickets();
            } else {
                throw new Error(response.msg || 'Gagal menghapus tiket');
            }
        } catch (err) {
            console.error('Error menghapus tiket:', err);
            alert('Error: ' + (err.message || 'Gagal menghapus tiket'));
        } finally {
            setProcessingAction(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleCancelListing = async () => {
        try {
            setProcessingAction(true);
            const response = await ApiService.cancelTicketListing(ticket._id);
            if (response.success) {
                showTemporarySuccess('Pembatalan listing berhasil');
                if (refreshTickets) await refreshTickets();
            } else {
                throw new Error(response.msg || 'Gagal membatalkan listing');
            }
        } catch (err) {
            console.error('Error membatalkan listing:', err);
            alert('Error: ' + (err.message || 'Gagal membatalkan listing'));
        } finally {
            setProcessingAction(false);
        }
    };

    const handleListTicket = async () => {
        if (!listingPrice || listingPrice.trim() === '') {
            alert('Silakan masukkan harga yang valid');
            return;
        }

        const price = parseFloat(listingPrice);
        if (isNaN(price) || price <= 0) {
            alert('Harga harus berupa angka positif lebih dari 0');
            return;
        }

        try {
            setProcessingListing(true);
            console.log(`Mendaftarkan tiket ${ticket._id} untuk dijual dengan harga ${price} SOL`);

            const response = await ApiService.listTicketForSale(ticket._id, price);
            console.log("List ticket response:", response);

            if (response.success) {
                showTemporarySuccess(`Tiket berhasil didaftarkan untuk dijual dengan harga ${price} SOL`);
                if (refreshTickets) await refreshTickets();
            } else {
                throw new Error(response.msg || 'Gagal mendaftarkan tiket');
            }
        } catch (err) {
            console.error('Error mendaftarkan tiket:', err);
            alert('Error: ' + (err.message || 'Gagal mendaftarkan tiket'));
        } finally {
            setProcessingListing(false);
            setShowSellForm(false);
        }
    };

    // Enhanced UI rendering
    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors p-4">
            {/* Success message notification */}
            {showSuccessMessage && (
                <div className="bg-green-500/10 border border-green-500 rounded-lg p-3 mb-4">
                    <p className="text-green-500 text-sm">{successMessage}</p>
                </div>
            )}

            {/* Enhanced header with better concert info */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-white font-medium text-lg">
                        {concertInfo.displayName}
                    </h3>
                    <p className="text-gray-400">{concertInfo.displayVenue}</p>
                    {concertInfo.displayDate && !concertInfo.isDeleted && (
                        <p className="text-gray-400 text-sm">{formatDate(concertInfo.displayDate)}</p>
                    )}
                    {concertInfo.isDeleted && (
                        <p className="text-yellow-400 text-xs mt-1">
                            ⚠️ Konser telah dihapus dari sistem
                        </p>
                    )}
                </div>
                <div className="flex flex-col gap-1">
                    {/* Concert status badge */}
                    <div className={`px-2 py-1 rounded text-xs border ${concertInfo.badgeColor}`}>
                        {concertInfo.badgeText}
                    </div>
                    {/* Blockchain status badge */}
                    <div className={`px-2 py-1 rounded text-xs border ${blockchainStatus === 'verified' ? 'bg-green-900/30 text-green-400 border-green-700' :
                            blockchainStatus === 'valid' ? 'bg-blue-900/30 text-blue-400 border-blue-700' :
                                'bg-red-900/30 text-red-400 border-red-700'
                        }`}>
                        {blockchainStatus === 'verified' ? '✅ Verified' :
                            blockchainStatus === 'valid' ? '🔵 Valid TX' :
                                '❌ Invalid TX'}
                    </div>
                </div>
            </div>

            {/* Enhanced ticket details */}
            <div className="flex justify-between items-center mb-3">
                <div>
                    <p className="text-gray-300 text-sm">Seksi</p>
                    <p className="text-white font-medium">{ticket.sectionName || 'Reguler'}</p>
                </div>
                <div>
                    <p className="text-gray-300 text-sm">Kursi</p>
                    <p className="text-white font-medium">{ticket.seatNumber || 'Umum'}</p>
                </div>
                <div>
                    <p className="text-gray-300 text-sm">Harga</p>
                    <p className="text-white font-medium">{ticket.price} SOL</p>
                </div>
                <div>
                    <p className="text-gray-300 text-sm">Status</p>
                    <p className="text-white capitalize">{ticket.status || 'Aktif'}</p>
                </div>
            </div>

            {/* Enhanced ticket info with blockchain details */}
            <div className="bg-gray-700/30 p-3 rounded-lg mb-3">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Pemilik</span>
                    <span className="text-white font-mono">{formatAddress(ticket.owner)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-300">Dibuat</span>
                    <span className="text-white">{formatDate(ticket.createdAt)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-300">Ticket ID</span>
                    <span className="text-white font-mono">{formatAddress(ticket._id)}</span>
                </div>
                {ticket.transactionSignature && (
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-300">Transaksi</span>
                        <span className={`text-sm ${blockchainStatus === 'verified' || blockchainStatus === 'valid' ? 'text-green-400' : 'text-red-400'}`}>
                            {ticket.transactionSignature.startsWith('dummy_') ||
                                ticket.transactionSignature.startsWith('added_') ||
                                ticket.transactionSignature.startsWith('error_') ? (
                                'Invalid/Test TX'
                            ) : (
                                <a href={`https://explorer.solana.com/tx/${ticket.transactionSignature}?cluster=testnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                >
                                    {formatAddress(ticket.transactionSignature, 8, 8)}
                                </a>
                            )}
                        </span>
                    </div>
                )}
            </div>

            {/* Enhanced Minting Performance Metrics */}
            {mintingPerformance && <MintingTimeInfo />}

            {/* Enhanced marketplace listing or action buttons */}
            {ticket.isListed ? (
                <div className="mt-3 bg-indigo-900/20 border border-indigo-600 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                        <div>
                            <h4 className="text-indigo-400 text-sm font-medium">🏪 Dijual di Marketplace</h4>
                            <p className="text-white font-bold text-lg">{ticket.listingPrice} SOL</p>
                            <p className="text-gray-400 text-xs">
                                Terdaftar pada {formatDate(ticket.listingDate)}
                            </p>
                        </div>
                        <button
                            onClick={handleCancelListing}
                            disabled={processingAction}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors disabled:opacity-50"
                        >
                            {processingAction ? 'Memproses...' : 'Batalkan Listing'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                    {/* Delete button */}
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={processingAction}
                        className="px-4 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm transition-colors disabled:opacity-50"
                    >
                        {processingAction ? '...' : '🗑️ Hapus'}
                    </button>

                    {/* Enhanced sell ticket button/form */}
                    {canSellTicket() && (
                        !showSellForm ? (
                            <button
                                onClick={() => setShowSellForm(true)}
                                disabled={processingAction}
                                className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded text-sm transition-colors disabled:opacity-50"
                            >
                                💰 Jual di Marketplace
                            </button>
                        ) : (
                            <div className="w-full mt-2 bg-indigo-900/20 border border-indigo-600 rounded-lg p-3">
                                <h4 className="text-indigo-400 text-sm font-medium mb-2">Jual Tiket di Marketplace</h4>
                                <p className="text-gray-300 text-xs mb-3">
                                    Tiket akan tampil di marketplace. Pembeli mengirim SOL langsung ke wallet Anda.
                                </p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <label className="block text-gray-300 text-xs mb-1">Harga Jual (SOL)</label>
                                        <input
                                            type="number"
                                            value={listingPrice}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                                                    setListingPrice(value);
                                                }
                                            }}
                                            placeholder="Masukkan harga dalam SOL"
                                            step="0.01"
                                            min="0.01"
                                            className="bg-gray-700 text-white p-2 rounded w-full text-sm"
                                            required
                                        />
                                        {listingPrice && (parseFloat(listingPrice) <= 0 || isNaN(parseFloat(listingPrice))) && (
                                            <p className="text-red-400 text-xs mt-1">Harga harus lebih dari 0</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 self-end">
                                        <button
                                            onClick={handleListTicket}
                                            disabled={processingListing || !listingPrice}
                                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm transition-colors disabled:opacity-50"
                                        >
                                            {processingListing ? 'Listing...' : '✅ Jual'}
                                        </button>
                                        <button
                                            onClick={() => setShowSellForm(false)}
                                            disabled={processingListing}
                                            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm transition-colors disabled:opacity-50"
                                        >
                                            ❌ Batal
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}

            {/* Enhanced view details button */}
            <button
                onClick={() => onViewDetails(ticket._id)}
                className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded text-sm transition-colors"
            >
                📋 Lihat Detail & Riwayat Lengkap
            </button>

            {/* Enhanced delete confirmation modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700">
                        <h3 className="text-lg text-white font-medium mb-4">⚠️ Konfirmasi Penghapusan</h3>
                        <p className="text-gray-300 mb-4">
                            Apakah Anda yakin ingin menghapus tiket ini? Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3 mb-4">
                            <p className="text-yellow-400 text-sm">
                                <strong>Tiket:</strong> {concertInfo.displayName} - {ticket.sectionName} {ticket.seatNumber}
                            </p>
                            {concertInfo.isDeleted && (
                                <p className="text-yellow-400 text-xs mt-1">
                                    Catatan: Tiket ini untuk konser yang telah dihapus.
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={processingAction}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDeleteTicket}
                                disabled={processingAction}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {processingAction ? 'Menghapus...' : '🗑️ Hapus Tiket'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Enhanced Main MyTickets component
const MyTickets = () => {
    const wallet = useWallet();
    const navigate = useNavigate();
    const { loadMyTickets } = useConcerts();

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());
    const [showDeletedConcerts, setShowDeletedConcerts] = useState(true); // Default to showing all tickets

    // Enhanced authentication check
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                setIsAuthenticated(false);
                setLoading(false);
                return;
            }

            try {
                const isValid = await AuthService.validateToken();
                setIsAuthenticated(isValid);
                if (!isValid) {
                    console.log("Auth token invalid");
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error validating token:", err);
                setIsAuthenticated(false);
                setLoading(false);
            }
        };

        checkAuth();
    }, [wallet]);

    // Enhanced load tickets with better concert info handling
    useEffect(() => {
        const loadTickets = async () => {
            if (!isAuthenticated) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError('');
                console.log('Loading tickets with enhanced concert info handling...');

                // Get ALL tickets (including tickets for deleted concerts)
                const userTickets = await ApiService.getMyTickets(false);

                if (Array.isArray(userTickets)) {
                    console.log(`Got ${userTickets.length} tickets from API`);

                    // ENHANCED: Process tickets with better concert info extraction
                    const processedTickets = [];

                    for (const ticket of userTickets) {
                        let enhancedTicket = { ...ticket };

                        // Initialize concert info
                        enhancedTicket.concertExists = false;
                        enhancedTicket.concertName = 'Konser Tidak Diketahui';
                        enhancedTicket.concertVenue = 'Lokasi Tidak Diketahui';
                        enhancedTicket.concertDate = null;

                        // Try to get concert from API first
                        try {
                            if (ticket.concertId) {
                                const concert = await ApiService.getConcert(ticket.concertId);
                                if (concert) {
                                    enhancedTicket.concertExists = true;
                                    enhancedTicket.concertName = concert.name;
                                    enhancedTicket.concertVenue = concert.venue;
                                    enhancedTicket.concertDate = concert.date;
                                    console.log(`✅ Found concert: ${concert.name}`);
                                }
                            }
                        } catch (err) {
                            console.log(`❌ Concert ${ticket.concertId} not found in API`);
                        }

                        // ENHANCED: If concert not found, extract info from transaction history
                        if (!enhancedTicket.concertExists && ticket.transactionHistory) {
                            const mintTx = ticket.transactionHistory.find(tx => tx.action === 'mint');
                            if (mintTx && mintTx.metadata) {
                                enhancedTicket.concertName = mintTx.metadata.concertName || 'Konser Terhapus';
                                enhancedTicket.concertVenue = mintTx.metadata.venue || 'Venue Tidak Diketahui';
                                console.log(`📝 Using transaction history: ${enhancedTicket.concertName}`);
                            }
                        }

                        processedTickets.push(enhancedTicket);
                    }

                    console.log(`✅ Processed ${processedTickets.length} tickets with enhanced info`);
                    setTickets(processedTickets);

                    // Store in localStorage as backup
                    localStorage.setItem('myTickets', JSON.stringify(processedTickets));
                } else {
                    throw new Error("Invalid response format from API");
                }
            } catch (err) {
                console.error("Error loading tickets:", err);
                setError('Gagal memuat tiket. Silakan coba lagi nanti.');

                // Enhanced fallback to localStorage
                try {
                    const cachedTickets = JSON.parse(localStorage.getItem('myTickets') || '[]');
                    if (cachedTickets.length > 0) {
                        console.log(`📦 Using ${cachedTickets.length} cached tickets`);
                        setTickets(cachedTickets);
                    }
                } catch (cacheError) {
                    console.error("Error loading cached tickets:", cacheError);
                }
            } finally {
                setLoading(false);
            }
        };

        if (isAuthenticated) {
            loadTickets();
        }
    }, [isAuthenticated]);

    // Enhanced navigation and refresh functions
    const handleViewDetails = (ticketId) => {
        navigate(`/ticket/${ticketId}`);
    };

    const refreshTickets = async () => {
        try {
            setLoading(true);
            console.log("🔄 Refreshing tickets...");

            const userTickets = await ApiService.getMyTickets(false, true); // Force refresh

            if (Array.isArray(userTickets)) {
                const processedTickets = [];

                for (const ticket of userTickets) {
                    let enhancedTicket = { ...ticket };

                    // Reset concert info
                    enhancedTicket.concertExists = false;
                    enhancedTicket.concertName = 'Konser Tidak Diketahui';
                    enhancedTicket.concertVenue = 'Lokasi Tidak Diketahui';
                    enhancedTicket.concertDate = null;

                    // Check concert existence
                    try {
                        if (ticket.concertId) {
                            const concert = await ApiService.getConcert(ticket.concertId);
                            if (concert) {
                                enhancedTicket.concertExists = true;
                                enhancedTicket.concertName = concert.name;
                                enhancedTicket.concertVenue = concert.venue;
                                enhancedTicket.concertDate = concert.date;
                            }
                        }
                    } catch (err) {
                        // Concert not found, try transaction history
                        if (ticket.transactionHistory) {
                            const mintTx = ticket.transactionHistory.find(tx => tx.action === 'mint');
                            if (mintTx && mintTx.metadata) {
                                enhancedTicket.concertName = mintTx.metadata.concertName || 'Konser Terhapus';
                                enhancedTicket.concertVenue = mintTx.metadata.venue || 'Venue Tidak Diketahui';
                            }
                        }
                    }

                    processedTickets.push(enhancedTicket);
                }

                setTickets(processedTickets);
                localStorage.setItem('myTickets', JSON.stringify(processedTickets));
                console.log(`✅ Refreshed ${processedTickets.length} tickets`);
            }
        } catch (err) {
            console.error("Error refreshing tickets:", err);
            alert("Error refreshing tickets: " + (err.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    // Enhanced filter logic for tickets
    const filteredTickets = tickets.filter(ticket => {
        if (showDeletedConcerts) {
            return true; // Show all tickets
        }

        // Only show tickets with existing concerts or those with valid names from transaction history
        return ticket.concertExists || (ticket.concertName && ticket.concertName !== 'Konser Tidak Diketahui');
    });

    // Enhanced ticket statistics
    const ticketStats = {
        total: tickets.length,
        withValidConcerts: tickets.filter(t => t.concertExists).length,
        withDeletedConcerts: tickets.filter(t => !t.concertExists && t.concertName !== 'Konser Tidak Diketahui').length,
        listed: tickets.filter(t => t.isListed).length,
        verified: tickets.filter(t => {
            return t.isVerified || (t.transactionSignature &&
                !t.transactionSignature.startsWith('dummy_') &&
                !t.transactionSignature.startsWith('added_') &&
                !t.transactionSignature.startsWith('error_'));
        }).length
    };

    // Enhanced loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col items-center justify-center mt-20">
                        <LoadingSpinner size="lg" />
                        <p className="text-gray-300 mt-4">🎫 Memuat tiket Anda...</p>
                        <p className="text-gray-500 text-sm mt-2">Menganalisis data blockchain dan concert info</p>
                    </div>
                </div>
            </div>
        );
    }

    // Enhanced not authenticated state
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
                <div className="max-w-md mx-auto text-center">
                    <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
                        <div className="text-6xl mb-4">🔐</div>
                        <h2 className="text-xl text-white mb-4">Hubungkan Dompet Anda</h2>
                        <p className="text-gray-400 mb-6">
                            Silakan hubungkan dompet Solana Anda untuk melihat dan mengelola tiket NFT Anda
                        </p>
                        <WalletMultiButton className="bg-purple-600 hover:bg-purple-700 text-white" />
                    </div>
                </div>
            </div>
        );
    }

    // Enhanced error state
    if (error && tickets.length === 0) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
                        <h3 className="text-red-400 font-medium mb-2 flex items-center">
                            ❌ Error Memuat Tiket
                        </h3>
                        <p className="text-red-500 mb-4">{error}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={refreshTickets}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                                🔄 Coba Lagi
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                                🔃 Refresh Halaman
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Enhanced no tickets state
    if (tickets.length === 0) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
                <div className="max-w-md mx-auto text-center">
                    <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
                        <div className="text-6xl mb-4">🎫</div>
                        <h2 className="text-xl text-white mb-4">Belum Ada Tiket</h2>
                        <p className="text-gray-400 mb-6">
                            Anda belum memiliki tiket NFT. Mulai jelajahi konser dan mint tiket pertama Anda!
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Link
                                to="/collections"
                                className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded-lg transition-colors"
                            >
                                🎵 Jelajahi Konser
                            </Link>
                            <Link
                                to="/mint-ticket"
                                className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg transition-colors"
                            >
                                🎫 Beli Tiket
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Enhanced main render
    return (
        <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Enhanced header with statistics */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center">
                            🎫 Tiket Saya
                        </h1>
                        <p className="text-gray-400 mt-1">
                            Kelola koleksi tiket NFT Anda yang diamankan blockchain
                        </p>
                    </div>
                    <button
                        onClick={refreshTickets}
                        disabled={loading}
                        className="mt-4 sm:mt-0 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? '🔄 Memperbarui...' : '🔄 Refresh'}
                    </button>
                </div>

                {/* Enhanced statistics panel */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-2xl font-bold text-white">{ticketStats.total}</div>
                        <div className="text-gray-400 text-sm">Total Tiket</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-2xl font-bold text-green-400">{ticketStats.withValidConcerts}</div>
                        <div className="text-gray-400 text-sm">Konser Aktif</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-2xl font-bold text-blue-400">{ticketStats.verified}</div>
                        <div className="text-gray-400 text-sm">Terverifikasi</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-2xl font-bold text-indigo-400">{ticketStats.listed}</div>
                        <div className="text-gray-400 text-sm">Dijual</div>
                    </div>
                </div>

                {/* Enhanced filter controls */}
                <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div className="flex items-center mb-3 sm:mb-0">
                            <label className="text-gray-300 flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showDeletedConcerts}
                                    onChange={(e) => setShowDeletedConcerts(e.target.checked)}
                                    className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                                🗑️ Tampilkan tiket dari konser yang dihapus
                            </label>
                        </div>
                        <div className="text-sm text-gray-400">
                            Menampilkan <span className="text-white font-medium">{filteredTickets.length}</span> dari{' '}
                            <span className="text-white font-medium">{tickets.length}</span> tiket
                        </div>
                    </div>
                    {ticketStats.withDeletedConcerts > 0 && (
                        <div className="mt-2 text-xs text-yellow-400">
                            ⚠️ {ticketStats.withDeletedConcerts} tiket dari konser yang telah dihapus
                        </div>
                    )}
                </div>

                {/* Enhanced tickets grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTickets.length > 0 ? (
                        filteredTickets.map(ticket => (
                            <TicketCard
                                key={ticket._id}
                                ticket={ticket}
                                onViewDetails={handleViewDetails}
                                refreshTickets={refreshTickets}
                            />
                        ))
                    ) : (
                        <div className="col-span-3 text-center bg-gray-800 p-8 rounded-lg border border-gray-700">
                            <div className="text-4xl mb-4">🔍</div>
                            <p className="text-white text-lg">Tidak ada tiket ditemukan</p>
                            <p className="text-gray-400 mt-2">
                                {showDeletedConcerts
                                    ? "Anda belum memiliki tiket sama sekali"
                                    : "Coba aktifkan 'Tampilkan tiket dari konser yang dihapus' untuk melihat semua tiket"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Enhanced action links */}
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                    <Link
                        to="/marketplace"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                    >
                        🏪 Jelajahi Marketplace
                    </Link>
                    <Link
                        to="/collections"
                        className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                    >
                        🎵 Lihat Konser
                    </Link>
                    <Link
                        to="/mint-ticket"
                        className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                    >
                        🎫 Beli Tiket Baru
                    </Link>
                    {filteredTickets.some(ticket => ticket.isListed) && (
                        <button
                            onClick={() => navigate('/marketplace')}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                        >
                            💰 Tiket Saya di Marketplace
                        </button>
                    )}
                </div>

                {/* Enhanced footer info */}
                <div className="mt-8 text-center text-gray-500 text-sm">
                    <p>🔐 Semua tiket Anda diamankan oleh blockchain Solana</p>
                    <p className="mt-1">📊 Data diperbarui secara real-time</p>
                </div>
            </div>
        </div>
    );
};

export default MyTickets;