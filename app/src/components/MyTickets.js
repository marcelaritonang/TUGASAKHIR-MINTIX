// src/components/MyTickets.js - Versi lengkap dengan fitur jual tiket dan info minting time
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

// Simplified Ticket Card Component with Minting Time
const TicketCard = ({ ticket, onViewDetails, refreshTickets }) => {
    const [loading, setLoading] = useState(false);
    const [processingAction, setProcessingAction] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSellForm, setShowSellForm] = useState(false);
    const [listingPrice, setListingPrice] = useState('');
    const [processingListing, setProcessingListing] = useState(false);
    const [showMintingTime, setShowMintingTime] = useState(false);

    // Menambahkan state untuk menampilkan pesan sukses
    const [successMessage, setSuccessMessage] = useState('');
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    // Improved blockchain status check - consistent with TicketDetail.js
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

    // Cek apakah tiket dapat dijual
    const canSellTicket = () => {
        // Tiket dengan transaksi valid atau terverifikasi dapat dijual
        // Ini memastikan semua pengguna dengan tiket yang valid dapat menjualnya
        return blockchainStatus === 'verified' || blockchainStatus === 'valid';
    };

    // Mendapatkan data performa minting jika ada
    const getMintingPerformance = () => {
        try {
            // Cek Performance data dari localStorage
            const performanceData = localStorage.getItem('mint_performance_metrics');
            if (!performanceData) return null;

            const perfMetrics = JSON.parse(performanceData);
            if (!Array.isArray(perfMetrics) || perfMetrics.length === 0) return null;

            // Cari data yang sesuai dengan tiket ini berdasarkan ID, seatNumber atau createdAt yang berdekatan
            // Prioritaskan match berdasarkan concertId dan seatNumber
            const matchingMetrics = perfMetrics.filter(metric => {
                // Cek match berdasarkan data tiket
                if (metric.ticketData) {
                    if (metric.ticketData.concertId === ticket.concertId &&
                        metric.ticketData.seatNumber === ticket.seatNumber) {
                        return true;
                    }
                }

                // Cek match berdasarkan timestamp yang dekat dengan createdAt
                if (metric.timestamp && ticket.createdAt) {
                    const metricTime = new Date(metric.timestamp).getTime();
                    const ticketTime = new Date(ticket.createdAt).getTime();

                    // Jika timestamp dalam rentang 5 menit dari createdAt
                    const fiveMinutes = 5 * 60 * 1000;
                    return Math.abs(metricTime - ticketTime) < fiveMinutes;
                }

                return false;
            });

            if (matchingMetrics.length > 0) {
                // Ambil data performa terbaru yang cocok
                return matchingMetrics[matchingMetrics.length - 1];
            }

            return null;
        } catch (err) {
            console.error("Error getting minting performance:", err);
            return null;
        }
    };

    const mintingPerformance = getMintingPerformance();
    const blockchainStatus = getBlockchainStatus();

    // Fungsi untuk menampilkan pesan sukses sementara
    const showTemporarySuccess = (message) => {
        setSuccessMessage(message);
        setShowSuccessMessage(true);
        setTimeout(() => {
            setShowSuccessMessage(false);
        }, 5000); // Tampilkan pesan selama 5 detik
    };

    // Render komponen info minting time
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
                    <span className="text-gray-300">Total Minting Time:</span>
                    <span className="text-white font-medium">{mintingPerformance.totalTime.toFixed(2)}s</span>
                </div>

                <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Gas Fee:</span>
                    <span className="text-white">0.00008 SOL</span>
                </div>

                {showMintingTime && (
                    <div className="mt-2 space-y-1 border-t border-gray-600 pt-2">
                        <div className="text-xs text-gray-400 mb-1">Step by Step Timing:</div>

                        {mintingPerformance.steps.map((step, index) => (
                            <div key={index} className="grid grid-cols-12 gap-1 text-xs">
                                <div className="col-span-8 text-gray-400 truncate">{step.name}</div>
                                <div className="col-span-2 text-right text-gray-400">{step.time.toFixed(2)}s</div>
                                <div className="col-span-2 text-right text-gray-500">({step.percentage?.toFixed(1) || 0}%)</div>
                            </div>
                        ))}

                        <div className="text-right text-xs text-gray-500 mt-1">
                            Minted on {new Date(mintingPerformance.timestamp).toLocaleString()}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Simplified handlers
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
        // Validate input price
        if (!listingPrice || listingPrice.trim() === '') {
            alert('Silakan masukkan harga yang valid');
            return;
        }

        // Convert to number and validate
        const price = parseFloat(listingPrice);
        if (isNaN(price) || price <= 0) {
            alert('Harga harus berupa angka positif lebih dari 0');
            return;
        }

        try {
            setProcessingListing(true);

            // Log debug info
            console.log(`Mendaftarkan tiket ${ticket._id} untuk dijual dengan harga ${price} SOL`);

            // Validasi ticket ID
            if (!ticket._id) {
                throw new Error('ID tiket tidak valid');
            }

            // Make sure we're passing the correct parameters to the API service
            const response = await ApiService.listTicketForSale(ticket._id, price);

            // Log response for debugging
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

    // Simplified UI
    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors p-4">
            {/* Success message notification */}
            {showSuccessMessage && (
                <div className="bg-green-500/10 border border-green-500 rounded-lg p-3 mb-4">
                    <p className="text-green-500 text-sm">{successMessage}</p>
                </div>
            )}

            {/* Header with concert name */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-white font-medium text-lg">
                        {ticket.concertExists
                            ? (ticket.concertName || 'Konser')
                            : (
                                <span className="flex items-center">
                                    <span className="text-orange-400 mr-1">Konser Tidak Tersedia</span>
                                    <span className="text-xs bg-orange-900/30 text-orange-400 border border-orange-700 rounded px-1">
                                        Dihapus
                                    </span>
                                </span>
                            )
                        }
                    </h3>
                    <p className="text-gray-400">
                        {ticket.concertExists
                            ? (ticket.concertVenue || 'Lokasi Tidak Diketahui')
                            : 'Konser telah dihapus'
                        }
                    </p>
                    {ticket.concertDate && ticket.concertExists && (
                        <p className="text-gray-400 text-sm">{formatDate(ticket.concertDate)}</p>
                    )}
                </div>
                <div className={`px-2 py-1 rounded text-xs border ${blockchainStatus === 'verified' ? 'bg-green-900/30 text-green-400 border-green-700' :
                    blockchainStatus === 'valid' ? 'bg-blue-900/30 text-blue-400 border-blue-700' :
                        'bg-red-900/30 text-red-400 border-red-700'
                    }`}>
                    {blockchainStatus === 'verified' ? 'Terverifikasi' :
                        blockchainStatus === 'valid' ? 'TX Valid' :
                            'TX Invalid'}
                </div>
            </div>

            {/* Ticket details */}
            <div className="flex justify-between items-center mb-3">
                <div>
                    <p className="text-gray-300 text-sm">Seksi</p>
                    <p className="text-white">{ticket.sectionName || 'Reguler'}</p>
                </div>
                <div>
                    <p className="text-gray-300 text-sm">Kursi</p>
                    <p className="text-white">{ticket.seatNumber || 'Umum'}</p>
                </div>
                <div>
                    <p className="text-gray-300 text-sm">Status</p>
                    <p className="text-white capitalize">{ticket.status || 'Aktif'}</p>
                </div>
            </div>

            {/* Basic ticket info with blockchain */}
            <div className="bg-gray-700/30 p-3 rounded-lg mb-3">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Pemilik</span>
                    <span className="text-white font-mono">{formatAddress(ticket.owner)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-300">Dibuat</span>
                    <span className="text-white">{formatDate(ticket.createdAt)}</span>
                </div>
                {ticket.transactionSignature && (
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-300">Transaksi</span>
                        <span className={`text-sm ${blockchainStatus === 'verified' || blockchainStatus === 'valid' ? 'text-green-400' : 'text-red-400'}`}>
                            {ticket.transactionSignature.startsWith('dummy_') ||
                                ticket.transactionSignature.startsWith('added_') ||
                                ticket.transactionSignature.startsWith('error_') ? (
                                'Invalid/Test'
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

                {/* Blockchain status - simplified display */}
                <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-300">Status Blockchain</span>
                    <span className={`text-sm font-medium ${blockchainStatus === 'verified' ? 'text-green-400' :
                        blockchainStatus === 'valid' ? 'text-blue-400' :
                            'text-red-400'
                        }`}>
                        {blockchainStatus === 'verified' ? '✅ Terverifikasi' :
                            blockchainStatus === 'valid' ? '🔵 Valid' :
                                '❌ Invalid'}
                    </span>
                </div>
            </div>

            {/* MINTING PERFORMANCE METRICS - BARU */}
            {mintingPerformance && <MintingTimeInfo />}

            {/* Listed for sale or action buttons */}
            {ticket.isListed ? (
                <div className="mt-3 bg-indigo-900/20 border border-indigo-600 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                        <div>
                            <h4 className="text-indigo-400 text-sm font-medium">Dijual di Marketplace</h4>
                            <p className="text-white font-bold text-lg">{ticket.listingPrice} SOL</p>
                            <p className="text-gray-400 text-xs">
                                Terdaftar pada {formatDate(ticket.listingDate)}
                            </p>
                        </div>
                        <button
                            onClick={handleCancelListing}
                            disabled={processingAction}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors disabled:opacity-50"
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
                        {processingAction ? '...' : 'Hapus'}
                    </button>

                    {/* Sell Ticket Button/Form */}
                    {canSellTicket() && (
                        !showSellForm ? (
                            <button
                                onClick={() => setShowSellForm(true)}
                                disabled={processingAction}
                                className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded text-sm transition-colors disabled:opacity-50"
                            >
                                Jual di Marketplace
                            </button>
                        ) : (
                            <div className="w-full mt-2 bg-indigo-900/20 border border-indigo-600 rounded-lg p-3">
                                <h4 className="text-indigo-400 text-sm font-medium mb-2">Jual Tiket di Marketplace</h4>
                                <p className="text-gray-300 text-xs mb-3">
                                    Tiket Anda akan tampil di marketplace dan pembeli akan mengirim SOL langsung ke wallet Anda saat dibeli.
                                </p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <label className="block text-gray-300 text-xs mb-1">Harga Jual (SOL)</label>
                                        <input
                                            type="number"
                                            value={listingPrice}
                                            onChange={(e) => {
                                                // Pastikan nilai yang dimasukkan adalah angka valid
                                                const value = e.target.value;
                                                // Hanya izinkan angka positif
                                                if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                                                    setListingPrice(value);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                // Format angka ketika selesai mengedit
                                                const value = e.target.value;
                                                if (value !== '' && !isNaN(parseFloat(value))) {
                                                    // Format dengan maksimal 6 angka desimal
                                                    setListingPrice(parseFloat(value).toFixed(6));
                                                }
                                            }}
                                            placeholder="Masukkan harga dalam SOL"
                                            step="0.01"
                                            min="0.01"
                                            className="bg-gray-700 text-white p-2 rounded w-full"
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
                                            {processingListing ? 'Mendaftarkan...' : 'Jual Tiket'}
                                        </button>
                                        <button
                                            onClick={() => setShowSellForm(false)}
                                            disabled={processingListing}
                                            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm transition-colors disabled:opacity-50"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}

            {/* View details button */}
            <button
                onClick={() => onViewDetails(ticket._id)}
                className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded text-sm transition-colors"
            >
                Lihat Detail & Riwayat
            </button>

            {/* Delete confirmation modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700">
                        <h3 className="text-lg text-white font-medium mb-4">Konfirmasi Penghapusan</h3>
                        <p className="text-gray-300 mb-4">
                            Apakah Anda yakin ingin menghapus tiket ini? Tindakan ini tidak dapat dibatalkan.
                        </p>
                        {!ticket.concertExists && (
                            <p className="text-orange-400 text-sm mb-4">
                                Catatan: Tiket ini untuk konser yang telah dihapus.
                            </p>
                        )}
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
                                {processingAction ? 'Menghapus...' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Main MyTickets component - improved
const MyTickets = () => {
    const wallet = useWallet();
    const navigate = useNavigate();
    const { loadMyTickets } = useConcerts();

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());
    const [showDeletedConcerts, setShowDeletedConcerts] = useState(false); // Default to hiding deleted concerts

    // Authentication check
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

    // Load tickets - improved with concert existence check
    useEffect(() => {
        const loadTickets = async () => {
            if (!isAuthenticated) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError('');
                console.log('Loading tickets...');

                // Get ALL tickets (including tickets for deleted concerts)
                const userTickets = await ApiService.getMyTickets(false);

                if (Array.isArray(userTickets)) {
                    console.log(`Got ${userTickets.length} tickets from API`);

                    // Process tickets in smaller batches to avoid overwhelming API
                    const processedTickets = [];
                    const BATCH_SIZE = 5;

                    // Process tickets in batches
                    for (let i = 0; i < userTickets.length; i += BATCH_SIZE) {
                        const batch = userTickets.slice(i, i + BATCH_SIZE);
                        const batchPromises = batch.map(async (ticket) => {
                            try {
                                // Check if concert exists
                                if (ticket.concertId) {
                                    const concert = await ApiService.getConcert(ticket.concertId);
                                    // Add concertExists flag and other concert details
                                    return {
                                        ...ticket,
                                        concertExists: !!concert,
                                        concertName: concert?.name || ticket.concertName || 'Konser Tidak Diketahui',
                                        concertVenue: concert?.venue || ticket.concertVenue || 'Lokasi Tidak Diketahui',
                                        concertDate: concert?.date || ticket.concertDate
                                    };
                                }
                                return { ...ticket, concertExists: false };
                            } catch (err) {
                                console.log(`Error checking concert for ticket ${ticket._id}:`, err.message);
                                return { ...ticket, concertExists: false };
                            }
                        });

                        const batchResults = await Promise.all(batchPromises);
                        processedTickets.push(...batchResults);

                        // Small delay between batches to prevent rate limiting
                        if (i + BATCH_SIZE < userTickets.length) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }

                    console.log(`Processed ${processedTickets.length} tickets with concert info`);
                    setTickets(processedTickets);

                    // Store in localStorage as backup
                    localStorage.setItem('myTickets', JSON.stringify(processedTickets));
                } else {
                    throw new Error("Invalid response format from API");
                }
            } catch (err) {
                console.error("Error loading tickets:", err);
                setError('Gagal memuat tiket. Silakan coba lagi nanti.');

                // Try to get from localStorage as fallback
                try {
                    const cachedTickets = JSON.parse(localStorage.getItem('myTickets') || '[]');
                    if (cachedTickets.length > 0) {
                        console.log(`Using ${cachedTickets.length} cached tickets`);
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

    // Navigate to ticket details
    const handleViewDetails = (ticketId) => {
        navigate(`/ticket/${ticketId}`);
    };

    // Refresh tickets
    const refreshTickets = async () => {
        try {
            setLoading(true);
            console.log("Refreshing tickets...");

            // Get fresh tickets
            const userTickets = await ApiService.getMyTickets(false);

            if (Array.isArray(userTickets)) {
                // Process ticket concert existence
                const processedTickets = [];

                for (const ticket of userTickets) {
                    try {
                        // Check if concert exists
                        if (ticket.concertId) {
                            const concert = await ApiService.getConcert(ticket.concertId);
                            processedTickets.push({
                                ...ticket,
                                concertExists: !!concert,
                                concertName: concert?.name || ticket.concertName || 'Konser Tidak Diketahui',
                                concertVenue: concert?.venue || ticket.concertVenue || 'Lokasi Tidak Diketahui',
                                concertDate: concert?.date || ticket.concertDate
                            });
                        } else {
                            processedTickets.push({ ...ticket, concertExists: false });
                        }
                    } catch (err) {
                        processedTickets.push({ ...ticket, concertExists: false });
                    }
                }

                setTickets(processedTickets);
                localStorage.setItem('myTickets', JSON.stringify(processedTickets));
                console.log(`Refreshed ${processedTickets.length} tickets`);
            }
        } catch (err) {
            console.error("Error refreshing tickets:", err);
            alert("Error refreshing tickets: " + (err.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    // Filter tickets based on showDeletedConcerts setting
    const filteredTickets = tickets.filter(ticket => {
        // If showDeletedConcerts is true, show all tickets
        if (showDeletedConcerts) {
            return true;
        }

        // If showDeletedConcerts is false, only show tickets with existing concerts
        return ticket.concertExists;
    });

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col items-center justify-center mt-20">
                        <LoadingSpinner size="lg" />
                        <p className="text-gray-300 mt-4">Memuat tiket Anda...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Not authenticated state
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
                <div className="max-w-md mx-auto text-center">
                    <div className="bg-gray-800 rounded-lg p-8">
                        <h2 className="text-xl text-white mb-4">Hubungkan Dompet Anda</h2>
                        <p className="text-gray-400 mb-6">
                            Silakan hubungkan dompet Solana Anda untuk melihat tiket Anda
                        </p>
                        <WalletMultiButton className="bg-purple-600 hover:bg-purple-700 text-white" />
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error && tickets.length === 0) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
                        <h3 className="text-red-400 font-medium mb-2">Error Memuat Tiket</h3>
                        <p className="text-red-500">{error}</p>
                        <div className="mt-4 flex gap-3">
                            <button
                                onClick={refreshTickets}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // No tickets state
    if (tickets.length === 0) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
                <div className="max-w-md mx-auto text-center">
                    <div className="bg-gray-800 rounded-lg p-8">
                        <h2 className="text-xl text-white mb-4">Tidak Ada Tiket Ditemukan</h2>
                        <p className="text-gray-400 mb-6">
                            Anda belum membeli tiket. Mulai jelajahi konser!
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Link
                                to="/mint-ticket"
                                className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded-lg transition-colors"
                            >
                                Beli Tiket
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Tiket Saya</h1>
                        <p className="text-gray-400">
                            Kelola tiket Anda yang diamankan oleh blockchain
                        </p>
                    </div>
                    <button
                        onClick={refreshTickets}
                        disabled={loading}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Memperbarui...' : '🔄 Refresh'}
                    </button>
                </div>

                {/* Toggle for deleted concerts */}
                <div className="bg-gray-800 rounded-lg p-4 mb-6 flex items-center justify-between">
                    <div className="flex items-center">
                        <label className="text-gray-300 flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showDeletedConcerts}
                                onChange={(e) => setShowDeletedConcerts(e.target.checked)}
                                className="mr-2"
                            />
                            Tampilkan tiket untuk konser yang dihapus
                        </label>
                    </div>
                    <div className="text-sm text-gray-400">
                        Menampilkan {filteredTickets.length} dari {tickets.length} tiket
                    </div>
                </div>

                {/* Tickets grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        <div className="col-span-3 text-center bg-gray-800 p-8 rounded-lg">
                            <p className="text-white text-lg">Tidak ada tiket ditemukan</p>
                            <p className="text-gray-400 mt-2">
                                {showDeletedConcerts
                                    ? "Anda belum memiliki tiket sama sekali"
                                    : "Coba aktifkan 'Tampilkan tiket untuk konser yang dihapus' untuk melihat semua tiket Anda"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Action links */}
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                    <Link
                        to="/marketplace"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-lg transition-colors"
                    >
                        Jelajahi Marketplace
                    </Link>
                    <Link
                        to="/mint-ticket"
                        className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg transition-colors"
                    >
                        Beli Tiket Baru
                    </Link>
                    {filteredTickets.some(ticket => ticket.isListed) && (
                        <button
                            onClick={() => navigate('/marketplace')}
                            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded-lg transition-colors"
                        >
                            Lihat Tiket Saya di Marketplace
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyTickets;