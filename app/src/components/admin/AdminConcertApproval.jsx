//components/admin/AdminConcertApproval.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import AuthService from '../../services/AuthService';
import ApiService from '../../services/ApiService';
import LoadingSpinner from '../common/LoadingSpinner';
import { useConcerts } from '../../context/ConcertContext';

const AdminConcertApproval = () => {
    const { publicKey } = useWallet();
    const {
        pendingConcerts,
        loadAdminPendingConcerts,
        approveConcert,
        rejectConcert,
        requestMoreInfo
    } = useConcerts();

    const [selectedConcert, setSelectedConcert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState('');
    const [requestInfo, setRequestInfo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [authStatus, setAuthStatus] = useState({ token: null, isAdmin: false });
    const [refreshInterval, setRefreshInterval] = useState(null);

    // Ref untuk mencegah duplikasi loading
    const loadingRef = useRef(false);

    // Inisialisasi Auth
    useEffect(() => {
        const initAuth = async () => {
            try {
                setLoading(true);

                // Cek token
                const token = AuthService.getToken();

                // Jika tidak ada token, coba login otomatis
                if (!token) {
                    console.log('No token found, attempting auto-login');
                    const loginSuccess = await AuthService.loginTest();

                    if (!loginSuccess) {
                        setError('Failed to auto-login. Please connect your wallet and try again.');
                        setLoading(false);
                        return;
                    }
                }

                // Cek status admin
                const { isAdmin } = await AuthService.checkAdminStatus();
                setAuthStatus({ token: AuthService.getToken(), isAdmin });

                if (!isAdmin) {
                    setError('You do not have admin privileges.');
                    setLoading(false);
                    return;
                }

                // Fetch pending concerts
                await loadPendingConcerts();

                // Setup polling interval untuk refresh otomatis
                setupPolling();
            } catch (err) {
                console.error('Auth initialization error:', err);
                setError(`Authentication error: ${err.message}`);
                setLoading(false);
            }
        };

        initAuth();

        // Cleanup ketika component unmount
        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [publicKey]);

    // Setup polling untuk refresh otomatis
    const setupPolling = () => {
        // Bersihkan interval sebelumnya jika ada
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }

        // Setup interval baru - cek setiap 15 detik
        const interval = setInterval(() => {
            if (!loadingRef.current && !isSubmitting) {
                console.log("Auto-refreshing pending concerts...");
                loadPendingConcerts(true); // true = silent refresh
            }
        }, 15000);

        setRefreshInterval(interval);
    };

    const loadPendingConcerts = async (silent = false) => {
        // Hindari loading berulang
        if (loadingRef.current) return;

        loadingRef.current = true;
        if (!silent) setLoading(true);

        try {
            // Make sure we have a token
            if (!AuthService.getToken()) {
                await AuthService.loginTest();
            }

            // Gunakan fungsi dari Context
            await loadAdminPendingConcerts();

            if (!silent) setLoading(false);
            loadingRef.current = false;

            // Reset selected concert jika tidak ada lagi dalam daftar
            if (selectedConcert && !pendingConcerts.find(c => c.id === selectedConcert._id)) {
                setSelectedConcert(null);
            }
        } catch (err) {
            console.error('Error fetching pending concerts:', err);
            setError(`Failed to load pending concerts: ${err.message}`);
            if (!silent) setLoading(false);
            loadingRef.current = false;
        }
    };

    // Handle concert selection
    const handleSelectConcert = (concert) => {
        setSelectedConcert(concert);
        setFeedback('');
        setRequestInfo('');
        setError('');
    };

    // Handle approve concert
    const handleApproveConcert = async () => {
        if (!selectedConcert) return;

        try {
            setIsSubmitting(true);
            setError('');

            // Gunakan fungsi dari Context
            await approveConcert(selectedConcert._id || selectedConcert.id, feedback || 'Approved');

            // Refresh daftar setelah approval
            await loadPendingConcerts();

            // Reset selected concert karena sudah diapprove
            setSelectedConcert(null);

            // Setelah approval, bersihkan cache agar frontend diperbarui
            ApiService.clearConcertCache();

            // Show success message
            alert('Concert approved successfully!');
        } catch (err) {
            console.error('Error approving concert:', err);
            setError(`Failed to approve concert: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle reject concert
    const handleRejectConcert = async () => {
        if (!selectedConcert) return;

        if (!feedback.trim()) {
            setError('Please provide feedback explaining the rejection reason');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');

            // Gunakan fungsi dari Context
            await rejectConcert(selectedConcert._id || selectedConcert.id, feedback);

            // Refresh daftar
            await loadPendingConcerts();

            // Reset selected concert karena sudah ditolak
            setSelectedConcert(null);

            // Show success message
            alert('Concert rejected successfully!');
        } catch (err) {
            console.error('Error rejecting concert:', err);
            setError(`Failed to reject concert: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle request more info
    const handleRequestInfo = async () => {
        if (!selectedConcert) return;

        if (!requestInfo.trim()) {
            setError('Please specify what additional information is needed');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');

            // Gunakan fungsi dari Context
            await requestMoreInfo(selectedConcert._id || selectedConcert.id, requestInfo);

            // Refresh daftar
            await loadPendingConcerts();

            // Reset form
            setRequestInfo('');

            // Show success message
            alert('Information request sent successfully!');
        } catch (err) {
            console.error('Error requesting information:', err);
            setError(`Failed to request information: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRefresh = async () => {
        // Clear any errors
        setError('');

        // Re-login and fetch data
        try {
            await AuthService.loginTest();
            await loadPendingConcerts();
        } catch (err) {
            setError(`Refresh failed: ${err.message}`);
        }
    };

    // Format date for display
    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleString();
        } catch (err) {
            return dateString || 'Unknown date';
        }
    };

    if (loading && pendingConcerts.length === 0) {
        return (
            <div className="flex justify-center items-center min-h-[300px]">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 text-white">Admin Panel</h1>

            {/* Auth Debug Info */}
            <div className="bg-gray-800 p-4 rounded-lg mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">Authentication Status</h2>
                <p className="text-gray-300">Token: {authStatus.token ? 'Available' : 'Not available'}</p>
                <p className="text-gray-300">Admin: {authStatus.isAdmin ? 'Yes' : 'No'}</p>
                <div className="mt-2">
                    <button
                        onClick={handleRefresh}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Refresh Auth
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
                    <p className="text-red-400">{error}</p>
                    <button
                        onClick={handleRefresh}
                        className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Pending Concerts */}
            <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-white">Pending Concerts</h2>
                    <button
                        onClick={() => loadPendingConcerts()}
                        disabled={loading}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-10">
                        <div className="inline-block w-8 h-8 border-4 border-t-purple-500 border-gray-200 rounded-full animate-spin"></div>
                        <p className="mt-2 text-gray-400">Loading pending concerts...</p>
                    </div>
                ) : pendingConcerts.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-gray-400">No pending concerts to review.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left panel - Concert list */}
                        <div className="lg:col-span-1 bg-gray-700 p-4 rounded-lg max-h-[600px] overflow-y-auto">
                            {pendingConcerts.map(concert => (
                                <div
                                    key={concert._id || concert.id}
                                    onClick={() => handleSelectConcert(concert)}
                                    className={`p-3 mb-2 rounded cursor-pointer ${selectedConcert && (selectedConcert._id === (concert._id || concert.id) || selectedConcert.id === (concert._id || concert.id))
                                        ? 'bg-yellow-800 border border-yellow-500'
                                        : 'bg-gray-800 hover:bg-gray-600'}`}
                                >
                                    <h3 className="font-medium text-white">{concert.name}</h3>
                                    <p className="text-sm text-gray-300">Venue: {concert.venue}</p>
                                    <p className="text-sm text-gray-300">Date: {formatDate(concert.date)}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-xs text-gray-400">By: {concert.creator.substring(0, 8)}...</span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${concert.status === 'info_requested'
                                            ? 'bg-yellow-800 text-yellow-200'
                                            : 'bg-blue-800 text-blue-200'
                                            }`}>
                                            {concert.status === 'info_requested' ? 'Info Requested' : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Right panel - Concert details & Action buttons */}
                        <div className="lg:col-span-2 bg-gray-700 p-6 rounded-lg">
                            {!selectedConcert ? (
                                <div className="text-center py-20">
                                    <p className="text-gray-300">Select a concert from the list to review</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-6">
                                        <h2 className="text-2xl font-bold text-white">{selectedConcert.name}</h2>
                                        <span className={`px-3 py-1 rounded-full text-sm ${selectedConcert.status === 'info_requested'
                                            ? 'bg-yellow-800 text-yellow-200'
                                            : 'bg-blue-800 text-blue-200'
                                            }`}>
                                            {selectedConcert.status === 'info_requested' ? 'Info Requested' : 'Pending'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <p className="text-gray-400 text-sm">Venue</p>
                                            <p className="text-white">{selectedConcert.venue}</p>

                                            <p className="text-gray-400 text-sm mt-3">Date</p>
                                            <p className="text-white">{formatDate(selectedConcert.date)}</p>

                                            <p className="text-gray-400 text-sm mt-3">Creator</p>
                                            <p className="text-white font-mono text-sm">{selectedConcert.creator}</p>
                                        </div>

                                        <div>
                                            <p className="text-gray-400 text-sm">Ticket Sections</p>
                                            <div className="space-y-2 mt-2">
                                                {selectedConcert.sections && selectedConcert.sections.map((section, index) => (
                                                    <div key={index} className="bg-gray-800 p-2 rounded">
                                                        <div className="flex justify-between">
                                                            <span className="text-white">{section.name}</span>
                                                            <span className="text-gray-300">{section.totalSeats} seats</span>
                                                        </div>
                                                        <div className="text-sm text-gray-400">
                                                            Price: {section.price} SOL
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <p className="text-gray-400 text-sm">Description</p>
                                        <div className="bg-gray-800 p-3 rounded text-white mt-2">
                                            {selectedConcert.description || "No description provided"}
                                        </div>
                                    </div>

                                    {/* Previous admin feedback */}
                                    {selectedConcert.approvalHistory && selectedConcert.approvalHistory.length > 0 && (
                                        <div className="mb-6">
                                            <p className="text-gray-400 text-sm">Previous Admin Feedback</p>
                                            <div className="space-y-2 mt-2">
                                                {selectedConcert.approvalHistory.map((history, index) => (
                                                    <div key={index} className="bg-blue-900/20 border border-blue-800/30 p-3 rounded">
                                                        <p className="text-blue-400 text-sm">
                                                            {formatDate(history.timestamp)} by {history.admin.substring(0, 8)}...
                                                        </p>
                                                        <p className="text-white">{history.message}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action form */}
                                    <div className="border-t border-gray-600 pt-6 mt-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">Approval Actions</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <div>
                                                <label className="block text-gray-300 text-sm mb-2">
                                                    Feedback / Notes
                                                </label>
                                                <textarea
                                                    value={feedback}
                                                    onChange={(e) => setFeedback(e.target.value)}
                                                    className="w-full bg-gray-800 text-white rounded p-3 border border-gray-600"
                                                    rows="4"
                                                    placeholder="Provide feedback for approval or rejection"
                                                ></textarea>
                                            </div>

                                            <div>
                                                <label className="block text-gray-300 text-sm mb-2">
                                                    Request Additional Information
                                                </label>
                                                <textarea
                                                    value={requestInfo}
                                                    onChange={(e) => setRequestInfo(e.target.value)}
                                                    className="w-full bg-gray-800 text-white rounded p-3 border border-gray-600"
                                                    rows="4"
                                                    placeholder="Specify what additional information is needed"
                                                ></textarea>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap justify-end gap-3">
                                            <button
                                                onClick={handleRequestInfo}
                                                disabled={!requestInfo.trim() || isSubmitting}
                                                className={`px-4 py-2 rounded ${requestInfo.trim() && !isSubmitting
                                                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                {isSubmitting ? 'Processing...' : 'Request Info'}
                                            </button>

                                            <button
                                                onClick={handleRejectConcert}
                                                disabled={!feedback.trim() || isSubmitting}
                                                className={`px-4 py-2 rounded ${feedback.trim() && !isSubmitting
                                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                {isSubmitting ? 'Processing...' : 'Reject'}
                                            </button>

                                            <button
                                                onClick={handleApproveConcert}
                                                disabled={isSubmitting}
                                                className={`px-4 py-2 rounded ${!isSubmitting
                                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                {isSubmitting ? 'Processing...' : 'Approve'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminConcertApproval;