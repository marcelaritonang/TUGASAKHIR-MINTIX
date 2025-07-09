import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import LoadingSpinner from './common/LoadingSpinner';
import AuthService from '../services/AuthService';
import { API } from '../config/environment';
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

// Concert Card Component
const ConcertCard = ({ concert, index, isAdmin, onDeleteConcert }) => {
    // Wallet admin yang diizinkan
    const ADMIN_WALLET = '2upQ693dMu2PEdBp6JKnxRBWEimdbmbgNCvncbasP6TU';

    // Array of gradient backgrounds for tickets
    const previewImages = [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='0' x2='0' y1='0' y2='100%25' gradientTransform='rotate(240)'%3E%3Cstop offset='0' stop-color='%234338ca'/%3E%3Cstop offset='1' stop-color='%23a855f7'/%3E%3C/linearGradient%3E%3Cpattern patternUnits='userSpaceOnUse' id='b' width='300' height='250' x='0' y='0' viewBox='0 0 1080 900'%3E%3Cg fill-opacity='0.05'%3E%3Cpolygon fill='%23444' points='90 150 0 300 180 300'/%3E%3Cpolygon points='90 150 180 0 0 0'/%3E%3Cpolygon fill='%23AAA' points='270 150 360 0 180 0'/%3E%3Cpolygon fill='%23DDD' points='450 150 360 300 540 300'/%3E%3Cpolygon fill='%23999' points='450 150 540 0 360 0'/%3E%3Cpolygon points='630 150 540 300 720 300'/%3E%3Cpolygon fill='%23DDD' points='630 150 720 0 540 0'/%3E%3Cpolygon fill='%23444' points='810 150 720 300 900 300'/%3E%3Cpolygon fill='%23FFF' points='810 150 900 0 720 0'/%3E%3Cpolygon fill='%23DDD' points='990 150 900 300 1080 300'/%3E%3Cpolygon fill='%23444' points='990 150 1080 0 900 0'/%3E%3Cpolygon fill='%23DDD' points='90 450 0 600 180 600'/%3E%3Cpolygon points='90 450 180 300 0 300'/%3E%3Cpolygon fill='%23666' points='270 450 180 600 360 600'/%3E%3Cpolygon fill='%23AAA' points='270 450 360 300 180 300'/%3E%3Cpolygon fill='%23DDD' points='450 450 360 600 540 600'/%3E%3Cpolygon fill='%23999' points='450 450 540 300 360 300'/%3E%3Cpolygon fill='%23999' points='630 450 540 600 720 600'/%3E%3Cpolygon fill='%23FFF' points='630 450 720 300 540 300'/%3E%3Cpolygon points='810 450 720 600 900 600'/%3E%3Cpolygon fill='%23DDD' points='810 450 900 300 720 300'/%3E%3Cpolygon fill='%23AAA' points='990 450 900 600 1080 600'/%3E%3Cpolygon fill='%23444' points='990 450 1080 300 900 300'/%3E%3Cpolygon fill='%23222' points='90 750 0 900 180 900'/%3E%3Cpolygon points='270 750 180 900 360 900'/%3E%3Cpolygon fill='%23DDD' points='270 750 360 600 180 600'/%3E%3Cpolygon points='450 750 540 600 360 600'/%3E%3Cpolygon points='630 750 540 900 720 900'/%3E%3Cpolygon fill='%23444' points='630 750 720 600 540 600'/%3E%3Cpolygon fill='%23AAA' points='810 750 720 900 900 900'/%3E%3Cpolygon fill='%23666' points='810 750 900 600 720 600'/%3E%3Cpolygon fill='%23999' points='990 750 900 900 1080 900'/%3E%3Cpolygon fill='%23999' points='180 0 90 150 270 150'/%3E%3Cpolygon fill='%23444' points='360 0 270 150 450 150'/%3E%3Cpolygon fill='%23FFF' points='540 0 450 150 630 150'/%3E%3Cpolygon points='900 0 810 150 990 150'/%3E%3Cpolygon fill='%23222' points='0 300 -90 450 90 450'/%3E%3Cpolygon fill='%23FFF' points='0 300 90 150 -90 150'/%3E%3Cpolygon fill='%23FFF' points='180 300 90 450 270 450'/%3E%3Cpolygon fill='%23666' points='180 300 270 150 90 150'/%3E%3Cpolygon fill='%23222' points='360 300 270 450 450 450'/%3E%3Cpolygon fill='%23FFF' points='360 300 450 150 270 150'/%3E%3Cpolygon fill='%23444' points='540 300 450 450 630 450'/%3E%3Cpolygon fill='%23222' points='540 300 630 150 450 150'/%3E%3Cpolygon fill='%23AAA' points='720 300 630 450 810 450'/%3E%3Cpolygon fill='%23666' points='720 300 810 150 630 150'/%3E%3Cpolygon fill='%23FFF' points='900 300 810 450 990 450'/%3E%3Cpolygon fill='%23999' points='900 300 990 150 810 150'/%3E%3Cpolygon points='0 600 -90 750 90 750'/%3E%3Cpolygon fill='%23666' points='0 600 90 450 -90 450'/%3E%3Cpolygon fill='%23AAA' points='180 600 90 750 270 750'/%3E%3Cpolygon fill='%23444' points='180 600 270 450 90 450'/%3E%3Cpolygon fill='%23444' points='360 600 270 750 450 750'/%3E%3Cpolygon fill='%23999' points='360 600 450 450 270 450'/%3E%3Cpolygon fill='%23666' points='540 600 630 450 450 450'/%3E%3Cpolygon fill='%23222' points='720 600 630 750 810 750'/%3E%3Cpolygon fill='%23FFF' points='900 600 810 750 990 750'/%3E%3Cpolygon fill='%23222' points='900 600 990 450 810 450'/%3E%3Cpolygon fill='%23DDD' points='0 900 90 750 -90 750'/%3E%3Cpolygon fill='%23444' points='180 900 270 750 90 750'/%3E%3Cpolygon fill='%23FFF' points='360 900 450 750 270 750'/%3E%3Cpolygon fill='%23AAA' points='540 900 630 750 450 750'/%3E%3Cpolygon fill='%23FFF' points='720 900 810 750 630 750'/%3E%3Cpolygon fill='%23222' points='900 900 990 750 810 750'/%3E%3Cpolygon fill='%23222' points='1080 300 990 450 1170 450'/%3E%3Cpolygon fill='%23FFF' points='1080 300 1170 150 990 150'/%3E%3Cpolygon points='1080 600 990 750 1170 750'/%3E%3Cpolygon fill='%23666' points='1080 600 1170 450 990 450'/%3E%3Cpolygon fill='%23DDD' points='1080 900 1170 750 990 750'/%3E%3C/g%3E%3C/pattern%3E%3C/defs%3E%3Crect x='0' y='0' fill='url(%23a)' width='100%25' height='100%25'/%3E%3Crect x='0' y='0' fill='url(%23b)' width='100%25' height='100%25'/%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 800 800'%3E%3Cdefs%3E%3CradialGradient id='a' cx='400' cy='400' r='50%25' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%236d28d9'/%3E%3Cstop offset='1' stop-color='%23312e81'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='400' cy='400' r='70%25' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23A855F7'/%3E%3Cstop offset='1' stop-color='%23312E81'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect fill='url(%23a)' width='800' height='800'/%3E%3Cg fill-opacity='0.3'%3E%3Ccircle fill='url(%23b)' cx='267.5' cy='61' r='300'/%3E%3Ccircle fill='url(%23b)' cx='532.5' cy='61' r='300'/%3E%3Ccircle fill='url(%23b)' cx='400' cy='30' r='300'/%3E%3C/g%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='0' x2='0' y1='0' y2='100%25' gradientTransform='rotate(240)'%3E%3Cstop offset='0' stop-color='%232563eb'/%3E%3Cstop offset='1' stop-color='%236d28d9'/%3E%3C/linearGradient%3E%3Cpattern patternUnits='userSpaceOnUse' id='b' width='540' height='450' x='0' y='0' viewBox='0 0 1080 900'%3E%3Cg fill-opacity='0.1'%3E%3Cpolygon fill='%23444' points='90 150 0 300 180 300'/%3E%3Cpolygon points='90 150 180 0 0 0'/%3E%3Cpolygon fill='%23AAA' points='270 150 360 0 180 0'/%3E%3Cpolygon fill='%23DDD' points='450 150 360 300 540 300'/%3E%3Cpolygon fill='%23999' points='450 150 540 0 360 0'/%3E%3Cpolygon points='630 150 540 300 720 300'/%3E%3Cpolygon fill='%23DDD' points='630 150 720 0 540 0'/%3E%3Cpolygon fill='%23444' points='810 150 720 300 900 300'/%3E%3Cpolygon fill='%23FFF' points='810 150 900 0 720 0'/%3E%3Cpolygon fill='%23DDD' points='990 150 900 300 1080 300'/%3E%3Cpolygon fill='%23444' points='990 150 1080 0 900 0'/%3E%3Cpolygon fill='%23DDD' points='90 450 0 600 180 600'/%3E%3Cpolygon points='90 450 180 300 0 300'/%3E%3Cpolygon fill='%23666' points='270 450 180 600 360 600'/%3E%3Cpolygon fill='%23AAA' points='270 450 360 300 180 300'/%3E%3Cpolygon fill='%23DDD' points='450 450 360 600 540 600'/%3E%3Cpolygon fill='%23999' points='450 450 540 300 360 300'/%3E%3Cpolygon fill='%23999' points='630 450 540 600 720 600'/%3E%3Cpolygon fill='%23FFF' points='630 450 720 300 540 300'/%3E%3Cpolygon points='810 450 720 600 900 600'/%3E%3Cpolygon fill='%23DDD' points='810 450 900 300 720 300'/%3E%3Cpolygon fill='%23AAA' points='990 450 900 600 1080 600'/%3E%3Cpolygon fill='%23444' points='990 450 1080 300 900 300'/%3E%3Cpolygon fill='%23222' points='90 750 0 900 180 900'/%3E%3Cpolygon points='270 750 180 900 360 900'/%3E%3Cpolygon fill='%23DDD' points='270 750 360 600 180 600'/%3E%3Cpolygon points='450 750 540 600 360 600'/%3E%3Cpolygon points='630 750 540 900 720 900'/%3E%3Cpolygon fill='%23444' points='630 750 720 600 540 600'/%3E%3Cpolygon fill='%23AAA' points='810 750 720 900 900 900'/%3E%3Cpolygon fill='%23666' points='810 750 900 600 720 600'/%3E%3Cpolygon fill='%23999' points='990 750 900 900 1080 900'/%3E%3Cpolygon fill='%23999' points='180 0 90 150 270 150'/%3E%3Cpolygon fill='%23444' points='360 0 270 150 450 150'/%3E%3Cpolygon fill='%23FFF' points='540 0 450 150 630 150'/%3E%3Cpolygon points='900 0 810 150 990 150'/%3E%3Cpolygon fill='%23222' points='0 300 -90 450 90 450'/%3E%3Cpolygon fill='%23FFF' points='0 300 90 150 -90 150'/%3E%3Cpolygon fill='%23FFF' points='180 300 90 450 270 450'/%3E%3Cpolygon fill='%23666' points='180 300 270 150 90 150'/%3E%3Cpolygon fill='%23222' points='360 300 270 450 450 450'/%3E%3Cpolygon fill='%23FFF' points='360 300 450 150 270 150'/%3E%3Cpolygon fill='%23444' points='540 300 450 450 630 450'/%3E%3Cpolygon fill='%23222' points='540 300 630 150 450 150'/%3E%3Cpolygon fill='%23AAA' points='720 300 630 450 810 450'/%3E%3Cpolygon fill='%23666' points='720 300 810 150 630 150'/%3E%3Cpolygon fill='%23FFF' points='900 300 810 450 990 450'/%3E%3Cpolygon fill='%23999' points='900 300 990 150 810 150'/%3E%3Cpolygon points='0 600 -90 750 90 750'/%3E%3Cpolygon fill='%23666' points='0 600 90 450 -90 450'/%3E%3Cpolygon fill='%23AAA' points='180 600 90 750 270 750'/%3E%3Cpolygon fill='%23444' points='180 600 270 450 90 450'/%3E%3Cpolygon fill='%23444' points='360 600 270 750 450 750'/%3E%3Cpolygon fill='%23999' points='360 600 450 450 270 450'/%3E%3Cpolygon fill='%23666' points='540 600 630 450 450 450'/%3E%3Cpolygon fill='%23222' points='720 600 630 750 810 750'/%3E%3Cpolygon fill='%23FFF' points='900 600 810 750 990 750'/%3E%3Cpolygon fill='%23222' points='900 600 990 450 810 450'/%3E%3Cpolygon fill='%23DDD' points='0 900 90 750 -90 750'/%3E%3Cpolygon fill='%23444' points='180 900 270 750 90 750'/%3E%3Cpolygon fill='%23FFF' points='360 900 450 750 270 750'/%3E%3Cpolygon fill='%23AAA' points='540 900 630 750 450 750'/%3E%3Cpolygon fill='%23FFF' points='720 900 810 750 630 750'/%3E%3Cpolygon fill='%23222' points='900 900 990 750 810 750'/%3E%3Cpolygon fill='%23222' points='1080 300 990 450 1170 450'/%3E%3Cpolygon fill='%23FFF' points='1080 300 1170 150 990 150'/%3E%3Cpolygon points='1080 600 990 750 1170 750'/%3E%3Cpolygon fill='%23666' points='1080 600 1170 450 990 450'/%3E%3Cpolygon fill='%23DDD' points='1080 900 1170 750 990 750'/%3E%3C/g%3E%3C/pattern%3E%3C/defs%3E%3Crect x='0' y='0' fill='url(%23a)' width='100%25' height='100%25'/%3E%3Crect x='0' y='0' fill='url(%23b)' width='100%25' height='100%25'/%3E%3C/svg%3E"
    ];

    // Pilih gambar preview secara acak berdasarkan index
    const imgIndex = parseInt(index) % previewImages.length;
    const previewImage = previewImages[imgIndex];

    // Hitung ketersediaan tiket
    const availableSeats = concert.sections ? concert.sections.reduce((acc, section) => acc + section.availableSeats, 0) : 0;
    const totalSeats = concert.sections ? concert.sections.reduce((acc, section) => acc + section.totalSeats, 0) : concert.totalTickets || 0;
    const availabilityPercentage = (availableSeats / totalSeats) * 100;

    // Format tanggal untuk tampilan
    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }).format(date);
        } catch (err) {
            return dateString || 'Tanggal tidak diketahui';
        }
    };

    return (
        <motion.div
            className="shadow-xl rounded-lg overflow-hidden hover:shadow-2xl hover:shadow-purple-500/20 transition-all hover:-translate-y-2 duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
        >
            {/* Warna border ungu seperti di NFT Ticket */}
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg">
                {/* Background dalam berwarna gelap seperti di NFT Ticket */}
                <div className="w-full h-full bg-gray-900 p-3 rounded-md">
                    {/* Header card dengan nama konser */}
                    <div
                        className="rounded-md h-36 mb-3 overflow-hidden border border-purple-800 relative"
                        style={{
                            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url("${previewImage}")`,
                            backgroundSize: 'cover',
                            opacity: 0.9
                        }}
                    >
                        {/* Admin badge - pastikan publicKey tidak undefined */}
                        {isAdmin && (
                            <div className="absolute top-2 left-2 bg-yellow-500 text-gray-900 text-xs font-bold px-2 py-1 rounded-md">
                                Admin
                            </div>
                        )}

                        {/* Judul konser di tengah */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <h3 className="text-white text-xl font-bold px-4 text-center">{concert.name}</h3>
                        </div>

                        {/* Badge limited tickets */}
                        {availabilityPercentage < 30 && (
                            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                                Limited Tickets
                            </div>
                        )}
                    </div>

                    {/* Concert info dengan layout mirip NFT ticket */}
                    <div className="mb-3">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-gray-400 text-sm">Venue</span>
                            <span className="text-white text-sm font-medium">{concert.venue}</span>
                        </div>

                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-gray-400 text-sm">Date</span>
                            <span className="text-white text-sm font-medium">{formatDate(concert.date)}</span>
                        </div>

                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400 text-sm">Available</span>
                            <div className="flex items-center">
                                <span className="text-white text-sm font-medium mr-2">{availableSeats} / {totalSeats}</span>
                                {/* Progress bar untuk ketersediaan tiket */}
                                <div className="w-14 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-pink-500"
                                        style={{ width: `${availabilityPercentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer dengan logo */}
                    <div className="flex justify-between items-center mb-3">
                        <div className="bg-purple-900/50 border border-purple-700/50 rounded-full w-7 h-7 flex items-center justify-center">
                            <span className="text-purple-300/80 text-xs">M</span>
                        </div>

                        {/* Admin actions - hanya untuk admin dengan wallet yang ditentukan */}
                        {isAdmin && (
                            <button
                                onClick={() => onDeleteConcert(concert)}
                                className="bg-red-900/50 text-red-300 hover:bg-red-800 text-xs px-2 py-1 rounded-md transition-colors"
                            >
                                Hapus
                            </button>
                        )}
                    </div>
                    {/* Action buttons */}
                    <div className="space-y-2">
                        <Link
                            to={`/concert/${concert._id}`}
                            className="block w-full bg-gradient-to-br from-indigo-600 to-purple-600 p-0.5 rounded-lg hover:shadow-lg hover:shadow-purple-500/20 transition duration-300"
                        >
                            <div className="bg-gray-900 text-white text-center py-2 rounded-md text-sm font-medium hover:bg-gray-800/90 transition duration-300">
                                View Details
                            </div>
                        </Link>

                        <Link
                            to={`/mint-ticket/${concert._id}`}
                            className="block w-full bg-gradient-to-br from-pink-500 to-purple-600 p-0.5 rounded-lg hover:shadow-lg hover:shadow-pink-500/20 transition duration-300"
                        >
                            <div className="bg-gray-900 text-white text-center py-2 rounded-md text-sm font-medium hover:bg-gray-800/90 transition duration-300">
                                Mint Ticket
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const ConcertList = () => {
    const { publicKey } = useWallet();
    const [concerts, setConcerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filter, setFilter] = useState('all');
    const [isAdmin, setIsAdmin] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [concertToDelete, setConcertToDelete] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [deletingConcert, setDeletingConcert] = useState(false);

    // Admin wallet address yang diizinkan
    const ADMIN_WALLET = '2upQ693dMu2PEdBp6JKnxRBWEimdbmbgNCvncbasP6TU';

    // Cek status admin saat komponen dimuat
    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                if (publicKey) {
                    const walletAddress = publicKey.toString();
                    console.log("Connected wallet:", walletAddress);

                    // Check if wallet is admin
                    const isAdmin = walletAddress === '2upQ693dMu2PEdBp6JKnxRBWEimdbmbgNCvncbasP6TU';
                    setIsAdmin(isAdmin);

                    // Jika belum login dan admin, lakukan login test
                    if (isAdmin && !AuthService.isAuthenticated()) {
                        await AuthService.loginTest(walletAddress);
                    }
                } else {
                    setIsAdmin(false);
                }
            } catch (err) {
                console.error('Error checking admin status:', err);
                setIsAdmin(false);
            }
        };

        checkAdminStatus();
    }, [publicKey]);

    // Load concerts when component mounts or filters change
    useEffect(() => {
        fetchConcerts();
    }, [currentPage, filter]);

    const fetchConcerts = async () => {
        try {
            setLoading(true);
            setError('');

            // Construct query params
            const params = new URLSearchParams({
                page: currentPage,
                limit: 8
            });

            if (filter !== 'all') {
                params.append('category', filter);
            }

            // Fetch approved concerts
            const response = await fetch(`${API.getApiUrl()}/concerts?${params}`);

            if (!response.ok) {
                throw new Error(`Gagal mengambil data konser: ${response.status}`);
            }

            const data = await response.json();
            console.log('Data konser yang diambil:', data);

            // Set concerts data
            if (data.concerts) {
                setConcerts(data.concerts);

                // Set pagination
                if (data.pagination) {
                    setTotalPages(data.pagination.pages || 1);
                }
            } else if (Array.isArray(data)) {
                setConcerts(data);
            } else {
                setConcerts([]);
            }

            setLoading(false);
        } catch (err) {
            console.error('Error saat mengambil konser:', err);
            setError(`Gagal memuat daftar konser: ${err.message}`);
            setLoading(false);
        }
    };

    // Handle delete concert confirmation
    const handleDeleteClick = (concert) => {
        setConcertToDelete(concert);
        setDeleteConfirmOpen(true);
    };

    // Execute delete concert
    const handleDeleteConfirm = async () => {
        if (!concertToDelete || !concertToDelete._id) return;

        try {
            setDeletingConcert(true);
            setError('');

            // Make sure we have a token
            if (!AuthService.isAuthenticated()) {
                const loginSuccess = await AuthService.loginTest(ADMIN_WALLET);
                if (!loginSuccess) {
                    throw new Error('Gagal login. Silakan refresh halaman dan coba lagi.');
                }
            }

            const token = AuthService.getToken();
            console.log("Using token for delete:", token ? "Token available" : "No token");

            // URL endpoint admin untuk menghapus konser
            const deleteUrl = await fetch(`${API.getApiUrl()}/admin/concerts/${concertToDelete._id}`);
            console.log("Sending DELETE request to:", deleteUrl);

            // Send delete request to backend
            const response = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                }
            });

            // Log full response untuk debugging
            console.log("Delete response status:", response.status);

            // Periksa respons
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                let errorMsg = `Gagal menghapus konser (${response.status})`;

                if (contentType && contentType.includes('application/json')) {
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.msg || errorMsg;
                    } catch (parseError) {
                        console.error("Error parsing JSON response:", parseError);
                    }
                } else {
                    // Jika bukan JSON, ambil teks respons
                    try {
                        const errorText = await response.text();
                        console.error("Non-JSON error response:", errorText);
                        if (errorText.includes("<!DOCTYPE html>")) {
                            errorMsg = "Gagal menghapus konser: Respons tidak valid dari server";
                        }
                    } catch (textError) {
                        console.error("Error getting response text:", textError);
                    }
                }

                throw new Error(errorMsg);
            }

            // Parse successful response
            let data;
            try {
                data = await response.json();
                console.log("Delete response data:", data);
            } catch (parseError) {
                console.warn("Warning: Could not parse JSON response, but status was OK");
                data = { success: true };
            }

            // Show success message
            setSuccessMessage(`Konser "${concertToDelete.name}" berhasil dihapus`);

            // Set timeout to clear the success message
            setTimeout(() => {
                setSuccessMessage('');
            }, 5000);

            // Refresh concert list
            fetchConcerts();

            // Close modal
            setDeleteConfirmOpen(false);
            setConcertToDelete(null);
        } catch (err) {
            console.error('Error deleting concert:', err);
            setError(`Gagal menghapus konser: ${err.message}`);
        } finally {
            setDeletingConcert(false);
        }
    };

    // Filter concerts by search term
    const filteredConcerts = concerts.filter(concert =>
        concert.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        concert.venue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        concert.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination
    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    if (loading && concerts.length === 0) {
        return (
            <div className="flex justify-center items-center min-h-[300px]">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <section className="py-16 px-4 min-h-screen bg-gray-900 relative overflow-hidden">
            {/* Background subtle effect - adjusted for better transition */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600 filter blur-3xl"></div>
                <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-600 filter blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto relative">
                <motion.div
                    className="flex justify-between items-center mb-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-3xl font-bold text-white flex items-center">
                        Upcoming <GradientText text="Concerts" className="ml-2" />
                        {isAdmin && publicKey?.toString() === ADMIN_WALLET && (
                            <span className="ml-3 text-sm bg-yellow-600 text-white px-2 py-1 rounded-full">
                                Admin Mode
                            </span>
                        )}
                    </h1>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setFilter('all');
                                setCurrentPage(1);
                                fetchConcerts();
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg transition-colors hover:from-purple-700 hover:to-indigo-700"
                        >
                            Muat Ulang
                        </button>
                    </div>
                </motion.div>

                {/* Success Message */}
                {successMessage && (
                    <motion.div
                        className="bg-green-500/10 border border-green-500 rounded-lg p-4 mb-6 text-center"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <p className="text-green-500">{successMessage}</p>
                    </motion.div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6 text-center">
                        <p className="text-red-500">{error}</p>
                        <button
                            onClick={fetchConcerts}
                            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                        >
                            Coba Lagi
                        </button>
                    </div>
                )}

                {/* Search and Filter Section */}
                <motion.div
                    className="bg-gray-800/50 rounded-lg p-4 mb-8 backdrop-blur-sm border border-gray-700/50"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Cari konser..."
                                className="w-full bg-gray-700 text-white px-4 py-2 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-600"
                            />
                            <svg className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="text-gray-400 text-sm mr-2">Filter:</div>
                            <select
                                value={filter}
                                onChange={(e) => {
                                    setFilter(e.target.value);
                                    setCurrentPage(1); // Reset ke halaman pertama saat mengganti filter
                                }}
                                className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-600"
                            >
                                <option value="all">Semua Kategori</option>
                                <option value="Rock">Rock</option>
                                <option value="Pop">Pop</option>
                                <option value="Jazz">Jazz</option>
                                <option value="Electronic">Electronic</option>
                                <option value="Classical">Classical</option>
                            </select>
                        </div>
                    </div>
                </motion.div>

                {/* Concert List */}
                {filteredConcerts.length === 0 ? (
                    <motion.div
                        className="bg-gray-800/50 rounded-lg p-10 text-center backdrop-blur-sm border border-gray-700/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <h3 className="text-xl text-gray-400 mb-2">Tidak ada konser yang ditemukan</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Saat ini tidak ada konser yang tersedia. Silakan periksa kembali nanti atau ubah kriteria pencarian Anda.
                        </p>
                    </motion.div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {filteredConcerts.map((concert, index) => (
                                <ConcertCard
                                    key={concert._id}
                                    concert={concert}
                                    index={index}
                                    isAdmin={isAdmin}
                                    onDeleteConcert={handleDeleteClick}
                                />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center mt-10">
                                <motion.div
                                    className="flex space-x-2 bg-gray-800/50 p-2 rounded-lg border border-gray-700/50 backdrop-blur-sm"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                >
                                    <button
                                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>

                                    {Array.from({ length: totalPages }, (_, i) => {
                                        // Show only 5 pages max with current page in the middle
                                        const pageNum = i + 1;
                                        const showDirectly =
                                            totalPages <= 5 ||
                                            pageNum === 1 ||
                                            pageNum === totalPages ||
                                            Math.abs(currentPage - pageNum) <= 1;

                                        if (showDirectly) {
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className={`w-10 h-10 flex items-center justify-center rounded ${currentPage === pageNum
                                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                                                        : 'bg-gray-700 text-white hover:bg-gray-600'
                                                        } transition-colors`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        } else if (
                                            (pageNum === 2 && currentPage > 3) ||
                                            (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                                        ) {
                                            return (
                                                <span key={i} className="flex items-center justify-center text-gray-500">
                                                    ...
                                                </span>
                                            );
                                        }

                                        return null;
                                    })}

                                    <button
                                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </motion.div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteConfirmOpen}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setConcertToDelete(null);
                }}
                onConfirm={handleDeleteConfirm}
                concertName={concertToDelete?.name || ''}
            />
        </section>
    );
};

export default ConcertList;