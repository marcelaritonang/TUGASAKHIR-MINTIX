// src/components/TicketDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';

// Import services
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';

// Import components
import LoadingSpinner from './common/LoadingSpinner';

// Helper for formatting time
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);

    const options = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };

    return date.toLocaleDateString('id-ID', options);
};

// Helper for formatting wallet address
const formatAddress = (address, start = 6, end = 4) => {
    if (!address) return 'N/A';
    return `${address.slice(0, start)}...${address.slice(-end)}`;
};

const TicketDetail = () => {
    const { ticketId } = useParams();
    const navigate = useNavigate();

    // State
    const [ticket, setTicket] = useState(null);
    const [concert, setConcert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [txDetails, setTxDetails] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());

    // Setup connection
    const connection = new Connection(
        process.env.REACT_APP_SOLANA_RPC_URL || clusterApiUrl('devnet'),
        'confirmed'
    );

    // Load ticket data
    useEffect(() => {
        const loadTicketDetails = async () => {
            if (!ticketId) {
                setError('Tiket ID tidak valid');
                setLoading(false);
                return;
            }

            if (!isAuthenticated) {
                setError('Anda harus login untuk melihat detail tiket');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                // Fetch all tickets and find the one with matching ID
                const allTickets = await ApiService.getMyTickets();
                const ticketData = allTickets.find(t => t._id === ticketId);

                if (!ticketData) {
                    setError('Tiket tidak ditemukan');
                    setLoading(false);
                    return;
                }

                setTicket(ticketData);

                // Fetch concert details
                try {
                    const concertData = await ApiService.getConcert(ticketData.concertId);
                    setConcert(concertData);
                } catch (err) {
                    console.error('Error fetching concert details:', err);
                    setConcert(null);
                }

                // Fetch transaction details if available
                if (ticketData.transactionSignature) {
                    try {
                        const txData = await connection.getTransaction(ticketData.transactionSignature);

                        if (txData) {
                            const blockTime = txData.blockTime ? new Date(txData.blockTime * 1000) : null;
                            const slot = txData.slot;
                            const confirmations = txData.meta?.confirmations || 0;
                            const fee = txData.meta?.fee || 0;

                            // Calculate TPS based on transaction data
                            let tps = 'N/A';
                            if (txData.meta && txData.meta.txProcessingTime) {
                                tps = (1000 / txData.meta.txProcessingTime).toFixed(2);
                            } else {
                                // Estimate TPS if not directly available
                                const perfSamples = await connection.getRecentPerformanceSamples(1);
                                if (perfSamples && perfSamples.length > 0) {
                                    tps = perfSamples[0].numTransactions / perfSamples[0].samplePeriodSecs;
                                    tps = tps.toFixed(2);
                                }
                            }

                            setTxDetails({
                                signature: ticketData.transactionSignature,
                                blockTime,
                                slot,
                                confirmations,
                                fee,
                                tps,
                                isValid: true
                            });
                        } else {
                            setTxDetails({
                                signature: ticketData.transactionSignature,
                                error: 'Transaction not found on blockchain',
                                isValid: false
                            });
                        }
                    } catch (err) {
                        console.error('Error fetching transaction details:', err);
                        setTxDetails({
                            signature: ticketData.transactionSignature,
                            error: err.message,
                            isValid: false
                        });
                    }
                }

            } catch (err) {
                console.error('Error loading ticket details:', err);
                setError('Gagal memuat detail tiket: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        loadTicketDetails();
    }, [ticketId]);

    // Handle verify ticket
    const handleVerifyTicket = async () => {
        if (!ticket) return;

        try {
            setLoading(true);
            const result = await ApiService.verifyTicket(ticket._id);

            if (result.success) {
                setTicket(prev => ({ ...prev, isVerified: true, verifiedAt: new Date() }));
                alert('Tiket berhasil diverifikasi');
            } else {
                alert('Gagal memverifikasi tiket: ' + (result.msg || 'Unknown error'));
            }
        } catch (err) {
            console.error("Error verifying ticket:", err);
            alert('Gagal memverifikasi tiket: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Render loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col items-center justify-center mt-20">
                        <LoadingSpinner size="lg" />
                        <p className="text-gray-300 mt-4">Memuat detail tiket...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 mt-10">
                        <h2 className="text-xl text-white mb-4">Terjadi Kesalahan</h2>
                        <p className="text-red-400 mb-6">{error}</p>
                        <div className="flex">
                            <Link
                                to="/my-tickets"
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                            >
                                Kembali ke Tiket Saya
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Render if ticket not found
    if (!ticket) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gray-800 rounded-lg p-6 mt-10">
                        <h2 className="text-xl text-white mb-4">Tiket Tidak Ditemukan</h2>
                        <p className="text-gray-400 mb-6">
                            Tiket yang Anda cari tidak ditemukan atau Anda tidak memiliki akses untuk melihatnya.
                        </p>
                        <div className="flex">
                            <Link
                                to="/my-tickets"
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                            >
                                Kembali ke Tiket Saya
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Status badge style
    const getBadgeStyle = () => {
        if (!txDetails?.isValid || !concert) {
            return 'bg-red-900/20 text-red-400 border-red-700';
        }
        if (ticket.isVerified) {
            return 'bg-green-900/20 text-green-400 border-green-700';
        }
        return 'bg-yellow-900/20 text-yellow-400 border-yellow-700';
    };

    // Status text
    const getStatusText = () => {
        if (!txDetails?.isValid) {
            return 'Tidak Valid';
        }
        if (!concert) {
            return 'Konser Dihapus';
        }
        return ticket.isVerified ? 'Terverifikasi' : 'Belum Digunakan';
    };

    return (
        <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
            {/* Background effects */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600 filter blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-600 filter blur-3xl"></div>
            </div>

            <div className="max-w-4xl mx-auto relative">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-xl"
                >
                    <div className="bg-gray-900 rounded-xl p-8">
                        <header className="flex justify-between items-start mb-6">
                            <div>
                                <Link
                                    to="/my-tickets"
                                    className="text-gray-400 text-sm hover:text-white transition-colors flex items-center gap-1 mb-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Kembali ke Tiket Saya
                                </Link>
                                <h1 className="text-3xl font-bold text-white">
                                    Detail Tiket
                                </h1>
                                <p className="text-gray-400">
                                    {ticket.sectionName} • {ticket.seatNumber || 'General'}
                                </p>
                            </div>

                            <div className={`px-4 py-2 rounded-full text-sm border ${getBadgeStyle()}`}>
                                {getStatusText()}
                            </div>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            {/* Left side - Ticket Info */}
                            <div>
                                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                                    <h2 className="text-xl font-semibold text-white mb-4">Informasi Konser</h2>

                                    {concert ? (
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-gray-400 text-sm">Nama Konser</p>
                                                <p className="text-white font-medium">{concert.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-sm">Lokasi</p>
                                                <p className="text-white">{concert.venue}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-sm">Tanggal</p>
                                                <p className="text-white">{formatDate(concert.date)}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-sm">Deskripsi</p>
                                                <p className="text-gray-300 text-sm">
                                                    {concert.description || 'Tidak ada deskripsi'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-red-500/10 p-4 rounded-lg">
                                            <p className="text-red-400">
                                                Konser ini telah dihapus atau tidak tersedia
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                                    <h2 className="text-xl font-semibold text-white mb-4">Detail Tiket</h2>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-gray-400 text-sm">Tipe Tiket</p>
                                            <p className="text-white font-medium">{ticket.sectionName}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-sm">Nomor Kursi</p>
                                            <p className="text-white font-medium">{ticket.seatNumber || 'General'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-sm">Pemilik</p>
                                            <p className="text-white font-mono text-sm truncate">{formatAddress(ticket.owner)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-sm">Tanggal Pembuatan</p>
                                            <p className="text-white text-sm">{formatDate(ticket.createdAt)}</p>
                                        </div>
                                        {ticket.isVerified && (
                                            <>
                                                <div>
                                                    <p className="text-gray-400 text-sm">Status Verifikasi</p>
                                                    <p className="text-green-400">Terverifikasi</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-sm">Tanggal Verifikasi</p>
                                                    <p className="text-white text-sm">{formatDate(ticket.verifiedAt)}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right side - QR Code and Blockchain */}
                            <div>
                                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                                    <h2 className="text-xl font-semibold text-white mb-4">QR Code Tiket</h2>

                                    <div className="flex justify-center">
                                        <div className="bg-white p-6 rounded-lg shadow-lg">
                                            <QRCodeSVG
                                                value={JSON.stringify({
                                                    id: ticket._id,
                                                    concertId: ticket.concertId,
                                                    seat: ticket.seatNumber,
                                                    owner: ticket.owner,
                                                    valid: txDetails?.isValid && !!concert,
                                                    signature: ticket.transactionSignature?.substring(0, 10)
                                                })}
                                                size={200}
                                                level="H"
                                                includeMargin={true}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4 text-center">
                                        <p className="text-gray-400 text-sm">
                                            Tunjukkan QR Code ini untuk masuk ke konser
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                                    <h2 className="text-xl font-semibold text-white mb-4">Informasi Blockchain</h2>

                                    {txDetails ? (
                                        txDetails.error ? (
                                            <div className="bg-red-500/10 p-4 rounded-lg">
                                                <p className="text-red-400">
                                                    Error: {txDetails.error}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-gray-400 text-sm">Signature</p>
                                                    <div className="flex items-center">
                                                        <p className="text-white font-mono text-sm truncate mr-2">
                                                            {txDetails.signature}
                                                        </p>
                                                        <a
                                                            href={`https://explorer.solana.com/tx/${txDetails.signature}?cluster=devnet`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs bg-purple-600 px-2 py-1 rounded hover:bg-purple-700 transition-colors text-white"
                                                        >
                                                            Explorer
                                                        </a>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-gray-400 text-sm">Waktu Mint</p>
                                                        <p className="text-white">
                                                            {txDetails.blockTime ? formatDate(txDetails.blockTime) : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-400 text-sm">TPS Saat Minting</p>
                                                        <p className="text-yellow-400 font-medium">
                                                            {txDetails.tps || 'N/A'} TPS
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-400 text-sm">Fee</p>
                                                        <p className="text-white">
                                                            {txDetails.fee / 1000000000} SOL
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-400 text-sm">Slot</p>
                                                        <p className="text-white">
                                                            {txDetails.slot || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-400 text-sm">Konfirmasi</p>
                                                        <p className="text-white">
                                                            {txDetails.confirmations || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-400 text-sm">Network</p>
                                                        <p className="text-white">Solana Devnet</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                        <div className="bg-yellow-500/10 p-4 rounded-lg">
                                            <p className="text-yellow-400">
                                                Tidak ada informasi transaksi blockchain untuk tiket ini
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-between">
                            <Link
                                to="/my-tickets"
                                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                                Kembali
                            </Link>

                            <div className="flex gap-3">
                                {txDetails?.isValid && concert && !ticket.isVerified && (
                                    <button
                                        onClick={handleVerifyTicket}
                                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                        disabled={loading}
                                    >
                                        {loading ? <LoadingSpinner /> : 'Verifikasi Tiket'}
                                    </button>
                                )}

                                {ticket.transactionSignature && (
                                    <a
                                        href={`https://explorer.solana.com/tx/${ticket.transactionSignature}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                    >
                                        Lihat di Explorer
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default TicketDetail;