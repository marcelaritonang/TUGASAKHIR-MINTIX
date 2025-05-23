// src/components/common/NavBar.jsx - Updated with Marketplace Link
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { ADMIN_PUBLIC_KEYS } from '../../utils/adminAuth';

const NavBar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const { publicKey, connected } = useWallet();

    // Admin dan pending states
    const [isAdminUser, setIsAdminUser] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Cek status admin dan pending concerts saat wallet berubah atau location berubah
    useEffect(() => {
        if (connected && publicKey) {
            // Check if current wallet is in admin list
            const walletAddress = publicKey.toString();
            console.log("NavBar checking admin status for wallet:", walletAddress);

            // Direct check against admin list
            const adminStatus = ADMIN_PUBLIC_KEYS.includes(walletAddress);
            console.log("NavBar: Is admin wallet?", adminStatus);

            setIsAdminUser(adminStatus);

            // Jika wallet terdeteksi sebagai admin, tidak perlu cek pending concerts
            if (!adminStatus) {
                // Cek jumlah pending concerts untuk user
                const pendingConcerts = JSON.parse(localStorage.getItem('pendingConcerts') || '[]');
                const userPendingConcerts = pendingConcerts.filter(
                    concert => concert.creator === publicKey.toString()
                );
                setPendingCount(userPendingConcerts.length);
            } else {
                setPendingCount(0); // Admin tidak menampilkan pending count
            }
        } else {
            setIsAdminUser(false);
            setPendingCount(0);
        }
    }, [publicKey, connected, location.pathname]);

    // Close mobile menu when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    const isActive = (path) => {
        return location.pathname === path ? "border-b-2 border-purple-500" : "";
    };

    // Fungsi untuk menentukan apakah admin link aktif
    const isAdminActive = () => {
        return location.pathname.startsWith('/admin') ? "border-b-2 border-yellow-500" : "";
    };

    return (
        <nav className={`fixed top-0 left-0 right-0 z-10 transition-all duration-300 ${isScrolled
            ? 'bg-gray-900 shadow-md shadow-purple-900/20'
            : 'bg-gray-900 bg-opacity-80 backdrop-blur-sm'
            }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex-shrink-0">
                        <Link to="/" className="flex items-center">
                            <motion.div
                                whileHover={{
                                    scale: 1.1,
                                    rotate: 5
                                }}
                                className="flex items-center"
                            >
                                <img
                                    src="/logo-m.png"
                                    alt="Mintix Logo"
                                    className="h-9 w-9 mr-2"
                                />
                                <span className="text-2xl font-bold text-white">
                                    Min<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 animate-gradient-x">tix</span>
                                </span>
                            </motion.div>
                        </Link>
                    </div>

                    <div className="hidden md:flex items-center space-x-4">
                        <Link
                            to="/collections"
                            className={`text-white hover:text-purple-400 px-3 py-2 text-sm font-medium transition-all ${isActive('/collections')}`}
                        >
                            Collections
                        </Link>
                        <Link
                            to="/explore"
                            className={`text-white hover:text-purple-400 px-3 py-2 text-sm font-medium transition-all ${isActive('/explore')}`}
                        >
                            Explore
                        </Link>
                        <Link
                            to="/mint-ticket"
                            className={`text-white hover:text-purple-400 px-3 py-2 text-sm font-medium transition-all ${isActive('/mint-ticket')}`}
                        >
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">Mint</span>
                        </Link>
                        {/* NEW: Link to Marketplace */}
                        <Link
                            to="/marketplace"
                            className={`text-white hover:text-purple-400 px-3 py-2 text-sm font-medium transition-all ${isActive('/marketplace')}`}
                        >
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-blue-500">Marketplace</span>
                        </Link>
                        <Link
                            to="/my-tickets"
                            className={`text-white hover:text-purple-400 px-3 py-2 text-sm font-medium transition-all ${isActive('/my-tickets')}`}
                        >
                            My Tickets
                        </Link>
                        <Link
                            to="/create-concert"
                            className={`text-white hover:text-purple-400 px-3 py-2 text-sm font-medium transition-all ${isActive('/create-concert')}`}
                        >
                            Create
                        </Link>

                        {/* Admin Link - hanya tampil jika user adalah admin */}
                        {connected && publicKey && isAdminUser && (
                            <Link
                                to="/admin/approval"
                                className={`text-white hover:text-yellow-400 px-3 py-2 text-sm font-medium transition-all ${isAdminActive()}`}
                            >
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-500">Admin</span>
                            </Link>
                        )}

                        {/* Pending Link - hanya tampil jika user bukan admin & memiliki konser pending */}
                        {connected && publicKey && !isAdminUser && pendingCount > 0 && (
                            <Link
                                to="/pending-concerts"
                                className={`text-white hover:text-purple-400 px-3 py-2 text-sm font-medium transition-all relative ${isActive('/pending-concerts')}`}
                            >
                                Pending
                                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {pendingCount}
                                </span>
                            </Link>
                        )}

                        <div className="ml-4">
                            <WalletMultiButton className="!bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 !transition-all !shadow-lg hover:!shadow-purple-600/20" />
                        </div>
                    </div>

                    <div className="md:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="text-white focus:outline-none"
                        >
                            {isMobileMenuOpen ? (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isMobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="md:hidden bg-gray-800 shadow-lg shadow-purple-900/10 pb-4 px-2"
                >
                    <div className="pt-2 pb-3 space-y-1">
                        <Link
                            to="/collections"
                            className={`block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-gray-700 ${isActive('/collections') ? 'bg-gray-700 bg-opacity-50 border-l-4 border-purple-500' : ''}`}
                        >
                            Collections
                        </Link>
                        <Link
                            to="/explore"
                            className={`block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-gray-700 ${isActive('/explore') ? 'bg-gray-700 bg-opacity-50 border-l-4 border-purple-500' : ''}`}
                        >
                            Explore
                        </Link>
                        <Link
                            to="/mint-ticket"
                            className={`block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-700 ${isActive('/mint-ticket') ? 'bg-gray-700 bg-opacity-50 border-l-4 border-pink-500' : ''}`}
                        >
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">Mint Ticket</span>
                        </Link>
                        {/* NEW: Marketplace Link for Mobile */}
                        <Link
                            to="/marketplace"
                            className={`block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-700 ${isActive('/marketplace') ? 'bg-gray-700 bg-opacity-50 border-l-4 border-teal-500' : ''}`}
                        >
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-blue-500">Marketplace</span>
                        </Link>
                        <Link
                            to="/my-tickets"
                            className={`block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-gray-700 ${isActive('/my-tickets') ? 'bg-gray-700 bg-opacity-50 border-l-4 border-purple-500' : ''}`}
                        >
                            My Tickets
                        </Link>
                        <Link
                            to="/create-concert"
                            className={`block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-gray-700 ${isActive('/create-concert') ? 'bg-gray-700 bg-opacity-50 border-l-4 border-purple-500' : ''}`}
                        >
                            Create
                        </Link>

                        {/* Admin Link Mobile - hanya tampil jika user adalah admin */}
                        {connected && publicKey && isAdminUser && (
                            <Link
                                to="/admin/approval"
                                className={`block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-700 ${location.pathname.startsWith('/admin') ? 'bg-gray-700 bg-opacity-50 border-l-4 border-yellow-500' : ''}`}
                            >
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-500">Admin Panel</span>
                            </Link>
                        )}

                        {/* Pending Link Mobile - hanya tampil jika user bukan admin & memiliki konser pending */}
                        {connected && publicKey && !isAdminUser && pendingCount > 0 && (
                            <Link
                                to="/pending-concerts"
                                className={`block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-gray-700 relative ${isActive('/pending-concerts') ? 'bg-gray-700 bg-opacity-50 border-l-4 border-purple-500' : ''}`}
                            >
                                Pending Concerts
                                <span className="ml-2 inline-flex bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs rounded-full px-2 py-0.5">
                                    {pendingCount}
                                </span>
                            </Link>
                        )}

                        <div className="px-3 py-2">
                            <WalletMultiButton className="!bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 !w-full !justify-center" />
                        </div>
                    </div>
                </motion.div>
            )}
        </nav>
    );
};

export default NavBar;