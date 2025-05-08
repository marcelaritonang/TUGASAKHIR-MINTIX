// src/components/admin/AdminLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { getAdminAuth, verifyAdminLogin, ADMIN_PUBLIC_KEYS } from '../../utils/adminAuth';
import AdminNavbar from './AdminNavbar';
import AdminLoginModal from './AdminLoginModal';

const AdminLayout = () => {
    const { publicKey, connected } = useWallet();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [error, setError] = useState('');
    const [pendingCount, setPendingCount] = useState(0);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // Verifikasi autentikasi admin dan ambil data pending concerts
    useEffect(() => {
        const checkAdminAndFetchData = async () => {
            setIsLoading(true);

            try {
                // Check if wallet is connected
                if (!connected || !publicKey) {
                    console.log("No wallet connected, showing login modal");
                    setError('Please connect your wallet to access admin features');
                    setIsAuthorized(false);
                    setShowLoginModal(true);
                    setIsLoading(false);
                    return;
                }

                const walletAddress = publicKey.toString();
                console.log("Connected wallet:", walletAddress);
                console.log("Admin wallets:", ADMIN_PUBLIC_KEYS);

                // Check if current wallet is in admin list
                const isAdminWallet = ADMIN_PUBLIC_KEYS.includes(walletAddress);
                console.log("Is admin wallet?", isAdminWallet);

                // Get admin auth from localStorage
                const adminAuth = getAdminAuth();
                console.log("Current admin auth:", adminAuth);

                // If not admin wallet or no valid session
                if (!isAdminWallet) {
                    console.log("Not an admin wallet");
                    setError('You do not have permission to access the admin area');
                    setIsAuthorized(false);
                    setShowLoginModal(true);
                    setIsLoading(false);
                    return;
                }

                // If admin wallet but no session, create one
                if (!adminAuth) {
                    console.log("Creating admin session for wallet:", walletAddress);
                    const success = verifyAdminLogin({ publicKey });

                    if (!success) {
                        setError('Failed to create admin session');
                        setIsAuthorized(false);
                        setIsLoading(false);
                        return;
                    }
                }

                // Admin authenticated, get pending concerts
                const pendingConcerts = JSON.parse(localStorage.getItem('pendingConcerts') || '[]');
                setPendingCount(pendingConcerts.length);

                // Debug log
                console.log("AdminLayout: Authorized access", {
                    wallet: walletAddress,
                    pendingCount: pendingConcerts.length
                });

                setIsAuthorized(true);
                setError('');
                setIsLoading(false);
            } catch (err) {
                console.error("Error in admin layout:", err);
                setError('An error occurred while loading admin data');
                setIsAuthorized(false);
                setIsLoading(false);
            }
        };

        checkAdminAndFetchData();
    }, [publicKey, connected, navigate]);

    // Handle successful login from modal
    const handleLoginSuccess = () => {
        setIsAuthorized(true);
        setShowLoginModal(false);

        // Fetch pending concerts count
        const pendingConcerts = JSON.parse(localStorage.getItem('pendingConcerts') || '[]');
        setPendingCount(pendingConcerts.length);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 mt-20">
                <div className="flex justify-center items-center min-h-[300px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
                </div>
            </div>
        );
    }

    // Show login modal if not authorized
    if (!isAuthorized) {
        return (
            <div className="container mx-auto px-4 py-8 mt-20">
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-8 text-center">
                    <h2 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h2>
                    <p className="text-white mb-6">{error || 'You do not have permission to access this area'}</p>
                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={() => navigate('/')}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                            Return to Homepage
                        </button>
                        <button
                            onClick={() => setShowLoginModal(true)}
                            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                        >
                            Admin Login
                        </button>
                    </div>
                </div>

                <AdminLoginModal
                    isOpen={showLoginModal}
                    onClose={() => setShowLoginModal(false)}
                    onSuccess={handleLoginSuccess}
                />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 pt-20 pb-8">
            {/* Admin panel header */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <h1 className="text-2xl font-bold text-white mb-2">Admin Panel</h1>
                <p className="text-gray-400">
                    {pendingCount > 0 ? (
                        <>You have <span className="text-yellow-500 font-bold">{pendingCount}</span> concert{pendingCount !== 1 ? 's' : ''} waiting for approval.</>
                    ) : (
                        <>No pending concerts to approve at this time.</>
                    )}
                </p>
            </div>

            {/* Admin navbar */}
            <AdminNavbar pendingCount={pendingCount} />

            {/* Admin content area */}
            <div className="bg-gray-800 rounded-lg p-6 my-4">
                <Outlet />
            </div>
        </div>
    );
};

export default AdminLayout;