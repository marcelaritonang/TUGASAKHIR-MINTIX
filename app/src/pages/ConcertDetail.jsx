import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AuthService from '../services/AuthService';

// Gradient text component
const GradientText = ({ text, className = "" }) => {
    return (
        <span className={`text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 ${className}`}>
            {text}
        </span>
    );
};

// Modal Konfirmasi Hapus
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, concertName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <motion.div
                className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-red-500"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
            >
                <h3 className="text-xl font-bold text-white mb-4">Konfirmasi Hapus</h3>
                <p className="text-gray-300 mb-6">
                    Apakah Anda yakin ingin menghapus konser <span className="text-red-400 font-semibold">"{concertName}"</span>?
                    Tindakan ini tidak dapat dibatalkan.
                </p>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                        Hapus
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const ConcertDetail = () => {
    const { concertId } = useParams();
    const { publicKey } = useWallet();
    const navigate = useNavigate();

    const [concert, setConcert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Cek status admin saat komponen dimuat
    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                if (publicKey) {
                    // Jika belum login, lakukan login test
                    if (!AuthService.isAuthenticated()) {
                        await AuthService.loginTest();
                    }

                    // Cek apakah user adalah admin
                    const { isAdmin } = await AuthService.checkAdminStatus();
                    setIsAdmin(isAdmin);
                }
            } catch (err) {
                console.error('Error checking admin status:', err);
                setIsAdmin(false);
            }
        };

        checkAdminStatus();
    }, [publicKey]);

    // Fetch concert details
    useEffect(() => {
        const fetchConcertDetails = async () => {
            try {
                setLoading(true);
                setError('');

                // Fetch concert data
                const response = await fetch(`http://localhost:5000/api/concerts/${concertId}`);

                if (!response.ok) {
                    throw new Error(`Gagal mengambil detail konser: ${response.status}`);
                }

                const data = await response.json();
                console.log('Detail konser:', data);
                setConcert(data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching concert details:', err);
                setError(`Gagal memuat detail konser: ${err.message}`);
                setLoading(false);
            }
        };

        if (concertId) {
            fetchConcertDetails();
        }
    }, [concertId]);

    // Delete concert (admin only)
    const handleDeleteClick = () => {
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            setIsDeleting(true);

            // Make sure we have a token
            if (!AuthService.isAuthenticated()) {
                await AuthService.loginTest();
            }

            // Send delete request
            const response = await fetch(`http://localhost:5000/api/admin/concerts/${concertId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': AuthService.getToken()
                }
            });

            if (!response.ok) {
                throw new Error(`Gagal menghapus konser: ${response.status}`);
            }

            alert('Konser berhasil dihapus');
            navigate('/collections'); // Redirect to concert list
        } catch (err) {
            console.error('Error deleting concert:', err);
            setError(`Gagal menghapus konser: ${err.message}`);
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
        }
    };

    // Format date for display
    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }).format(date);
        } catch (err) {
            return dateString || 'Tanggal tidak diketahui';
        }
    };

    // Format time for display
    const formatTime = (dateString) => {
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch (err) {
            return '';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[300px]">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-6">
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 text-center">
                    <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
                    <p className="text-white mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/collections')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                        Kembali ke Daftar Konser
                    </button>
                </div>
            </div>
        );
    }

    if (!concert) {
        return (
            <div className="container mx-auto p-6">
                <div className="bg-gray-800 p-6 rounded-lg text-center">
                    <p className="text-white">Konser tidak ditemukan.</p>
                    <button
                        onClick={() => navigate('/collections')}
                        className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                        Kembali ke Daftar Konser
                    </button>
                </div>
            </div>
        );
    }

    // Hitung total tiket tersedia
    const availableSeats = concert.sections ? concert.sections.reduce((acc, section) => acc + section.availableSeats, 0) : 0;
    const totalSeats = concert.sections ? concert.sections.reduce((acc, section) => acc + section.totalSeats, 0) : concert.totalTickets || 0;
    const soldTickets = totalSeats - availableSeats;

    return (
        <div className="min-h-screen bg-gray-900 py-16 px-4 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600 filter blur-3xl"></div>
                <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-600 filter blur-3xl"></div>
            </div>

            <div className="container mx-auto relative">
                {/* Breadcrumb navigation */}
                <div className="flex items-center mb-6 text-gray-400">
                    <Link to="/" className="hover:text-white transition-colors">Beranda</Link>
                    <span className="mx-2">/</span>
                    <Link to="/collections" className="hover:text-white transition-colors">Semua Konser</Link>
                    <span className="mx-2">/</span>
                    <span className="text-gray-300">{concert.name}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Concert Ticket Card */}
                    <div className="lg:col-span-1">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="mb-6"
                        >
                            {/* Concert Ticket Card with NFT Look */}
                            <div className="p-1 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg shadow-lg shadow-purple-500/20">
                                <div className="bg-gray-900 p-5 rounded-lg">
                                    {/* Ticket Header */}
                                    <div className="mb-4 flex justify-between items-start">
                                        <div>
                                            <h1 className="text-2xl font-bold text-white">{concert.name}</h1>
                                            <p className="text-gray-400">{concert.venue}</p>
                                        </div>

                                        {isAdmin && (
                                            <span className="bg-yellow-500 text-gray-900 text-xs font-bold px-2 py-1 rounded-md">
                                                Admin
                                            </span>
                                        )}
                                    </div>

                                    {/* Concert Poster Image */}
                                    <div
                                        className="w-full h-48 mb-4 rounded-lg bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center overflow-hidden"
                                    >
                                        {concert.posterUrl ? (
                                            <img
                                                src={`http://localhost:5000${concert.posterUrl}`}
                                                alt={concert.name}
                                                className="object-cover w-full h-full"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.style.display = 'none';
                                                    e.target.parentNode.style.display = 'flex';
                                                    e.target.parentNode.innerHTML += `<div class="text-2xl text-white font-bold">${concert.name}</div>`;
                                                }}
                                            />
                                        ) : (
                                            <div className="text-2xl text-white font-bold">{concert.name}</div>
                                        )}
                                    </div>

                                    {/* Concert Details */}
                                    <div className="space-y-3 mb-4">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Tanggal</span>
                                            <span className="text-white">{formatDate(concert.date)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Waktu</span>
                                            <span className="text-white">{formatTime(concert.date)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Kategori</span>
                                            <span className="text-white">{concert.category || 'Umum'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Status</span>
                                            <span className="text-green-500">Approved</span>
                                        </div>
                                    </div>

                                    {/* QR Code Placeholder */}
                                    <div className="w-full bg-gradient-to-br from-gray-800 to-gray-700 h-40 rounded-md mb-4 flex items-center justify-center">
                                        <div className="text-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                            </svg>
                                            <p className="text-gray-400 text-sm">Scan QR Code untuk validasi</p>
                                        </div>
                                    </div>

                                    {/* CTA Button */}
                                    <Link
                                        to={`/mint-ticket/${concert._id}`}
                                        className="block w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-center py-3 font-medium hover:from-purple-700 hover:to-indigo-700 transition-colors"
                                    >
                                        Beli Tiket Sekarang
                                    </Link>
                                </div>
                            </div>

                            {/* Admin Actions */}
                            {isAdmin && (
                                <div className="mt-4 bg-gray-800 rounded-lg p-4 border border-gray-700">
                                    <h3 className="text-white font-semibold mb-3">Admin Actions</h3>
                                    <div className="space-y-2">
                                        <button
                                            onClick={handleDeleteClick}
                                            disabled={isDeleting}
                                            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                                        >
                                            {isDeleting ? "Menghapus..." : "Hapus Konser"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* Right Column - Concert Details */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="bg-gray-800 p-6 rounded-lg mb-6"
                        >
                            <h2 className="text-2xl font-bold text-white mb-4">
                                Detail <GradientText text="Konser" />
                            </h2>

                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-white mb-2">Deskripsi</h3>
                                <p className="text-gray-300 whitespace-pre-line">
                                    {concert.description || "Tidak ada deskripsi untuk konser ini."}
                                </p>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-white mb-2">Lokasi</h3>
                                <p className="text-gray-300">{concert.venue}</p>
                                <div className="w-full h-48 bg-gray-700 rounded-lg mt-2 flex items-center justify-center">
                                    <p className="text-gray-400">Peta lokasi akan ditampilkan di sini</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="bg-gray-800 p-6 rounded-lg mb-6"
                        >
                            <h2 className="text-xl font-bold text-white mb-4">Tiket Tersedia</h2>

                            <div className="space-y-4">
                                {concert.sections && concert.sections.map((section, index) => (
                                    <div key={index} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-lg font-medium text-white">{section.name}</h3>
                                            <span className="text-purple-400 font-semibold">{section.price} SOL</span>
                                        </div>

                                        <div className="mb-2">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-400">Ketersediaan</span>
                                                <span className="text-gray-300">{section.availableSeats} / {section.totalSeats} tiket</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-600 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                                                    style={{ width: `${(section.availableSeats / section.totalSeats) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <Link
                                            to={`/mint-ticket/${concert._id}?section=${section.name}`}
                                            className="block w-full text-center bg-gray-800 hover:bg-gray-900 text-white rounded py-2 mt-3 transition-colors"
                                        >
                                            Pilih Tiket
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="bg-gray-800 p-6 rounded-lg"
                        >
                            <h2 className="text-xl font-bold text-white mb-4">Informasi Tambahan</h2>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-white font-medium mb-1">Creator</h3>
                                    <p className="text-gray-300 font-mono text-sm">{concert.creator}</p>
                                </div>

                                <div>
                                    <h3 className="text-white font-medium mb-1">Status Tiket</h3>
                                    <div className="flex items-center">
                                        <span className="text-gray-300 mr-2">
                                            {soldTickets} terjual dari {totalSeats} total tiket
                                        </span>
                                        <span className={`px-2 py-1 text-xs rounded ${soldTickets / totalSeats > 0.8 ? 'bg-red-500/30 text-red-300' :
                                                soldTickets / totalSeats > 0.5 ? 'bg-yellow-500/30 text-yellow-300' :
                                                    'bg-green-500/30 text-green-300'
                                            }`}>
                                            {soldTickets / totalSeats > 0.8 ? 'Hampir Habis' :
                                                soldTickets / totalSeats > 0.5 ? 'Terbatas' :
                                                    'Tersedia'}
                                        </span>
                                    </div>
                                </div>

                                {/* Additional Information */}
                                <div className="pt-4 border-t border-gray-700">
                                    <p className="text-gray-400 text-sm">
                                        Tiket yang dibeli akan tersedia sebagai NFT di wallet Anda dan dapat digunakan untuk masuk ke venue pada hari konser.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDeleteConfirm}
                concertName={concert.name}
            />
        </div>
    );
};

export default ConcertDetail;