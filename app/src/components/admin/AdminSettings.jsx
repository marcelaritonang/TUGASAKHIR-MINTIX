import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import AuthService from '../../services/AuthService';
import LoadingSpinner from '../common/LoadingSpinner';

const AdminSettings = () => {
    const { publicKey } = useWallet();
    const navigate = useNavigate();

    const [adminInfo, setAdminInfo] = useState({
        wallet: '',
        loginTime: new Date(),
        expiryTime: new Date(Date.now() + 4 * 60 * 60 * 1000)
    });
    const [approvalStats, setApprovalStats] = useState({
        pending: 0,
        infoRequested: 0,
        approved: 0,
        rejected: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Inisialisasi di component mount
    useEffect(() => {
        const initAuth = async () => {
            try {
                setLoading(true);

                // Pastikan token tersedia
                if (!AuthService.getToken()) {
                    const success = await AuthService.loginTest();
                    if (!success) {
                        setError('Autentikasi gagal. Silakan hubungkan wallet Anda.');
                        setLoading(false);
                        return;
                    }
                }

                // Cek status admin
                const { isAdmin } = await AuthService.checkAdminStatus();
                if (!isAdmin) {
                    setError('Anda tidak memiliki hak akses admin.');
                    setLoading(false);
                    return;
                }

                // Ambil data admin
                const walletAddress = publicKey?.toString() || '2upQ693dMu2PEdBp6JKnxRBWEimdbmbgNCvncbasP6TU';

                // Set admin info
                setAdminInfo({
                    wallet: walletAddress,
                    loginTime: new Date(),
                    expiryTime: new Date(Date.now() + 4 * 60 * 60 * 1000)
                });

                // Ambil statistik
                await fetchConcertStats();

                setLoading(false);
            } catch (err) {
                console.error('Error initializing admin settings:', err);
                setError('Gagal memuat informasi admin: ' + err.message);
                setLoading(false);
            }
        };

        initAuth();
    }, [publicKey]);

    // Ambil statistik konser dari API
    const fetchConcertStats = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/admin/concerts/stats', {
                headers: {
                    'x-auth-token': AuthService.getToken()
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Fetched concert stats:', data);

                setApprovalStats({
                    pending: data.pending || 0,
                    infoRequested: data.infoRequested || 0,
                    approved: data.approved || 0,
                    rejected: data.rejected || 0
                });
            } else {
                // Jika API gagal, ambil dari endpoint alternatif
                await fetchConcertCounts();
            }
        } catch (err) {
            console.error('Error fetching concert stats:', err);
            await fetchConcertCounts();
        }
    };

    // Metode alternatif: hitung masing-masing status
    const fetchConcertCounts = async () => {
        try {
            // Ambil pending concerts
            const pendingResponse = await fetch('http://localhost:5000/api/admin/concerts/pending', {
                headers: {
                    'x-auth-token': AuthService.getToken()
                }
            });

            // Ambil approved concerts
            const approvedResponse = await fetch('http://localhost:5000/api/admin/concerts/approved', {
                headers: {
                    'x-auth-token': AuthService.getToken()
                }
            });

            // Ambil rejected concerts
            const rejectedResponse = await fetch('http://localhost:5000/api/admin/concerts/rejected', {
                headers: {
                    'x-auth-token': AuthService.getToken()
                }
            });

            // Proses data
            const pending = pendingResponse.ok ? await pendingResponse.json() : [];
            const approved = approvedResponse.ok ? await approvedResponse.json() : [];
            const rejected = rejectedResponse.ok ? await rejectedResponse.json() : [];

            // Hitung info requested
            const infoRequested = pending.filter(c => c.status === 'info_requested').length;
            const pendingCount = pending.filter(c => c.status === 'pending').length;

            // Update statistik
            setApprovalStats({
                pending: pendingCount,
                infoRequested: infoRequested,
                approved: Array.isArray(approved) ? approved.length : 0,
                rejected: Array.isArray(rejected) ? rejected.length : 0
            });
        } catch (err) {
            console.error('Error fetching concert counts:', err);
            // Fallback ke localStorage jika API tetap gagal
            console.log('Falling back to localStorage for stats');

            const pendingConcerts = JSON.parse(localStorage.getItem('pendingConcerts') || '[]');
            const infoRequested = pendingConcerts.filter(c => c.status === 'info_requested').length;
            const pendingCount = pendingConcerts.filter(c => c.status === 'pending').length;

            const approvedConcerts = JSON.parse(localStorage.getItem('concertDetails') || '[]');
            const rejectedConcerts = JSON.parse(localStorage.getItem('rejectedConcerts') || '[]');

            setApprovalStats({
                pending: pendingCount,
                infoRequested: infoRequested,
                approved: approvedConcerts.length,
                rejected: rejectedConcerts.length
            });
        }
    };

    // Perpanjang sesi admin
    const handleExtendSession = async () => {
        try {
            // Perpanjang sesi dengan loginTest baru
            const success = await AuthService.loginTest();

            if (success) {
                // Update waktu kedaluwarsa
                setAdminInfo(prev => ({
                    ...prev,
                    expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
                }));

                setSuccessMessage('Sesi diperpanjang selama 24 jam');
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                throw new Error('Failed to extend session');
            }
        } catch (err) {
            console.error('Error extending session:', err);
            setError('Gagal memperpanjang sesi: ' + err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    // Logout
    const handleLogout = () => {
        AuthService.removeToken();
        navigate('/');
    };

    // Format waktu tersisa
    const formatTimeRemaining = () => {
        const now = new Date();
        const expiryTime = new Date(adminInfo.expiryTime);

        const diffMs = expiryTime - now;
        if (diffMs <= 0) return 'Kedaluwarsa';

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours} jam, ${minutes} menit`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[300px]">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8 text-white">Admin Settings</h1>

            {error && (
                <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {successMessage && (
                <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 mb-6">
                    <p className="text-green-400">{successMessage}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Admin Info Card */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">Admin Information</h2>

                    <div className="space-y-4">
                        <div>
                            <p className="text-gray-400 text-sm">Admin Wallet</p>
                            <p className="text-white font-mono text-sm break-all">{adminInfo.wallet}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Login Time</p>
                            <p className="text-white">{adminInfo.loginTime.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Session Expires In</p>
                            <p className="text-white">{formatTimeRemaining()}</p>
                        </div>

                        <div className="pt-4 flex space-x-3">
                            <button
                                onClick={handleExtendSession}
                                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
                            >
                                Extend Session
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                {/* Approval Stats Card */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">Approval Statistics</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-yellow-900/20 rounded-lg p-4 text-center">
                            <p className="text-yellow-500 text-3xl font-bold">{approvalStats.pending}</p>
                            <p className="text-gray-300 text-sm">Pending</p>
                        </div>
                        <div className="bg-blue-900/20 rounded-lg p-4 text-center">
                            <p className="text-blue-500 text-3xl font-bold">{approvalStats.infoRequested}</p>
                            <p className="text-gray-300 text-sm">Info Requested</p>
                        </div>
                        <div className="bg-green-900/20 rounded-lg p-4 text-center">
                            <p className="text-green-500 text-3xl font-bold">{approvalStats.approved}</p>
                            <p className="text-gray-300 text-sm">Approved</p>
                        </div>
                        <div className="bg-red-900/20 rounded-lg p-4 text-center">
                            <p className="text-red-500 text-3xl font-bold">{approvalStats.rejected}</p>
                            <p className="text-gray-300 text-sm">Rejected</p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg font-medium text-white mb-3">Quick Actions</h3>
                        <div className="space-y-3">
                            <Link
                                to="/admin/approval"
                                className="block w-full text-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
                            >
                                Go to Approval Page
                            </Link>
                            <button
                                onClick={fetchConcertStats}
                                className="block w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                                Refresh Statistics
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dev Tools */}
            <div className="mt-8 bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">Development Tools</h2>
                <p className="text-gray-400 mb-4">These actions are for testing and development purposes only.</p>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={async () => {
                            try {
                                // Coba buat test concert
                                const response = await fetch('http://localhost:5000/api/concerts', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'x-auth-token': AuthService.getToken()
                                    },
                                    body: JSON.stringify({
                                        name: "Test Concert " + new Date().toLocaleDateString(),
                                        venue: "Test Venue",
                                        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 hari dari sekarang
                                        description: "Test concert created from admin panel",
                                        category: "Rock",
                                        sections: [
                                            {
                                                name: "VIP",
                                                price: 500,
                                                totalSeats: 100,
                                                availableSeats: 100
                                            },
                                            {
                                                name: "Regular",
                                                price: 100,
                                                totalSeats: 200,
                                                availableSeats: 200
                                            }
                                        ],
                                        totalTickets: 300
                                    })
                                });

                                if (response.ok) {
                                    setSuccessMessage('Test concert created successfully');
                                    fetchConcertStats();
                                } else {
                                    throw new Error(`Failed to create test concert: ${response.status}`);
                                }
                            } catch (err) {
                                console.error('Error creating test concert:', err);
                                setError('Failed to create test concert: ' + err.message);
                            }
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                    >
                        Create Test Concert
                    </button>

                    <button
                        onClick={() => {
                            localStorage.removeItem('pendingConcerts');
                            localStorage.removeItem('concertDetails');
                            localStorage.removeItem('rejectedConcerts');
                            fetchConcertStats();
                            setSuccessMessage('All concert data cleared from localStorage');
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    >
                        Clear Local Concert Data
                    </button>

                    <button
                        onClick={async () => {
                            const success = await AuthService.loginTest();
                            if (success) {
                                setSuccessMessage('Login test successful');
                            } else {
                                setError('Login test failed');
                            }
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                        Test Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;