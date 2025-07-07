//admin/AdminApprovedConcerts.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import AuthService from '../../services/AuthService';
import LoadingSpinner from '../common/LoadingSpinner';
// Tambahkan di bagian atas setelah import yang sudah ada
import { API } from '../../config/environment';

const AdminApprovedConcerts = () => {
    const { publicKey } = useWallet();
    const [approvedConcerts, setApprovedConcerts] = useState([]);
    const [selectedConcert, setSelectedConcert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Load approved concerts when component mounts
    useEffect(() => {
        const initAuth = async () => {
            try {
                if (!AuthService.isAuthenticated()) {
                    await AuthService.loginTest();
                }
                fetchApprovedConcerts();
            } catch (err) {
                console.error('Auth initialization error:', err);
            }
        };

        initAuth();
    }, [publicKey]);

    const fetchApprovedConcerts = async () => {
        try {
            setLoading(true);
            setError('');

            // Make sure we have a token
            if (!AuthService.getToken()) {
                await AuthService.loginTest();
            }

            // Fetch approved concerts
            // AFTER:
            const response = await fetch(`${API.getApiUrl()}/admin/concerts/approved`, {
                headers: {
                    'x-auth-token': AuthService.getToken()
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch approved concerts: ${response.status}`);
            }

            const data = await response.json();
            console.log('Approved concerts:', data);

            // Set concerts data
            setApprovedConcerts(Array.isArray(data) ? data : []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching approved concerts:', err);
            setError(`Failed to load approved concerts: ${err.message}`);
            setLoading(false);
        }
    };

    // Handle concert selection
    const handleSelectConcert = (concert) => {
        setSelectedConcert(concert);
    };

    // Format date for display
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    // Filter concerts by search term
    const filteredConcerts = approvedConcerts.filter(concert =>
        concert.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        concert.venue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        concert.creator?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[300px]">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-white">Approved Concerts</h1>

            {error && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6">
                    <p className="text-red-500">{error}</p>
                </div>
            )}

            <div className="flex justify-between items-center mb-4">
                <div className="relative w-64">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search concerts..."
                        className="w-full bg-gray-700 text-white px-4 py-2 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                    <svg className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <button
                    onClick={fetchApprovedConcerts}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left panel - Approved concerts list */}
                <div className="lg:col-span-1 bg-gray-800 rounded-lg p-4 h-[calc(100vh-240px)] overflow-y-auto">
                    <h2 className="text-xl font-semibold text-white mb-4">
                        Approved Concerts ({filteredConcerts.length})
                    </h2>

                    {filteredConcerts.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-gray-400">No approved concerts found.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredConcerts.map(concert => (
                                <div
                                    key={concert._id}
                                    onClick={() => handleSelectConcert(concert)}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedConcert?._id === concert._id
                                        ? 'bg-green-900/30 border border-green-500'
                                        : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                                        }`}
                                >
                                    <div>
                                        <h3 className="font-medium text-white">{concert.name}</h3>
                                        <p className="text-sm text-gray-400">Venue: {concert.venue}</p>
                                        <p className="text-xs text-gray-500">Creator: {concert.creator.substring(0, 8)}...</p>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500">
                                        Date: {formatDate(concert.date)}
                                    </div>
                                    {concert.approvalHistory && concert.approvalHistory.length > 0 && (
                                        <div className="mt-1 text-xs text-green-400">
                                            Approved: {formatDate(concert.approvalHistory[concert.approvalHistory.length - 1].timestamp)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right panel - Concert details */}
                <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 h-[calc(100vh-240px)] overflow-y-auto">
                    {!selectedConcert ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <h3 className="text-xl text-gray-400 mb-2">No Concert Selected</h3>
                            <p className="text-gray-500 max-w-md">
                                Select a concert from the list to view details
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{selectedConcert.name}</h2>
                                    <p className="text-gray-400">Concert ID: {selectedConcert._id}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-sm bg-green-900/30 text-green-500">
                                    Approved
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-gray-400 text-sm">Venue</p>
                                        <p className="text-white">{selectedConcert.venue}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">Date</p>
                                        <p className="text-white">{formatDate(selectedConcert.date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">Creator</p>
                                        <p className="text-white font-mono text-sm">{selectedConcert.creator}</p>
                                    </div>
                                    {selectedConcert.approvalHistory && selectedConcert.approvalHistory.length > 0 && (
                                        <>
                                            <div>
                                                <p className="text-gray-400 text-sm">Approved By</p>
                                                <p className="text-white font-mono text-sm">
                                                    {selectedConcert.approvalHistory[selectedConcert.approvalHistory.length - 1].admin}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-sm">Approval Date</p>
                                                <p className="text-white">
                                                    {formatDate(selectedConcert.approvalHistory[selectedConcert.approvalHistory.length - 1].timestamp)}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div>
                                    <p className="text-gray-400 text-sm mb-2">Ticket Sections</p>
                                    <div className="space-y-2">
                                        {selectedConcert.sections && selectedConcert.sections.map((section, index) => (
                                            <div key={index} className="bg-gray-700/50 p-2 rounded">
                                                <div className="flex justify-between">
                                                    <span className="text-white">{section.name}</span>
                                                    <span className="text-gray-300">
                                                        {section.availableSeats}/{section.totalSeats} seats
                                                    </span>
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
                                <p className="text-gray-400 text-sm mb-2">Description</p>
                                <div className="bg-gray-700/30 p-3 rounded text-white">
                                    {selectedConcert.description || "No description provided"}
                                </div>
                            </div>

                            {selectedConcert.posterUrl && (
                                <div className="mb-6">
                                    <p className="text-gray-400 text-sm mb-2">Poster Image</p>
                                    <img
                                        src={selectedConcert.posterUrl}
                                        alt="Concert poster"
                                        className="max-h-40 rounded border border-gray-700"
                                    />
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="border-t border-gray-700 pt-4 mt-6">
                                <div className="flex justify-end space-x-3">
                                    <Link
                                        to={`/mint-ticket/${selectedConcert._id}`}
                                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition duration-200"
                                    >
                                        Go to Mint Page
                                    </Link>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminApprovedConcerts;