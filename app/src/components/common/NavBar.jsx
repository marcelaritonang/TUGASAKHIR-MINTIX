import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';

const NavBar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

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

    // Close mobile menu when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    const isActive = (path) => {
        return location.pathname === path ? "border-b-2 border-purple-500" : "";
    };

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
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

            {/* Mobile menu, show/hide based on menu state */}
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