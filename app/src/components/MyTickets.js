// src/components/MyTickets.js
import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useNavigate, Link } from 'react-router-dom';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

// Services
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import blockchainService from '../services/blockchain';
import { useConcerts } from '../context/ConcertContext';

// Components
import LoadingSpinner from './common/LoadingSpinner';

// Helper untuk format waktu
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);

    const options = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    return date.toLocaleDateString('id-ID', options);
};

// Helper untuk memformat alamat wallet
const formatAddress = (address, start = 6, end = 4) => {
    if (!address) return 'N/A';
    return `${address.slice(0, start)}...${address.slice(-end)}`;
};

const MyTickets = () => {
    const wallet = useWallet();
    const navigate = useNavigate();
    const { loadMyTickets: contextLoadMyTickets } = useConcerts();

    // State
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedTicket, setExpandedTicket] = useState(null);
    const [transactionDetails, setTransactionDetails] = useState({});
    const [concerts, setConcerts] = useState({});
    const [ticketAnalytics, setTicketAnalytics] = useState({});
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('newest');
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshInterval, setRefreshInterval] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [ticketToDelete, setTicketToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success'); // 'success', 'error', 'info'

    // Ref untuk mencegah multiple loading
    const loadingRef = useRef(false);

    // Setup connection
    const connection = new Connection(
        process.env.REACT_APP_SOLANA_RPC_URL || clusterApiUrl('devnet'),
        'confirmed'
    );

    // Otentikasi dan memuat tiket
    useEffect(() => {
        const init = async () => {
            if (wallet.connected && wallet.publicKey) {
                try {
                    if (!AuthService.isAuthenticated()) {
                        console.log("Attempting auto-login");
                        const success = await AuthService.loginTest(wallet.publicKey.toString());
                        setIsAuthenticated(success);
                    } else {
                        setIsAuthenticated(true);
                    }

                    await loadTickets();

                    // Setup auto-refresh interval
                    setupAutoRefresh();
                } catch (err) {
                    console.error("Error during authentication:", err);
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        init();

        // Cleanup interval on unmount
        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [wallet.connected, wallet.publicKey]);

    // Setup auto-refresh
    const setupAutoRefresh = () => {
        // Clear any existing interval
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }

        // Create new interval for auto refresh every 30 seconds
        const interval = setInterval(() => {
            if (!loadingRef.current) {
                console.log("Auto-refreshing tickets...");
                loadTickets(true); // silent refresh
            }
        }, 30000);

        setRefreshInterval(interval);
    };

    // Memuat tiket
    const loadTickets = async (silent = false) => {
        // Prevent multiple simultaneous loadings
        if (loadingRef.current) return;

        loadingRef.current = true;
        if (!silent) setLoading(true);

        try {
            setError('');

            const userTickets = await ApiService.getMyTickets();
            console.log("User tickets:", userTickets);

            if (Array.isArray(userTickets) && userTickets.length > 0) {
                // Dapatkan data konser terkait untuk setiap tiket
                const concertIds = [...new Set(userTickets.map(ticket => ticket.concertId))];
                const concertDetails = {};

                await Promise.all(concertIds.map(async (id) => {
                    try {
                        const concert = await ApiService.getConcert(id);
                        concertDetails[id] = concert;
                    } catch (err) {
                        console.error(`Error fetching concert ${id}:`, err);
                        // Jika konser tidak ditemukan, tetap buat entri kosong
                        concertDetails[id] = null;
                    }
                }));

                setConcerts(concertDetails);

                // Ambil detail transaksi untuk setiap tiket
                const txDetails = {};
                const analytics = {};

                await Promise.all(userTickets.map(async (ticket) => {
                    if (ticket.transactionSignature) {
                        try {
                            // Dapatkan data transaksi
                            const txData = await connection.getTransaction(ticket.transactionSignature);

                            if (txData) {
                                const blockTime = txData.blockTime ? new Date(txData.blockTime * 1000) : null;
                                const slot = txData.slot;
                                const confirmations = txData.meta?.confirmations || 0;
                                const fee = txData.meta?.fee || 0;

                                // Hitung TPS berdasarkan data transaksi
                                let tps = 'N/A';
                                if (txData.meta && txData.meta.txProcessingTime) {
                                    tps = (1000 / txData.meta.txProcessingTime).toFixed(2);
                                } else {
                                    // Estimasi TPS jika tidak tersedia langsung
                                    const perfSamples = await connection.getRecentPerformanceSamples(1);
                                    if (perfSamples && perfSamples.length > 0) {
                                        tps = perfSamples[0].numTransactions / perfSamples[0].samplePeriodSecs;
                                        tps = tps.toFixed(2);
                                    }
                                }

                                txDetails[ticket._id] = {
                                    signature: ticket.transactionSignature,
                                    blockTime,
                                    slot,
                                    confirmations,
                                    fee,
                                    tps
                                };

                                // Generate analytics
                                analytics[ticket._id] = {
                                    mintTime: blockTime,
                                    tps,
                                    fee,
                                    isValid: true,
                                    isMintedOnChain: true
                                };
                            } else {
                                // Jika transaksi tidak ditemukan di blockchain
                                txDetails[ticket._id] = {
                                    signature: ticket.transactionSignature,
                                    error: 'Transaction not found on blockchain'
                                };

                                analytics[ticket._id] = {
                                    isValid: false,
                                    isMintedOnChain: false,
                                    error: 'Transaction not found'
                                };
                            }
                        } catch (err) {
                            console.error(`Error fetching transaction ${ticket.transactionSignature}:`, err);
                            txDetails[ticket._id] = {
                                signature: ticket.transactionSignature,
                                error: err.message
                            };

                            analytics[ticket._id] = {
                                isValid: false,
                                isMintedOnChain: false,
                                error: err.message
                            };
                        }
                    } else {
                        // Tiket tanpa signature transaksi
                        analytics[ticket._id] = {
                            isValid: false,
                            isMintedOnChain: false,
                            error: 'No transaction signature'
                        };
                    }
                }));

                setTransactionDetails(txDetails);
                setTicketAnalytics(analytics);
                setTickets(userTickets);
            } else {
                setTickets([]);
            }
        } catch (err) {
            console.error("Error loading tickets:", err);
            if (!silent) setError('Gagal memuat tiket. Silakan coba lagi nanti.');
        } finally {
            if (!silent) setLoading(false);
            loadingRef.current = false;
        }
    };

    // Filter tiket berdasarkan status
    const getFilteredTickets = () => {
        let filtered = [...tickets];

        // Filter berdasarkan jenis
        if (selectedFilter === 'valid') {
            filtered = filtered.filter(ticket =>
                ticketAnalytics[ticket._id]?.isValid &&
                concerts[ticket.concertId] !== null
            );
        } else if (selectedFilter === 'invalid') {
            filtered = filtered.filter(ticket =>
                !ticketAnalytics[ticket._id]?.isValid ||
                concerts[ticket.concertId] === null
            );
        } else if (selectedFilter === 'verified') {
            filtered = filtered.filter(ticket => ticket.isVerified);
        }

        // Filter berdasarkan pencarian
        if (searchTerm) {
            filtered = filtered.filter(ticket => {
                const concertName = concerts[ticket.concertId]?.name?.toLowerCase() || '';
                const seatNumber = ticket.seatNumber?.toLowerCase() || '';
                const search = searchTerm.toLowerCase();
                return concertName.includes(search) || seatNumber.includes(search);
            });
        }

        // Urutkan tiket
        filtered.sort((a, b) => {
            const timeA = ticketAnalytics[a._id]?.mintTime || new Date(a.createdAt || 0);
            const timeB = ticketAnalytics[b._id]?.mintTime || new Date(b.createdAt || 0);

            return sortOrder === 'newest'
                ? timeB - timeA
                : timeA - timeB;
        });

        return filtered;
    };

    // Fungsi untuk memverifikasi tiket
    const handleVerifyTicket = async (ticketId) => {
        try {
            setLoading(true);
            const result = await ApiService.verifyTicket(ticketId);

            if (result.success) {
                // Update tiket di state
                setTickets(prev => prev.map(ticket => {
                    if (ticket._id === ticketId) {
                        return { ...ticket, isVerified: true, verifiedAt: new Date() };
                    }
                    return ticket;
                }));

                // Update Context
                contextLoadMyTickets();

                showToastMessage('Tiket berhasil diverifikasi', 'success');
            } else {
                showToastMessage('Gagal memverifikasi tiket: ' + (result.msg || 'Unknown error'), 'error');
            }
        } catch (err) {
            console.error("Error verifying ticket:", err);
            showToastMessage('Gagal memverifikasi tiket: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // BARU: Fungsi untuk menampilkan toast message
    const showToastMessage = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);

        // Otomatis hide toast setelah 3 detik
        setTimeout(() => {
            setShowToast(false);
        }, 3000);
    };

    // BARU: Fungsi untuk menghapus tiket
    const handleDeleteTicket = async () => {
        if (!ticketToDelete) return;

        setDeleteLoading(true);

        try {
            // Panggil API untuk menghapus tiket
            const response = await fetch(`${ApiService.baseUrl}/tickets/${ticketToDelete._id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': AuthService.getToken()
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `Failed to delete ticket: ${response.status}`);
            }

            // Jika berhasil, update state
            setTickets(prev => prev.filter(ticket => ticket._id !== ticketToDelete._id));
            showToastMessage('Tiket berhasil dihapus', 'success');

            // Update Context
            contextLoadMyTickets();

        } catch (error) {
            console.error("Error deleting ticket:", error);
            showToastMessage(`Gagal menghapus tiket: ${error.message}`, 'error');
        } finally {
            setDeleteLoading(false);
            setIsDeleteModalOpen(false);
            setTicketToDelete(null);
        }
    };

    // BARU: Tampilkan konfirmasi hapus
    const openDeleteModal = (ticket) => {
        setTicketToDelete(ticket);
        setIsDeleteModalOpen(true);
    };

    // Render QR Code untuk tiket
    const renderQRCode = (ticket) => {
        // Data yang dienkode ke dalam QR
        const qrData = JSON.stringify({
            id: ticket._id,
            concertId: ticket.concertId,
            seat: ticket.seatNumber,
            owner: ticket.owner,
            valid: ticketAnalytics[ticket._id]?.isValid,
            signature: ticket.transactionSignature?.substring(0, 10)
        });

        return (
            <div className="qr-container bg-white p-4 rounded-lg shadow-lg">
                <QRCodeSVG
                    value={qrData}
                    size={150}
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                        src: '/logo192.png',
                        height: 30,
                        width: 30,
                        excavate: true
                    }}
                />
            </div>
        );
    };

    // Render detail transaksi blockchain
    const renderBlockchainDetails = (ticket) => {
        const txDetail = transactionDetails[ticket._id];

        if (!txDetail) {
            return (
                <div className="bg-red-500/10 p-3 rounded-lg mt-2">
                    <p className="text-red-400 text-sm">Data blockchain tidak tersedia</p>
                </div>
            );
        }

        if (txDetail.error) {
            return (
                <div className="bg-red-500/10 p-3 rounded-lg mt-2">
                    <p className="text-red-400 text-sm">Error: {txDetail.error}</p>
                </div>
            );
        }

        return (
            <div className="bg-gray-800/50 p-3 rounded-lg mt-2 border border-gray-700/70">
                <h4 className="text-gray-300 font-medium text-sm mb-2">Detail Blockchain:</h4>
                <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Signature:</span>
                        <a
                            href={`https://explorer.solana.com/tx/${txDetail.signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 truncate max-w-[180px]"
                        >
                            {formatAddress(txDetail.signature, 10, 5)}
                        </a>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Waktu Mint:</span>
                        <span className="text-white">{txDetail.blockTime ? formatDate(txDetail.blockTime) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">TPS Saat Minting:</span>
                        <span className="text-yellow-400 font-medium">{txDetail.tps || 'N/A'} TPS</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Fee:</span>
                        <span className="text-white">{txDetail.fee / 1000000000} SOL</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Slot:</span>
                        <span className="text-white">{txDetail.slot || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Konfirmasi:</span>
                        <span className="text-white">{txDetail.confirmations || 'N/A'}</span>
                    </div>
                </div>
            </div>
        );
    };

    // Render card untuk tiket
    const renderTicketCard = (ticket) => {
        const concertDetail = concerts[ticket.concertId];
        const analytics = ticketAnalytics[ticket._id];
        const isExpanded = expandedTicket === ticket._id;
        const isTicketValid = analytics?.isValid && concertDetail !== null;
        const isConcertDeleted = concertDetail === null;

        // Status badge style
        const getBadgeStyle = () => {
            if (isConcertDeleted) {
                return 'bg-red-900/20 text-red-400 border-red-700';
            }
            if (!isTicketValid) {
                return 'bg-orange-900/20 text-orange-400 border-orange-700';
            }
            if (ticket.isVerified) {
                return 'bg-green-900/20 text-green-400 border-green-700';
            }
            return 'bg-yellow-900/20 text-yellow-400 border-yellow-700';
        };

        // Status text
        const getStatusText = () => {
            if (isConcertDeleted) {
                return 'Konser Dihapus';
            }
            if (!isTicketValid) {
                return 'Tidak Valid';
            }
            return ticket.isVerified ? 'Terverifikasi' : 'Belum Digunakan';
        };

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`bg-gray-800 rounded-lg overflow-hidden shadow-lg border ${isTicketValid && !isConcertDeleted
                    ? 'border-purple-700/30 hover:border-purple-500/50'
                    : 'border-red-700/30 hover:border-red-500/50'
                    } transition-all duration-300`}
            >
                {/* Header - Concert Info */}
                <div className="p-4 bg-gradient-to-r from-purple-900/30 to-indigo-900/30">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-white font-bold text-lg">
                                {concertDetail ? concertDetail.name : 'Konser Dihapus'}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                {concertDetail ? concertDetail.venue : 'Lokasi tidak tersedia'}
                            </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs border ${getBadgeStyle()}`}>
                            {getStatusText()}
                        </div>
                    </div>

                    <div className="mt-2 text-sm">
                        <p className="text-gray-300">
                            Tanggal: {concertDetail
                                ? formatDate(concertDetail.date)
                                : 'Tidak tersedia'
                            }
                        </p>
                    </div>
                </div>

                {/* Ticket Details */}
                <div className="p-4">
                    <div className="flex justify-between mb-4">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Tipe Tiket</p>
                            <p className="text-white font-medium">{ticket.sectionName}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Kursi</p>
                            <p className="text-white font-medium">{ticket.seatNumber || 'General'}</p>
                        </div>
                    </div>

                    <div className="flex justify-between mb-2">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Pemilik</p>
                            <p className="text-white font-mono text-sm truncate w-32">{formatAddress(ticket.owner)}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Dibuat</p>
                            <p className="text-white text-sm">{formatDate(analytics?.mintTime || ticket.createdAt)}</p>
                        </div>
                    </div>

                    {/* Expanded View */}
                    {isExpanded && (
                        <div className="mt-4 space-y-3">
                            {/* QR Code and Transaction */}
                            <div className="flex flex-wrap md:flex-nowrap gap-4 justify-between">
                                {renderQRCode(ticket)}
                                <div className="flex-1">
                                    {renderBlockchainDetails(ticket)}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-3">
                                {isTicketValid && !ticket.isVerified && (
                                    <button
                                        onClick={() => handleVerifyTicket(ticket._id)}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex-1"
                                        disabled={loading}
                                    >
                                        {loading ? <LoadingSpinner /> : 'Verifikasi Tiket'}
                                    </button>
                                )}

                                {/* BARU: Tombol hapus tiket */}
                                {(isConcertDeleted || !isTicketValid) && (
                                    <button
                                        onClick={() => openDeleteModal(ticket)}
                                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex-1"
                                        disabled={loading}
                                    >
                                        {loading ? <LoadingSpinner /> : 'Hapus Tiket'}
                                    </button>
                                )}

                                <a
                                    href={`https://explorer.solana.com/tx/${ticket.transactionSignature}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex-1 text-center"
                                >
                                    Lihat di Explorer
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Toggle Button */}
                    <button
                        onClick={() => setExpandedTicket(isExpanded ? null : ticket._id)}
                        className="w-full mt-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                    >
                        {isExpanded ? 'Sembunyikan Detail' : 'Lihat Detail'}
                    </button>
                </div>
            </motion.div>
        );
    };

    // Render modal konfirmasi hapus tiket
    const renderDeleteModal = () => {
        if (!isDeleteModalOpen || !ticketToDelete) return null;

        const concertName = concerts[ticketToDelete.concertId]?.name || 'Konser Dihapus';

        return (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70">
                <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 className="text-xl font-bold text-white mb-4">Konfirmasi Hapus Tiket</h3>
                    <p className="text-gray-300 mb-6">
                        Apakah Anda yakin ingin menghapus tiket untuk konser "{concertName}" dengan kursi {ticketToDelete.seatNumber}?
                    </p>
                    {concerts[ticketToDelete.concertId] === null && (
                        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded p-3 mb-4">
                            <p className="text-yellow-400 text-sm">
                                Konser untuk tiket ini telah dihapus. Menghapus tiket ini tidak akan mempengaruhi blockchain.
                            </p>
                        </div>
                    )}
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setTicketToDelete(null);
                            }}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                            disabled={deleteLoading}
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleDeleteTicket}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center"
                            disabled={deleteLoading}
                        >
                            {deleteLoading ? (
                                <>
                                    <LoadingSpinner size="sm" />
                                    <span className="ml-2">Menghapus...</span>
                                </>
                            ) : (
                                'Hapus Tiket'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Render toast notification
    const renderToast = () => {
        if (!showToast) return null;

        const bgColor = toastType === 'success' ? 'bg-green-500' :
            toastType === 'error' ? 'bg-red-500' :
                'bg-blue-500';

        return (
            <div className="fixed bottom-4 right-4 z-50">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center`}
                >
                    {toastType === 'success' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    )}
                    {toastType === 'error' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    )}
                    {toastType === 'info' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    )}
                    <span>{toastMessage}</span>
                </motion.div>
            </div>
        );
    };

    // Render saat loading
    if (loading && !tickets.length) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-col items-center justify-center mt-20">
                        <LoadingSpinner size="lg" />
                        <p className="text-gray-300 mt-4">Memuat tiket...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Render wallet not connected
    if (!wallet.connected) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-3xl font-bold text-white text-center mb-10">Tiket Saya</h1>

                    <div className="bg-gray-800 rounded-lg p-8 text-center">
                        <h2 className="text-2xl text-white mb-4">Hubungkan Wallet Anda</h2>
                        <p className="text-gray-400 mb-6">Hubungkan wallet Solana Anda untuk melihat tiket</p>
                        <div className="flex justify-center">
                            <WalletMultiButton className="!bg-gradient-to-br !from-purple-600 !to-indigo-600 hover:!shadow-lg hover:!shadow-purple-500/20 transition duration-300" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const filteredTickets = getFilteredTickets();

    return (
        <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
            {/* Background effects */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600 filter blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-600 filter blur-3xl"></div>
            </div>

            <div className="max-w-5xl mx-auto relative">
                <h1 className="text-3xl font-bold text-white text-center mb-6">Tiket Saya</h1>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6">
                        <p className="text-red-500">{error}</p>
                    </div>
                )}

                {/* Control Bar */}
                <div className="mb-6 flex flex-wrap gap-3 justify-between">
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setSelectedFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm ${selectedFilter === 'all'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-700 text-gray-300'
                                }`}
                        >
                            Semua
                        </button>
                        <button
                            onClick={() => setSelectedFilter('valid')}
                            className={`px-4 py-2 rounded-lg text-sm ${selectedFilter === 'valid'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-700 text-gray-300'
                                }`}
                        >
                            Valid
                        </button>
                        <button
                            onClick={() => setSelectedFilter('invalid')}
                            className={`px-4 py-2 rounded-lg text-sm ${selectedFilter === 'invalid'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-700 text-gray-300'
                                }`}
                        >
                            Tidak Valid
                        </button>
                        <button
                            onClick={() => setSelectedFilter('verified')}
                            className={`px-4 py-2 rounded-lg text-sm ${selectedFilter === 'verified'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300'
                                }`}
                        >
                            Terverifikasi
                        </button>
                    </div>

                    <div className="flex space-x-2">
                        <input
                            type="text"
                            placeholder="Cari tiket..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                        />

                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                        >
                            <option value="newest">Terbaru</option>
                            <option value="oldest">Terlama</option>
                        </select>

                        <button
                            onClick={() => loadTickets()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            disabled={loading}
                        >
                            {loading ? <LoadingSpinner size="sm" /> : 'Refresh'}
                        </button>
                    </div>
                </div>

                {/* Analytics Summary */}
                {tickets.length > 0 && (
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gray-800 rounded-lg p-4 border border-purple-700/30">
                            <h3 className="text-gray-400 text-sm mb-1">Total Tiket</h3>
                            <p className="text-2xl font-bold text-white">{tickets.length}</p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4 border border-green-700/30">
                            <h3 className="text-gray-400 text-sm mb-1">Tiket Valid</h3>
                            <p className="text-2xl font-bold text-green-400">
                                {tickets.filter(t =>
                                    ticketAnalytics[t._id]?.isValid && concerts[t.concertId] !== null
                                ).length}
                            </p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4 border border-red-700/30">
                            <h3 className="text-gray-400 text-sm mb-1">Tiket Tidak Valid</h3>
                            <p className="text-2xl font-bold text-red-400">
                                {tickets.filter(t =>
                                    !ticketAnalytics[t._id]?.isValid || concerts[t.concertId] === null
                                ).length}
                            </p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4 border border-blue-700/30">
                            <h3 className="text-gray-400 text-sm mb-1">Terverifikasi</h3>
                            <p className="text-2xl font-bold text-blue-400">
                                {tickets.filter(t => t.isVerified).length}
                            </p>
                        </div>
                    </div>
                )}

                {/* Tickets List dengan AnimatePresence untuk animasi saat item dihapus */}
                {filteredTickets.length === 0 ? (
                    <div className="bg-gray-800 rounded-lg p-8 text-center">
                        <h2 className="text-2xl text-white mb-4">Tidak Ada Tiket</h2>
                        <p className="text-gray-400 mb-6">
                            {tickets.length > 0
                                ? 'Tidak ada tiket yang cocok dengan filter saat ini'
                                : 'Anda belum memiliki tiket'}
                        </p>
                        <Link
                            to="/mint-ticket"
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
                        >
                            Beli Tiket
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AnimatePresence>
                            {filteredTickets.map(ticket => renderTicketCard(ticket))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Bottom Navigation */}
                <div className="mt-12 flex justify-center">
                    <Link
                        to="/mint-ticket"
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-300"
                    >
                        Beli Tiket Konser Lainnya
                    </Link>
                </div>
            </div>

            {/* Delete Modal */}
            {renderDeleteModal()}

            {/* Toast Notification */}
            <AnimatePresence>
                {showToast && renderToast()}
            </AnimatePresence>
        </div>
    );
};

export default MyTickets;