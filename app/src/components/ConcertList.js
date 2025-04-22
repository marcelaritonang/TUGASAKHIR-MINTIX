// components/ConcertList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getProgram, isAdmin } from '../utils/anchor';
import { getAdminLoginStatus, logoutAdmin, verifyAdminLogin } from '../utils/adminAuth';
import AdminLoginModal from './admin/AdminLoginModal';
import idl from '../idl.json';

// Debugging: Verifikasi IDL
console.log("Loaded IDL version:", idl.version);
console.log("IDL includes deleteConcert:", idl.instructions.some(instr => instr.name === "deleteConcert"));

// Gradient text component untuk konsistensi
const GradientText = ({ text, className = "" }) => {
    return (
        <span className={`text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 ${className}`}>
            {text}
        </span>
    );
};

// Card component yang konsisten dengan FeaturedConcertsSection yang diupdate
const ConcertCard = ({ concert, index, isAdminUser, onDeleteConcert, onEditConcert }) => {
    // Array of gradient backgrounds for tickets
    const previewImages = [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='0' x2='0' y1='0' y2='100%25' gradientTransform='rotate(240)'%3E%3Cstop offset='0' stop-color='%234338ca'/%3E%3Cstop offset='1' stop-color='%23a855f7'/%3E%3C/linearGradient%3E%3Cpattern patternUnits='userSpaceOnUse' id='b' width='300' height='250' x='0' y='0' viewBox='0 0 1080 900'%3E%3Cg fill-opacity='0.05'%3E%3Cpolygon fill='%23444' points='90 150 0 300 180 300'/%3E%3Cpolygon points='90 150 180 0 0 0'/%3E%3Cpolygon fill='%23AAA' points='270 150 360 0 180 0'/%3E%3Cpolygon fill='%23DDD' points='450 150 360 300 540 300'/%3E%3Cpolygon fill='%23999' points='450 150 540 0 360 0'/%3E%3Cpolygon points='630 150 540 300 720 300'/%3E%3Cpolygon fill='%23DDD' points='630 150 720 0 540 0'/%3E%3Cpolygon fill='%23444' points='810 150 720 300 900 300'/%3E%3Cpolygon fill='%23FFF' points='810 150 900 0 720 0'/%3E%3Cpolygon fill='%23DDD' points='990 150 900 300 1080 300'/%3E%3Cpolygon fill='%23444' points='990 150 1080 0 900 0'/%3E%3Cpolygon fill='%23DDD' points='90 450 0 600 180 600'/%3E%3Cpolygon points='90 450 180 300 0 300'/%3E%3Cpolygon fill='%23666' points='270 450 180 600 360 600'/%3E%3Cpolygon fill='%23AAA' points='270 450 360 300 180 300'/%3E%3Cpolygon fill='%23DDD' points='450 450 360 600 540 600'/%3E%3Cpolygon fill='%23999' points='450 450 540 300 360 300'/%3E%3Cpolygon fill='%23999' points='630 450 540 600 720 600'/%3E%3Cpolygon fill='%23FFF' points='630 450 720 300 540 300'/%3E%3Cpolygon points='810 450 720 600 900 600'/%3E%3Cpolygon fill='%23DDD' points='810 450 900 300 720 300'/%3E%3Cpolygon fill='%23AAA' points='990 450 900 600 1080 600'/%3E%3Cpolygon fill='%23444' points='990 450 1080 300 900 300'/%3E%3Cpolygon fill='%23222' points='90 750 0 900 180 900'/%3E%3Cpolygon points='270 750 180 900 360 900'/%3E%3Cpolygon fill='%23DDD' points='270 750 360 600 180 600'/%3E%3Cpolygon points='450 750 540 600 360 600'/%3E%3Cpolygon points='630 750 540 900 720 900'/%3E%3Cpolygon fill='%23444' points='630 750 720 600 540 600'/%3E%3Cpolygon fill='%23AAA' points='810 750 720 900 900 900'/%3E%3Cpolygon fill='%23666' points='810 750 900 600 720 600'/%3E%3Cpolygon fill='%23999' points='990 750 900 900 1080 900'/%3E%3Cpolygon fill='%23999' points='180 0 90 150 270 150'/%3E%3Cpolygon fill='%23444' points='360 0 270 150 450 150'/%3E%3Cpolygon fill='%23FFF' points='540 0 450 150 630 150'/%3E%3Cpolygon points='900 0 810 150 990 150'/%3E%3Cpolygon fill='%23222' points='0 300 -90 450 90 450'/%3E%3Cpolygon fill='%23FFF' points='0 300 90 150 -90 150'/%3E%3Cpolygon fill='%23FFF' points='180 300 90 450 270 450'/%3E%3Cpolygon fill='%23666' points='180 300 270 150 90 150'/%3E%3Cpolygon fill='%23222' points='360 300 270 450 450 450'/%3E%3Cpolygon fill='%23FFF' points='360 300 450 150 270 150'/%3E%3Cpolygon fill='%23444' points='540 300 450 450 630 450'/%3E%3Cpolygon fill='%23222' points='540 300 630 150 450 150'/%3E%3Cpolygon fill='%23AAA' points='720 300 630 450 810 450'/%3E%3Cpolygon fill='%23666' points='720 300 810 150 630 150'/%3E%3Cpolygon fill='%23FFF' points='900 300 810 450 990 450'/%3E%3Cpolygon fill='%23999' points='900 300 990 150 810 150'/%3E%3Cpolygon points='0 600 -90 750 90 750'/%3E%3Cpolygon fill='%23666' points='0 600 90 450 -90 450'/%3E%3Cpolygon fill='%23AAA' points='180 600 90 750 270 750'/%3E%3Cpolygon fill='%23444' points='180 600 270 450 90 450'/%3E%3Cpolygon fill='%23444' points='360 600 270 750 450 750'/%3E%3Cpolygon fill='%23999' points='360 600 450 450 270 450'/%3E%3Cpolygon fill='%23666' points='540 600 630 450 450 450'/%3E%3Cpolygon fill='%23222' points='720 600 630 750 810 750'/%3E%3Cpolygon fill='%23FFF' points='900 600 810 750 990 750'/%3E%3Cpolygon fill='%23222' points='900 600 990 450 810 450'/%3E%3Cpolygon fill='%23DDD' points='0 900 90 750 -90 750'/%3E%3Cpolygon fill='%23444' points='180 900 270 750 90 750'/%3E%3Cpolygon fill='%23FFF' points='360 900 450 750 270 750'/%3E%3Cpolygon fill='%23AAA' points='540 900 630 750 450 750'/%3E%3Cpolygon fill='%23FFF' points='720 900 810 750 630 750'/%3E%3Cpolygon fill='%23222' points='900 900 990 750 810 750'/%3E%3Cpolygon fill='%23222' points='1080 300 990 450 1170 450'/%3E%3Cpolygon fill='%23FFF' points='1080 300 1170 150 990 150'/%3E%3Cpolygon points='1080 600 990 750 1170 750'/%3E%3Cpolygon fill='%23666' points='1080 600 1170 450 990 450'/%3E%3Cpolygon fill='%23DDD' points='1080 900 1170 750 990 750'/%3E%3C/g%3E%3C/pattern%3E%3C/defs%3E%3Crect x='0' y='0' fill='url(%23a)' width='100%25' height='100%25'/%3E%3Crect x='0' y='0' fill='url(%23b)' width='100%25' height='100%25'/%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 800 800'%3E%3Cdefs%3E%3CradialGradient id='a' cx='400' cy='400' r='50%25' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%236d28d9'/%3E%3Cstop offset='1' stop-color='%23312e81'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='400' cy='400' r='70%25' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23A855F7'/%3E%3Cstop offset='1' stop-color='%23312E81'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect fill='url(%23a)' width='800' height='800'/%3E%3Cg fill-opacity='0.3'%3E%3Ccircle fill='url(%23b)' cx='267.5' cy='61' r='300'/%3E%3Ccircle fill='url(%23b)' cx='532.5' cy='61' r='300'/%3E%3Ccircle fill='url(%23b)' cx='400' cy='30' r='300'/%3E%3C/g%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='0' x2='0' y1='0' y2='100%25' gradientTransform='rotate(240)'%3E%3Cstop offset='0' stop-color='%232563eb'/%3E%3Cstop offset='1' stop-color='%236d28d9'/%3E%3C/linearGradient%3E%3Cpattern patternUnits='userSpaceOnUse' id='b' width='540' height='450' x='0' y='0' viewBox='0 0 1080 900'%3E%3Cg fill-opacity='0.1'%3E%3Cpolygon fill='%23444' points='90 150 0 300 180 300'/%3E%3Cpolygon points='90 150 180 0 0 0'/%3E%3Cpolygon fill='%23AAA' points='270 150 360 0 180 0'/%3E%3Cpolygon fill='%23DDD' points='450 150 360 300 540 300'/%3E%3Cpolygon fill='%23999' points='450 150 540 0 360 0'/%3E%3Cpolygon points='630 150 540 300 720 300'/%3E%3Cpolygon fill='%23DDD' points='630 150 720 0 540 0'/%3E%3Cpolygon fill='%23444' points='810 150 720 300 900 300'/%3E%3Cpolygon fill='%23FFF' points='810 150 900 0 720 0'/%3E%3Cpolygon fill='%23DDD' points='990 150 900 300 1080 300'/%3E%3Cpolygon fill='%23444' points='990 150 1080 0 900 0'/%3E%3Cpolygon fill='%23DDD' points='90 450 0 600 180 600'/%3E%3Cpolygon points='90 450 180 300 0 300'/%3E%3Cpolygon fill='%23666' points='270 450 180 600 360 600'/%3E%3Cpolygon fill='%23AAA' points='270 450 360 300 180 300'/%3E%3Cpolygon fill='%23DDD' points='450 450 360 600 540 600'/%3E%3Cpolygon fill='%23999' points='450 450 540 300 360 300'/%3E%3Cpolygon fill='%23999' points='630 450 540 600 720 600'/%3E%3Cpolygon fill='%23FFF' points='630 450 720 300 540 300'/%3E%3Cpolygon points='810 450 720 600 900 600'/%3E%3Cpolygon fill='%23DDD' points='810 450 900 300 720 300'/%3E%3Cpolygon fill='%23AAA' points='990 450 900 600 1080 600'/%3E%3Cpolygon fill='%23444' points='990 450 1080 300 900 300'/%3E%3Cpolygon fill='%23222' points='90 750 0 900 180 900'/%3E%3Cpolygon points='270 750 180 900 360 900'/%3E%3Cpolygon fill='%23DDD' points='270 750 360 600 180 600'/%3E%3Cpolygon points='450 750 540 600 360 600'/%3E%3Cpolygon points='630 750 540 900 720 900'/%3E%3Cpolygon fill='%23444' points='630 750 720 600 540 600'/%3E%3Cpolygon fill='%23AAA' points='810 750 720 900 900 900'/%3E%3Cpolygon fill='%23666' points='810 750 900 600 720 600'/%3E%3Cpolygon fill='%23999' points='990 750 900 900 1080 900'/%3E%3Cpolygon fill='%23999' points='180 0 90 150 270 150'/%3E%3Cpolygon fill='%23444' points='360 0 270 150 450 150'/%3E%3Cpolygon fill='%23FFF' points='540 0 450 150 630 150'/%3E%3Cpolygon points='900 0 810 150 990 150'/%3E%3Cpolygon fill='%23222' points='0 300 -90 450 90 450'/%3E%3Cpolygon fill='%23FFF' points='0 300 90 150 -90 150'/%3E%3Cpolygon fill='%23FFF' points='180 300 90 450 270 450'/%3E%3Cpolygon fill='%23666' points='180 300 270 150 90 150'/%3E%3Cpolygon fill='%23222' points='360 300 270 450 450 450'/%3E%3Cpolygon fill='%23FFF' points='360 300 450 150 270 150'/%3E%3Cpolygon fill='%23444' points='540 300 450 450 630 450'/%3E%3Cpolygon fill='%23222' points='540 300 630 150 450 150'/%3E%3Cpolygon fill='%23AAA' points='720 300 630 450 810 450'/%3E%3Cpolygon fill='%23666' points='720 300 810 150 630 150'/%3E%3Cpolygon fill='%23FFF' points='900 300 810 450 990 450'/%3E%3Cpolygon fill='%23999' points='900 300 990 150 810 150'/%3E%3Cpolygon points='0 600 -90 750 90 750'/%3E%3Cpolygon fill='%23666' points='0 600 90 450 -90 450'/%3E%3Cpolygon fill='%23AAA' points='180 600 90 750 270 750'/%3E%3Cpolygon fill='%23444' points='180 600 270 450 90 450'/%3E%3Cpolygon fill='%23444' points='360 600 270 750 450 750'/%3E%3Cpolygon fill='%23999' points='360 600 450 450 270 450'/%3E%3Cpolygon fill='%23666' points='540 600 630 450 450 450'/%3E%3Cpolygon fill='%23222' points='720 600 630 750 810 750'/%3E%3Cpolygon fill='%23FFF' points='900 600 810 750 990 750'/%3E%3Cpolygon fill='%23222' points='900 600 990 450 810 450'/%3E%3Cpolygon fill='%23DDD' points='0 900 90 750 -90 750'/%3E%3Cpolygon fill='%23444' points='180 900 270 750 90 750'/%3E%3Cpolygon fill='%23FFF' points='360 900 450 750 270 750'/%3E%3Cpolygon fill='%23AAA' points='540 900 630 750 450 750'/%3E%3Cpolygon fill='%23FFF' points='720 900 810 750 630 750'/%3E%3Cpolygon fill='%23222' points='900 900 990 750 810 750'/%3E%3Cpolygon fill='%23222' points='1080 300 990 450 1170 450'/%3E%3Cpolygon fill='%23FFF' points='1080 300 1170 150 990 150'/%3E%3Cpolygon points='1080 600 990 750 1170 750'/%3E%3Cpolygon fill='%23666' points='1080 600 1170 450 990 450'/%3E%3Cpolygon fill='%23DDD' points='1080 900 1170 750 990 750'/%3E%3C/g%3E%3C/pattern%3E%3C/defs%3E%3Crect x='0' y='0' fill='url(%23a)' width='100%25' height='100%25'/%3E%3Crect x='0' y='0' fill='url(%23b)' width='100%25' height='100%25'/%3E%3C/svg%3E"
    ];

    // Pilih gambar preview secara acak berdasarkan index
    const imgIndex = parseInt(index) % previewImages.length;
    const previewImage = previewImages[imgIndex];

    // Fungsi untuk memformat ID
    const formatId = (id) => {
        if (id.startsWith('static-')) {
            return id.replace('static-', '');
        }
        // Untuk public key, tampilkan hanya 4 karakter awal dan akhir
        if (id.length > 10) {
            return `${id.slice(0, 4)}...${id.slice(-4)}`;
        }
        return id;
    };

    return (
        <motion.div
            className="shadow-xl rounded-lg overflow-hidden hover:shadow-2xl hover:shadow-purple-500/20 transition-all hover:-translate-y-2 duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
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
                        {/* Judul konser di tengah */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <h3 className="text-white text-xl font-bold px-4 text-center">{concert.name}</h3>
                        </div>

                        {/* Badge limited tickets */}
                        {concert.available < (concert.total * 0.3) && (
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
                            <span className="text-white text-sm font-medium">{concert.date}</span>
                        </div>

                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400 text-sm">Available</span>
                            <div className="flex items-center">
                                <span className="text-white text-sm font-medium mr-2">{concert.available} / {concert.total}</span>
                                {/* Progress bar untuk ketersediaan tiket */}
                                <div className="w-14 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-pink-500"
                                        style={{ width: `${(concert.available / concert.total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer dengan logo dan ID */}
                    <div className="flex justify-between items-center mb-3">
                        <div className="bg-purple-900/50 border border-purple-700/50 rounded-full w-7 h-7 flex items-center justify-center">
                            <span className="text-purple-300/80 text-xs">M</span>
                        </div>
                        <div className="text-right">
                            <div className="text-gray-300/80 text-xs font-bold">
                                #{formatId(concert.id)}
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-2">
                        <Link
                            to={`/concert/${concert.id}`}
                            className="block w-full bg-gradient-to-br from-indigo-600 to-purple-600 p-0.5 rounded-lg hover:shadow-lg hover:shadow-purple-500/20 transition duration-300"
                        >
                            <div className="bg-gray-900 text-white text-center py-2 rounded-md text-sm font-medium hover:bg-gray-800/90 transition duration-300">
                                View Details
                            </div>
                        </Link>

                        <Link
                            to={`/mint-ticket/${concert.id}`}
                            className="block w-full bg-gradient-to-br from-pink-500 to-purple-600 p-0.5 rounded-lg hover:shadow-lg hover:shadow-pink-500/20 transition duration-300"
                        >
                            <div className="bg-gray-900 text-white text-center py-2 rounded-md text-sm font-medium hover:bg-gray-800/90 transition duration-300">
                                Mint Ticket
                            </div>
                        </Link>

                        {/* Admin-only buttons */}
                        {isAdminUser && (
                            <>
                                {/* Edit button for both static and blockchain concerts */}
                                <button
                                    onClick={() => onEditConcert(concert)}
                                    className="block w-full bg-gradient-to-br from-blue-500 to-blue-600 p-0.5 rounded-lg hover:shadow-lg hover:shadow-blue-500/20 transition duration-300"
                                >
                                    <div className="bg-gray-900 text-white text-center py-2 rounded-md text-sm font-medium hover:bg-gray-800/90 transition duration-300">
                                        Edit Concert
                                    </div>
                                </button>

                                {/* Delete button only for non-static concerts */}
                                {!concert.id.startsWith('static-') && (
                                    <button
                                        onClick={() => onDeleteConcert(concert.id)}
                                        className="block w-full bg-gradient-to-br from-red-500 to-red-600 p-0.5 rounded-lg hover:shadow-lg hover:shadow-red-500/20 transition duration-300"
                                    >
                                        <div className="bg-gray-900 text-white text-center py-2 rounded-md text-sm font-medium hover:bg-gray-800/90 transition duration-300">
                                            Delete Concert
                                        </div>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// Modal for editing concerts
const EditConcertModal = ({ isOpen, concert, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [venue, setVenue] = useState('');
    const [date, setDate] = useState('');
    const [totalTickets, setTotalTickets] = useState(0);
    const [category, setCategory] = useState('uncategorized');

    // Initialize form when modal opens with concert data
    useEffect(() => {
        if (concert) {
            setName(concert.name || '');
            setVenue(concert.venue || '');
            setDate(concert.date || '');
            setTotalTickets(concert.total || 0);
            setCategory(concert.category || 'uncategorized');
        }
    }, [concert]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        // Prepare updated concert data
        const updatedConcert = {
            ...concert,
            name,
            venue,
            date,
            total: parseInt(totalTickets),
            available: parseInt(totalTickets) - (concert.total - concert.available),
            category
        };

        onSave(updatedConcert);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-purple-700 rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Edit Concert</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-300 mb-2">Concert Name</label>
                        <input
                            type="text"
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-300 mb-2">Venue</label>
                        <input
                            type="text"
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={venue}
                            onChange={(e) => setVenue(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-300 mb-2">Date</label>
                        <input
                            type="text"
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            placeholder="e.g., Apr 25, 2025"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-300 mb-2">Total Tickets</label>
                        <input
                            type="number"
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={totalTickets}
                            onChange={(e) => setTotalTickets(e.target.value)}
                            min="1"
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-300 mb-2">Category</label>
                        <select
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option value="uncategorized">Uncategorized</option>
                            <option value="festival">Festival</option>
                            <option value="rock">Rock</option>
                            <option value="jazz">Jazz</option>
                            <option value="classical">Classical</option>
                            <option value="hiphop">Hip Hop</option>
                            <option value="electronic">Electronic</option>
                            <option value="pop">Pop</option>
                            <option value="country">Country</option>
                        </select>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-2 px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ConcertList = () => {
    const [loading, setLoading] = useState(true);
    const [concerts, setConcerts] = useState([]);
    const [filter, setFilter] = useState('all');
    const wallet = useWallet();
    const [isAdminUser, setIsAdminUser] = useState(false);
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [concertToEdit, setConcertToEdit] = useState(null);

    // Static concerts data (fallback)
    const staticConcerts = [
        { id: 'static-1', name: 'EDM Festival 2025', venue: 'Metaverse Arena', date: 'Jun 15, 2025', available: 120, total: 500, category: 'festival' },
        { id: 'static-2', name: 'Rock Legends', venue: 'Crypto Stadium', date: 'Jul 22, 2025', available: 75, total: 300, category: 'rock' },
        { id: 'static-3', name: 'Jazz Night', venue: 'NFT Concert Hall', date: 'Aug 05, 2025', available: 50, total: 100, category: 'jazz' },
        { id: 'static-4', name: 'Classical Symphony', venue: 'Blockchain Theater', date: 'Sep 18, 2025', available: 25, total: 400, category: 'classical' },
        { id: 'static-5', name: 'Hip Hop Summit', venue: 'Web3 Arena', date: 'Oct 10, 2025', available: 200, total: 800, category: 'hiphop' },
        { id: 'static-6', name: 'Electronic Music Night', venue: 'Digital Dome', date: 'Nov 20, 2025', available: 150, total: 500, category: 'electronic' },
        { id: 'static-7', name: 'Pop Sensation', venue: 'Virtual Stadium', date: 'Dec 12, 2025', available: 300, total: 1000, category: 'pop' },
        { id: 'static-8', name: 'Country Music Festival', venue: 'Decentralized Park', date: 'Jan 25, 2026', available: 100, total: 350, category: 'country' },
    ];

    // Check if user is admin
    useEffect(() => {
        if (wallet.connected) {
            const admin = isAdmin(wallet);
            setIsAdminUser(admin);

            // If user is admin, check if they're already logged in
            if (admin) {
                setIsAdminLoggedIn(getAdminLoginStatus());
            } else {
                setIsAdminLoggedIn(false);
            }
        } else {
            setIsAdminUser(false);
            setIsAdminLoggedIn(false);
        }
    }, [wallet.connected, wallet.publicKey]);

    // Function to handle admin login
    const handleAdminLogin = () => {
        setShowLoginModal(true);
    };

    // Debug function to check available smart contract methods
    const debugSmartContract = async () => {
        if (!wallet.connected) {
            alert("Please connect your wallet first");
            return;
        }

        try {
            const program = getProgram(wallet);
            console.log("Available program methods:", Object.keys(program.methods));
            alert("Smart contract methods logged to console. Please check browser console.");
        } catch (error) {
            console.error("Error debugging smart contract:", error);
            alert("Failed to debug smart contract: " + error.message);
        }
    };

    // Function to handle admin logout
    const handleAdminLogout = () => {
        logoutAdmin();
        setIsAdminLoggedIn(false);
    };

    // Function to handle successful login
    const handleLoginSuccess = () => {
        setIsAdminLoggedIn(true);
    };

    // Function to handle edit concert action
    const handleEditConcert = (concert) => {
        setConcertToEdit(concert);
        setShowEditModal(true);
    };

    // Function to save edited concert
    const handleSaveConcert = async (updatedConcert) => {
        try {
            if (!isAdminLoggedIn) {
                alert("You must be logged in as admin to edit concerts");
                return;
            }

            // For blockchain concerts
            if (!updatedConcert.id.startsWith('static-')) {
                const program = getProgram(wallet);

                // Call smart contract to update concert
                await program.methods
                    .updateConcert(
                        updatedConcert.name,
                        updatedConcert.venue,
                        updatedConcert.date,
                        updatedConcert.total
                    )
                    .accounts({
                        authority: wallet.publicKey,
                        concert: new PublicKey(updatedConcert.id),
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();

                alert("Concert updated successfully!");
            } else {
                // For static concerts, just update in local state
                const updatedConcerts = concerts.map(c =>
                    c.id === updatedConcert.id ? updatedConcert : c
                );
                setConcerts(updatedConcerts);
                alert("Concert updated successfully (local only)!");
            }

            // Close the modal and refresh concerts
            setShowEditModal(false);
            fetchConcerts();

        } catch (error) {
            console.error("Error updating concert:", error);
            alert("Failed to update concert: " + error.message);
        }
    };

    // Function to delete concert (admin only)
    const handleDeleteConcert = async (concertId) => {
        if (!isAdminLoggedIn) {
            alert("You must be logged in as admin to delete concerts");
            return;
        }

        try {
            const confirmDelete = window.confirm("Are you sure you want to delete this concert?");
            if (!confirmDelete) return;

            // Jika ini adalah static concert, tangani secara lokal saja
            if (concertId.startsWith('static-')) {
                // Filter static concerts
                const updatedConcerts = concerts.filter(c => c.id !== concertId);
                setConcerts(updatedConcerts);
                alert("Static concert deleted successfully (local only)!");
                return;
            }

            const program = getProgram(wallet);

            console.log("Deleting concert with ID:", concertId);
            console.log("Using authority:", wallet.publicKey.toString());
            console.log("Program methods available:", Object.keys(program.methods));

            // Directly use deleteConcert method (now we know it exists)
            await program.methods
                .deleteConcert()
                .accounts({
                    authority: wallet.publicKey,
                    concert: new PublicKey(concertId),
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            alert("Concert deleted successfully!");

            // Refresh concert list
            fetchConcerts();
        } catch (error) {
            console.error("Error deleting concert:", error);
            alert("Failed to delete concert: " + error.message);
        }
    };

    // Fetch concerts from blockchain
    const fetchConcerts = async () => {
        try {
            setLoading(true);

            if (!wallet.connected || !wallet.publicKey) {
                console.log("Wallet not connected, using static data");
                setConcerts(staticConcerts);
                setLoading(false);
                return;
            }

            const program = getProgram(wallet);

            // Fetch all concert accounts
            const concertAccounts = await program.account.concert.all();
            console.log("Fetched concert accounts:", concertAccounts);

            // Format concert data
            const blockchainConcerts = concertAccounts.map((account) => {
                const concert = account.account;
                return {
                    id: account.publicKey.toString(),
                    name: concert.name,
                    venue: concert.venue,
                    date: concert.date,
                    available: concert.totalTickets - (concert.ticketsSold || 0), // Note: Using ticketsSold from IDL
                    total: concert.totalTickets,
                    category: 'uncategorized',
                    creator: concert.authority.toString()
                };
            });

            // Remove duplicates based on name, venue, and date
            const uniqueBlockchainConcerts = blockchainConcerts.filter((concert, index, self) =>
                index === self.findIndex((c) => (
                    c.name === concert.name &&
                    c.venue === concert.venue &&
                    c.date === concert.date
                ))
            );

            // Combine blockchain concerts with static concerts
            const allConcerts = [...uniqueBlockchainConcerts, ...staticConcerts];
            setConcerts(allConcerts);

        } catch (error) {
            console.error("Error fetching concerts:", error);
            setConcerts(staticConcerts);
        } finally {
            setLoading(false);
        }
    };

    // Load concerts on component mount and when wallet connection changes
    useEffect(() => {
        fetchConcerts();
    }, [wallet.connected, wallet.publicKey]);

    // Handle filter change
    const handleFilterChange = (e) => {
        setFilter(e.target.value);
    };

    // Filter concerts based on category
    const filteredConcerts = filter === 'all'
        ? concerts
        : concerts.filter(concert => concert.category === filter);

    return (
        <div className="pt-20 pb-16 px-4 bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white flex items-center">
                        Available <GradientText text="Concerts" className="ml-2 mr-2" />
                        {isAdminLoggedIn && (
                            <span className="ml-3 text-sm bg-purple-600 px-3 py-1 rounded-full">
                                Admin Mode
                            </span>
                        )}
                    </h1>

                    <div className="flex items-center space-x-4">
                        {/* Admin login/logout buttons */}
                        {isAdminUser && (
                            isAdminLoggedIn ? (
                                <>
                                    <button
                                        onClick={debugSmartContract}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Debug Contract
                                    </button>
                                    <button
                                        onClick={handleAdminLogout}
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Logout Admin
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleAdminLogin}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    Login as Admin
                                </button>
                            )
                        )}

                        {/* Refresh button */}
                        <button
                            onClick={fetchConcerts}
                            className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            Refresh
                        </button>

                        {/* Filter dropdown */}
                        <select
                            className="bg-gray-800 text-white rounded-lg border border-gray-700 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            onChange={handleFilterChange}
                            value={filter}
                        >
                            <option value="all">All Genres</option>
                            <option value="festival">Festival</option>
                            <option value="rock">Rock</option>
                            <option value="jazz">Jazz</option>
                            <option value="classical">Classical</option>
                            <option value="hiphop">Hip Hop</option>
                            <option value="electronic">Electronic</option>
                            <option value="pop">Pop</option>
                            <option value="country">Country</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-96">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                ) : filteredConcerts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {filteredConcerts.map((concert, index) => (
                            <ConcertCard
                                key={concert.id}
                                concert={concert}
                                index={index}
                                isAdminUser={isAdminLoggedIn}
                                onDeleteConcert={handleDeleteConcert}
                                onEditConcert={handleEditConcert}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <h3 className="text-2xl text-white mb-4">No concerts found</h3>
                        <p className="text-gray-400">Try changing your filters or check back later.</p>
                        {!wallet.connected && (
                            <p className="text-gray-400 mt-4">
                                Connect your wallet to see blockchain concerts
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Admin Login Modal */}
            <AdminLoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onLoginSuccess={handleLoginSuccess}
            />

            {/* Edit Concert Modal */}
            <EditConcertModal
                isOpen={showEditModal}
                concert={concertToEdit}
                onClose={() => setShowEditModal(false)}
                onSave={handleSaveConcert}
            />
        </div>
    );
};

export default ConcertList;