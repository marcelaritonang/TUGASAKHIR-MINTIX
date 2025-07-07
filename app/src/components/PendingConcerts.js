// src/components/PendingConcerts.js
import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import { API } from '../config/environment';
// Komponen LoadingSpinner
const LoadingSpinner = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
);

const PendingConcerts = () => {
    const [concerts, setConcerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitInfo, setSubmitInfo] = useState('');
    const [submittingId, setSubmittingId] = useState(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);

    const wallet = useWallet();
    const navigate = useNavigate();

    // Fungsi untuk mengambil konser dalam status pending
    const fetchPendingConcerts = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            // Cek autentikasi terlebih dahulu
            if (!wallet.connected) {
                setLoading(false);
                return;
            }

            // Pastikan user terautentikasi
            if (!AuthService.isAuthenticated()) {
                try {
                    console.log("Attempting to authenticate for fetching pending concerts");
                    const success = await AuthService.loginTest(wallet.publicKey.toString());
                    setAuthenticated(success);

                    if (!success) {
                        throw new Error("Authentication failed");
                    }
                } catch (authErr) {
                    console.error("Authentication error:", authErr);
                    setError("Failed to authenticate. Please try again.");
                    setLoading(false);
                    return;
                }
            } else {
                setAuthenticated(true);
            }

            // Verifikasi bahwa fungsi ada
            if (typeof ApiService.getMyPendingConcerts !== 'function') {
                console.error("getMyPendingConcerts is not a function in ApiService");
                // Coba alternatif
                const alternativeData = await alternativeFetch();
                setConcerts(alternativeData || []);
                setLoading(false);
                return;
            }

            // Ambil data konser
            console.log("Calling ApiService.getMyPendingConcerts()");
            const data = await ApiService.getMyPendingConcerts();
            console.log("Received data:", data);
            setConcerts(data || []);
        } catch (err) {
            console.error('Error fetching pending concerts:', err);
            setError(err.message || 'Failed to load pending concerts');

            // Coba alternatif
            try {
                const alternativeData = await alternativeFetch();
                setConcerts(alternativeData || []);
            } catch (altErr) {
                console.error("Alternative fetch also failed:", altErr);
            }
        } finally {
            setLoading(false);
        }
    }, [wallet.connected, wallet.publicKey]);

    // Alternatif untuk mengambil data jika ApiService.getMyPendingConcerts tidak tersedia
    const alternativeFetch = async () => {
        try {
            console.log("Using alternative fetch method");
            const token = localStorage.getItem('auth_token');

            if (!token) {
                throw new Error("No auth token available");
            }

            const response = await fetch(`${API.getApiUrl()}/concerts/me/pending`, {
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch concerts: ${response.status}`);
            }

            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error("Alternative fetch error:", err);
            // Coba ambil dari cache
            const cached = localStorage.getItem('myPendingConcerts');
            return cached ? JSON.parse(cached) : [];
        }
    };

    // Load pending concerts when wallet is connected
    useEffect(() => {
        if (wallet.connected) {
            fetchPendingConcerts();
        } else {
            setLoading(false);
        }
    }, [wallet.connected, fetchPendingConcerts]);

    // Submit additional information
    const handleSubmitInfo = async (concertId) => {
        if (!submitInfo.trim()) {
            setError('Please enter additional information');
            return;
        }

        setSubmitLoading(true);
        try {
            // Cek jika ApiService.submitAdditionalInfo ada
            if (typeof ApiService.submitAdditionalInfo !== 'function') {
                throw new Error("submitAdditionalInfo method not available");
            }

            await ApiService.submitAdditionalInfo(concertId, submitInfo);

            // Update local state
            setConcerts(prev =>
                prev.map(concert =>
                    concert._id === concertId
                        ? { ...concert, additionalInfo: submitInfo, status: 'pending' }
                        : concert
                )
            );

            // Reset form
            setSubmitInfo('');
            setSubmittingId(null);
            setError('');
        } catch (err) {
            console.error('Error submitting info:', err);
            setError(err.message || 'Failed to submit additional information');
        } finally {
            setSubmitLoading(false);
        }
    };

    // Format date
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    // Get status badge color
    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'info_requested':
                return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'approved':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'rejected':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    // Render wallet not connected state
    if (!wallet.connected) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gray-800 p-8 rounded-lg text-center">
                        <h3 className="text-xl text-white mb-6">Connect your wallet to view pending concerts</h3>
                        <button
                            onClick={() => navigate('/create-concert')}
                            className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white py-2 px-6 rounded-lg"
                        >
                            Create a Concert First
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4 flex flex-col justify-center items-center">
                <LoadingSpinner />
                <p className="text-white mt-4">Loading pending concerts...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">My Pending Concerts</h1>

                    <button
                        onClick={fetchPendingConcerts}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6">
                        <p className="text-red-500">{error}</p>
                    </div>
                )}

                {concerts.length === 0 ? (
                    <div className="bg-gray-800 p-8 rounded-lg text-center">
                        <p className="text-gray-400 mb-6">You don't have any pending concerts yet.</p>
                        <button
                            onClick={() => navigate('/create-concert')}
                            className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white py-2 px-6 rounded-lg"
                        >
                            Create Your First Concert
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {concerts.map((concert) => (
                            <div
                                key={concert._id}
                                className="bg-gray-800 p-6 rounded-lg border border-gray-700"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{concert.name}</h2>
                                        <p className="text-gray-400">{concert.venue} • {formatDate(concert.date)}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm border ${getStatusBadgeColor(concert.status)}`}>
                                        {concert.status === 'info_requested' ? 'Information Requested' : concert.status}
                                    </span>
                                </div>

                                {concert.description && (
                                    <p className="text-gray-300 mb-4">{concert.description}</p>
                                )}

                                {/* Show sections info */}
                                <div className="mb-4">
                                    <h3 className="text-white font-semibold mb-2">Ticket Sections:</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {concert.sections && concert.sections.length > 0 ? (
                                            concert.sections.map((section, index) => (
                                                <div key={index} className="bg-gray-700/50 p-3 rounded">
                                                    <p className="text-white">{section.name}</p>
                                                    <p className="text-gray-400 text-sm">
                                                        {section.totalSeats} seats • {section.price} SOL
                                                    </p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-400">No sections defined</p>
                                        )}
                                    </div>
                                </div>

                                {/* Admin feedback */}
                                {concert.adminFeedback && concert.adminFeedback.length > 0 && (
                                    <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-4">
                                        <h3 className="text-blue-400 font-semibold mb-2">Admin Feedback:</h3>
                                        <div className="space-y-2">
                                            {concert.adminFeedback.map((feedback, index) => (
                                                <div key={index} className="text-gray-300">
                                                    <p className="text-sm">{feedback.message}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(feedback.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Submit additional info for requested information */}
                                {concert.status === 'info_requested' && (
                                    <div className="mt-4">
                                        {submittingId === concert._id ? (
                                            <div className="space-y-4">
                                                <textarea
                                                    value={submitInfo}
                                                    onChange={(e) => setSubmitInfo(e.target.value)}
                                                    placeholder="Enter additional information..."
                                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                                    rows="4"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleSubmitInfo(concert._id)}
                                                        disabled={submitLoading}
                                                        className={`bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg ${submitLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {submitLoading ? (
                                                            <span className="flex items-center">
                                                                <LoadingSpinner />
                                                                <span className="ml-2">Submitting...</span>
                                                            </span>
                                                        ) : 'Submit Info'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSubmittingId(null);
                                                            setSubmitInfo('');
                                                        }}
                                                        className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setSubmittingId(concert._id)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
                                            >
                                                Submit Additional Information
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Creation info */}
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    <p className="text-sm text-gray-500">
                                        Created on {new Date(concert.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingConcerts;