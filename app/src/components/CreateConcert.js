// src/components/CreateConcert.jsx - COMPLETE FIXED VERSION

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getBalance } from '../utils/anchor';
import { motion } from 'framer-motion';
import LoadingSpinner from './common/LoadingSpinner';
import ErrorMessage from './common/ErrorMessage';

// Import API & Auth Services
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';

const CreateConcert = () => {
    // ✅ SMART API URL DETECTION - Works for localhost & production
    const getApiUrl = () => {
        // Priority 1: Environment variable
        if (process.env.REACT_APP_API_URL) {
            console.log('🔧 Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
            return process.env.REACT_APP_API_URL;
        }

        // Priority 2: Auto-detect based on domain
        const hostname = window.location.hostname;
        console.log('🔧 Auto-detecting API URL for hostname:', hostname);

        // Production detection (Vercel)
        if (hostname.includes('vercel.app') || hostname.includes('tugasakhir-mintix')) {
            console.log('🔧 ✅ Production detected → Using Railway backend');
            return 'https://tugasakhir-mintix-production.up.railway.app/api';
        }

        // Local development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            console.log('🔧 ✅ Localhost detected → Using local backend');
            return 'http://localhost:5000/api';
        }

        // Fallback to production
        console.log('🔧 ⚠️ Unknown environment → Using Railway backend');
        return 'https://tugasakhir-mintix-production.up.railway.app/api';
    };

    // ✅ GET API URL
    const API_BASE_URL = getApiUrl();

    // Basic concert info
    const [name, setName] = useState('');
    const [venue, setVenue] = useState('');
    const [date, setDate] = useState('');

    // Enhanced fields
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [posterImage, setPosterImage] = useState(null);
    const [posterPreview, setPosterPreview] = useState('');

    // Concert sections
    const [sections, setSections] = useState([
        { name: 'VIP', price: 0, totalSeats: 0, availableSeats: 0 },
        { name: 'Regular', price: 0, totalSeats: 0, availableSeats: 0 }
    ]);

    // UI states
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState(0);
    const [walletError, setWalletError] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [concertCreated, setConcertCreated] = useState(null);
    const [activeTab, setActiveTab] = useState('basic');

    // Verification and anti-spam states
    const [isVerified, setIsVerified] = useState(false);
    const [verificationStep, setVerificationStep] = useState(1);
    const [captchaVerified, setCaptchaVerified] = useState(false);
    const [agreementAccepted, setAgreementAccepted] = useState(false);

    // Backend integration states
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState('');

    const wallet = useWallet();
    const navigate = useNavigate();

    // Available categories
    const categories = ['festival', 'rock', 'jazz', 'classical', 'hiphop', 'electronic', 'pop', 'country', 'other'];

    // ✅ DEBUG LOGGING untuk environment
    useEffect(() => {
        console.log('🔧 CreateConcert Environment Debug:');
        console.log('   API_BASE_URL:', API_BASE_URL);
        console.log('   REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
        console.log('   Current hostname:', window.location.hostname);
        console.log('   NODE_ENV:', process.env.NODE_ENV);
    }, [API_BASE_URL]);

    // ✅ TEST API CONNECTIVITY
    useEffect(() => {
        const testConnection = async () => {
            try {
                console.log('🧪 Testing API connection...');
                const healthUrl = `${API_BASE_URL.replace('/api', '')}/health`;
                const response = await fetch(healthUrl);
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ API connection successful:', data.status);
                } else {
                    console.warn('⚠️ API health check failed:', response.status);
                }
            } catch (error) {
                console.error('❌ API connection test failed:', error.message);
            }
        };

        testConnection();
    }, [API_BASE_URL]);

    // Check authentication status when component mounts
    useEffect(() => {
        const checkAuth = async () => {
            const token = AuthService.getToken();
            if (token) {
                setToken(token);
                setIsAuthenticated(true);
            }
        };

        checkAuth();
    }, []);

    // Load balance when wallet connects
    useEffect(() => {
        const updateBalance = async () => {
            if (wallet && wallet.publicKey) {
                try {
                    const sol = await getBalance(wallet);
                    setBalance(sol);
                    setWalletError(null);
                } catch (error) {
                    console.error("Error updating balance:", error);
                    setWalletError("Couldn't fetch balance. Try refreshing the page.");
                }
            } else {
                setBalance(0);
            }
        };

        updateBalance();

        // Update balance every 10 seconds
        const interval = setInterval(() => {
            if (wallet && wallet.publicKey) {
                updateBalance();
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [wallet, wallet.publicKey]);

    // ✅ FIXED: Handle login with dynamic API URL
    const handleLogin = async () => {
        if (!wallet.connected || !wallet.publicKey) {
            setError('Please connect your wallet first');
            return;
        }

        setIsLoggingIn(true);
        setError('');

        try {
            // ✅ FIXED: Use dynamic API URL instead of hardcoded localhost
            const loginUrl = `${API_BASE_URL}/auth/login-test`;
            console.log('🔐 Attempting login with:', loginUrl);

            const response = await fetch(loginUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    wallet_address: wallet.publicKey.toString()
                })
            });

            console.log('🔐 Login response status:', response.status);

            if (!response.ok) {
                throw new Error(`Login failed: ${response.status}`);
            }

            const data = await response.json();

            // Store token
            if (data.token) {
                AuthService.setToken(data.token);
                setToken(data.token);
                setIsAuthenticated(true);
                console.log('✅ Logged in successfully');
            } else {
                throw new Error('No token received from server');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            setError(`Failed to authenticate: ${error.message}. Please check if backend is accessible.`);
        } finally {
            setIsLoggingIn(false);
        }
    };

    // Handle section changes
    const handleSectionChange = (index, field, value) => {
        const updatedSections = [...sections];

        // Convert to appropriate type
        if (field === 'price' || field === 'totalSeats') {
            value = parseFloat(value) || 0;
        }

        // For totalSeats, also update availableSeats to match
        if (field === 'totalSeats') {
            updatedSections[index].availableSeats = value;
        }

        updatedSections[index][field] = value;
        setSections(updatedSections);
    };

    // Add a new section
    const addSection = () => {
        setSections([
            ...sections,
            { name: '', price: 0, totalSeats: 0, availableSeats: 0 }
        ]);
    };

    // Remove a section
    const removeSection = (index) => {
        const updatedSections = [...sections];
        updatedSections.splice(index, 1);
        setSections(updatedSections);
    };

    // Handle poster image upload
    const handlePosterUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPosterImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPosterPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Simulate captcha verification
    const handleCaptchaVerification = () => {
        setLoading(true);
        setTimeout(() => {
            setCaptchaVerified(true);
            setVerificationStep(2);
            setLoading(false);
        }, 1500);
    };

    // Handle agreement acceptance
    const handleAgreementAcceptance = (e) => {
        setAgreementAccepted(e.target.checked);
        if (e.target.checked) {
            setIsVerified(true);
            setVerificationStep(3);
        } else {
            setIsVerified(false);
        }
    };

    // Validate form
    const validateForm = () => {
        // Basic validation
        if (!name || !venue || !date) {
            setError('Please fill all required fields');
            setActiveTab('basic');
            return false;
        }

        // Validate sections - remove empty sections
        const validSections = sections.filter(section =>
            section.name && section.totalSeats > 0 && section.price > 0
        );

        if (validSections.length === 0) {
            setError('You need to specify at least one valid section with name, price, and seats');
            setActiveTab('tickets');
            return false;
        }

        // Validate concert date (must be in the future)
        const concertDate = new Date(date);
        if (concertDate < new Date()) {
            setError('Concert date cannot be in the past');
            setActiveTab('basic');
            return false;
        }

        // Check verification
        if (!isVerified) {
            setError('Please complete the verification process first');
            return false;
        }

        setError('');
        return true;
    };

    // ✅ FIXED: Main function to create a concert with dynamic API URL
    const handleCreateConcert = async (e) => {
        e.preventDefault();

        if (!wallet.connected) {
            setError('Please connect your wallet first');
            return;
        }

        // Ensure user is authenticated
        if (!isAuthenticated) {
            setError('Please authenticate with your wallet first');
            handleLogin();
            return;
        }

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            // Filter out empty sections
            const validSections = sections.filter(section =>
                section.name && section.totalSeats > 0 && section.price > 0
            );

            // Calculate total tickets
            const totalTickets = validSections.reduce((sum, section) => sum + section.totalSeats, 0);

            // Create form data if uploading poster
            let formData = new FormData();

            formData.append('name', name);
            formData.append('venue', venue);
            formData.append('date', new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`).toISOString());
            formData.append('description', description);
            formData.append('category', category);
            formData.append('totalTickets', totalTickets);
            formData.append('sections', JSON.stringify(validSections));

            if (posterImage) {
                formData.append('posterImage', posterImage);
            }

            // ✅ FIXED: Send request to backend with dynamic URL
            const createUrl = `${API_BASE_URL}/concerts`;
            console.log('🎵 Sending POST request to:', createUrl);

            const response = await fetch(createUrl, {
                method: 'POST',
                headers: {
                    'x-auth-token': token
                },
                body: formData
            });

            console.log('🎵 Concert creation response status:', response.status);

            if (!response.ok) {
                let errorMessage = `Failed to create concert: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.msg || errorData.message || errorMessage;
                    console.error('🎵 Server error:', errorData);
                } catch (e) {
                    console.error('🎵 Could not parse error response');
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('🎵 Concert created successfully:', result);

            // Update UI
            setSuccess(true);
            setConcertCreated(result);

            // Reset form after success
            resetForm();

            // Redirect to pending concerts after delay
            setTimeout(() => {
                navigate('/pending-concerts');
            }, 3000);

        } catch (error) {
            console.error("❌ Error creating concert:", error);
            setError(error.message || "Failed to create concert. Please try again.");
            setSuccess(false);
        } finally {
            setLoading(false);
        }
    };

    // Reset form to initial state
    const resetForm = () => {
        setName('');
        setVenue('');
        setDate('');
        setDescription('');
        setCategory('');
        setPosterImage(null);
        setPosterPreview('');
        setActiveTab('basic');
        setSections([
            { name: 'VIP', price: 0, totalSeats: 0, availableSeats: 0 },
            { name: 'Regular', price: 0, totalSeats: 0, availableSeats: 0 }
        ]);
        setIsVerified(false);
        setVerificationStep(1);
        setCaptchaVerified(false);
        setAgreementAccepted(false);
    };

    // Render verification steps
    const renderVerificationStep = () => {
        switch (verificationStep) {
            case 1:
                return (
                    <div className="verification-step p-4 bg-gray-800 rounded mb-4">
                        <h3 className="text-xl font-semibold mb-2 text-white">Step 1: Verify you're human</h3>
                        <p className="mb-4 text-gray-300">Please complete the captcha verification to continue.</p>
                        <button
                            onClick={handleCaptchaVerification}
                            disabled={loading}
                            className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Verifying...
                                </span>
                            ) : (
                                'Verify with Captcha'
                            )}
                        </button>
                    </div>
                );
            case 2:
                return (
                    <div className="verification-step p-4 bg-gray-800 rounded mb-4">
                        <h3 className="text-xl font-semibold mb-2 text-white">Step 2: Agreement</h3>
                        <p className="mb-4 text-gray-300">By creating a concert, you agree to our terms and conditions:</p>
                        <ul className="list-disc pl-5 mb-4 text-gray-300">
                            <li>You confirm you have the right to organize this concert</li>
                            <li>You will ensure all concert information is accurate</li>
                            <li>You understand that ticket NFTs will be minted on Solana blockchain</li>
                            <li>You agree not to create spam or fraudulent listings</li>
                            <li>You understand your concert must be approved by an admin before it becomes visible</li>
                        </ul>
                        <div className="flex items-center mb-4">
                            <input
                                type="checkbox"
                                id="agreement"
                                className="mr-2"
                                checked={agreementAccepted}
                                onChange={handleAgreementAcceptance}
                            />
                            <label htmlFor="agreement" className="text-white">I agree to the terms and conditions</label>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="verification-complete p-4 bg-green-800 rounded mb-4">
                        <h3 className="text-xl font-semibold mb-2 text-white">Verification Complete ✓</h3>
                        <p className="text-gray-200">You can now proceed with creating your concert.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    // Render success card
    const renderSuccessCard = () => (
        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 p-0.5 rounded-lg mt-6">
            <div className="bg-gray-900 rounded-lg p-6">
                <div className="flex items-center mb-4">
                    <div className="bg-yellow-500/20 rounded-full p-2 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h3 className="text-yellow-500 font-medium">Concert Request Submitted!</h3>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span className="text-gray-400">Name:</span>
                            <span className="text-white ml-2">{concertCreated?.name}</span>
                        </div>
                        <div>
                            <span className="text-gray-400">Venue:</span>
                            <span className="text-white ml-2">{concertCreated?.venue}</span>
                        </div>
                        <div>
                            <span className="text-gray-400">Date:</span>
                            <span className="text-white ml-2">{new Date(concertCreated?.date).toLocaleDateString()}</span>
                        </div>
                        <div>
                            <span className="text-gray-400">Status:</span>
                            <span className="text-yellow-400 ml-2 font-medium">{concertCreated?.status}</span>
                        </div>
                    </div>
                </div>

                <p className="text-gray-400 text-sm mb-4">
                    Your concert request has been submitted for admin review. You will be notified when it's approved or if additional information is needed.
                </p>

                <div className="flex justify-between">
                    <button
                        onClick={() => navigate('/pending-concerts')}
                        className="text-purple-400 hover:text-purple-300 transition-colors flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        View Pending Concerts
                    </button>
                    <button
                        onClick={resetForm}
                        className="text-white bg-purple-600 hover:bg-purple-700 py-2 px-4 rounded-lg transition-colors"
                    >
                        Create Another Concert
                    </button>
                </div>
            </div>
        </div>
    );

    // Render basic info tab
    const renderBasicInfoTab = () => (
        <div className="space-y-6">
            <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                    Concert Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    placeholder="Enter concert name"
                />
            </div>

            <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                    Venue <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    placeholder="Enter venue name"
                />
            </div>

            <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                    Date <span className="text-red-500">*</span>
                </label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                />
            </div>

            <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                    Category
                </label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                >
                    <option value="">-- Select Category --</option>
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => {
                        if (!name || !venue || !date) {
                            setError('Please fill all required fields');
                            return;
                        }
                        setError('');
                        setActiveTab('tickets');
                    }}
                    className="bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg group hover:shadow-lg hover:shadow-purple-500/20"
                >
                    <div className="bg-gray-900 rounded-md py-2 px-6 text-white font-medium group-hover:bg-gray-900/80 transition duration-300">
                        Next: Ticket Sections
                    </div>
                </button>
            </div>
        </div>
    );

    // Render tickets tab
    const renderTicketsTab = () => (
        <div className="space-y-6">
            <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                    Ticket Sections <span className="text-red-500">*</span>
                </label>
                <p className="text-gray-400 text-xs mb-4">
                    Define sections for your concert with names, prices, and capacities.
                </p>

                {sections.map((section, index) => (
                    <div key={index} className="bg-gray-800/50 p-4 rounded-lg mb-4">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold text-white">Section {index + 1}</h3>
                            {sections.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeSection(index)}
                                    className="text-red-400 hover:text-red-300"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-gray-300 text-sm mb-1">Section Name</label>
                                <input
                                    type="text"
                                    value={section.name}
                                    onChange={(e) => handleSectionChange(index, 'name', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                    placeholder="e.g. VIP, Regular, etc."
                                />
                            </div>
                            <div>
                                <label className="block text-gray-300 text-sm mb-1">Price (SOL)</label>
                                <input
                                    type="number"
                                    value={section.price}
                                    onChange={(e) => handleSectionChange(index, 'price', e.target.value)}
                                    min="0"
                                    step="0.01"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-300 text-sm mb-1">Number of Seats</label>
                                <input
                                    type="number"
                                    value={section.totalSeats}
                                    onChange={(e) => handleSectionChange(index, 'totalSeats', e.target.value)}
                                    min="0"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                />
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addSection}
                    className="flex items-center text-purple-400 hover:text-purple-300 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Another Section
                </button>

                <div className="mt-4 p-3 bg-gray-900 rounded-lg">
                    <p className="text-gray-300">
                        Total Seats: <span className="font-semibold text-white">
                            {sections.reduce((sum, section) => sum + (parseInt(section.totalSeats) || 0), 0)}
                        </span>
                    </p>
                </div>
            </div>

            <div className="flex justify-between">
                <button
                    type="button"
                    onClick={() => setActiveTab('basic')}
                    className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg transition-colors"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={() => {
                        // Check if at least one section is valid
                        const validSections = sections.filter(section =>
                            section.name && section.totalSeats > 0 && section.price > 0
                        );

                        if (validSections.length === 0) {
                            setError('You need to specify at least one valid section with name, price, and seats');
                            return;
                        }

                        setError('');
                        setActiveTab('details');
                    }}
                    className="bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg group hover:shadow-lg hover:shadow-purple-500/20"
                >
                    <div className="bg-gray-900 rounded-md py-2 px-6 text-white font-medium group-hover:bg-gray-900/80 transition duration-300">
                        Next: Additional Details
                    </div>
                </button>
            </div>
        </div>
    );

    // Render details tab
    const renderDetailsTab = () => (
        <div className="space-y-6">
            <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                    Description
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="4"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    placeholder="Enter concert description (optional)"
                ></textarea>
            </div>

            <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                    Poster Image (Optional)
                </label>
                <div className="flex items-center space-x-4">
                    <div className="flex-grow">
                        <label className="flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg h-32 cursor-pointer hover:border-purple-500 transition-colors">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePosterUpload}
                                className="hidden"
                            />
                            <div className="text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-gray-400 text-sm">Upload a poster image for your concert (optional)</p>
                            </div>
                        </label>
                    </div>
                    {posterPreview && (
                        <div className="w-32 h-32 relative">
                            <img
                                src={posterPreview}
                                alt="Poster preview"
                                className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setPosterImage(null);
                                    setPosterPreview('');
                                }}
                                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-between">
                <button
                    type="button"
                    onClick={() => setActiveTab('tickets')}
                    className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg transition-colors"
                >
                    Back
                </button>
                <button
                    type="submit"
                    disabled={loading || !isVerified}
                    className={`bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg group ${(loading || !isVerified) ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-purple-500/20'}`}
                >
                    <div className="bg-gray-900 rounded-md py-2 px-6 text-white font-medium group-hover:bg-gray-900/80 transition duration-300">
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Submitting...
                            </span>
                        ) : !isVerified ? (
                            'Complete Verification First'
                        ) : (
                            'Submit for Approval'
                        )}
                    </div>
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
            {/* Background effects */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600 filter blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-600 filter blur-3xl"></div>
            </div>

            <div className="max-w-4xl mx-auto relative">
                {/* ✅ Environment Debug Info */}
                <div className="mb-4 p-3 bg-gray-800/30 rounded-lg text-xs text-gray-400">
                    <div className="flex justify-between items-center">
                        <span>Environment: <strong className="text-white">{process.env.NODE_ENV || 'development'}</strong></span>
                        <span>API: <strong className="text-purple-400">{API_BASE_URL}</strong></span>
                        <span>Domain: <strong className="text-blue-400">{window.location.hostname}</strong></span>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-xl"
                >
                    <div className="bg-gray-900 rounded-xl p-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
                            Create New <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500">Concert</span>
                        </h1>

                        {!wallet.connected ? (
                            <div className="text-center py-12">
                                <h3 className="text-xl text-white mb-6">Connect your wallet to create a concert</h3>
                                <WalletMultiButton className="!bg-gradient-to-br !from-purple-600 !to-indigo-600 hover:!shadow-lg hover:!shadow-purple-500/20 transition duration-300" />
                            </div>
                        ) : (
                            <>
                                {/* Wallet Info */}
                                <div className="bg-gray-800/50 rounded-lg p-6 mb-8">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-gray-400 text-sm">Wallet Address</p>
                                            <p className="text-white font-mono text-sm truncate max-w-[200px] md:max-w-[300px]">{wallet.publicKey.toString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-400 text-sm">Balance</p>
                                            <p className="text-white font-medium">{balance.toFixed(4)} SOL</p>
                                        </div>
                                    </div>
                                    {walletError && (
                                        <p className="text-red-500 text-sm mt-2">{walletError}</p>
                                    )}
                                </div>

                                {/* Authentication Check */}
                                {!isAuthenticated && (
                                    <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4 mb-6">
                                        <div className="flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-yellow-400 text-sm">Authentication Required</span>
                                        </div>
                                        <p className="text-gray-300 text-sm mt-2 mb-4">Please authenticate with your wallet to create concerts.</p>
                                        <button
                                            onClick={handleLogin}
                                            disabled={isLoggingIn}
                                            className={`bg-yellow-500 hover:bg-yellow-600 text-black py-2 px-4 rounded-lg transition-colors ${isLoggingIn ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        >
                                            {isLoggingIn ? 'Authenticating...' : 'Authenticate Wallet'}
                                        </button>
                                    </div>
                                )}

                                {/* Error Display */}
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6">
                                        <p className="text-red-500 text-sm">{error}</p>
                                    </div>
                                )}

                                {/* Verification Section */}
                                {!success && !isVerified && renderVerificationStep()}

                                {success && concertCreated ? (
                                    renderSuccessCard()
                                ) : (
                                    <form onSubmit={handleCreateConcert}>
                                        {/* Tabs navigation */}
                                        <div className="flex border-b border-gray-700 mb-6">
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('basic')}
                                                className={`py-2 px-4 text-sm font-medium ${activeTab === 'basic' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}
                                            >
                                                1. Basic Info
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('tickets')}
                                                className={`py-2 px-4 text-sm font-medium ${activeTab === 'tickets' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}
                                            >
                                                2. Ticket Sections
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('details')}
                                                className={`py-2 px-4 text-sm font-medium ${activeTab === 'details' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}
                                            >
                                                3. Additional Details
                                            </button>
                                        </div>

                                        {/* Tab content */}
                                        <div className="pb-4">
                                            {activeTab === 'basic' && renderBasicInfoTab()}
                                            {activeTab === 'tickets' && renderTicketsTab()}
                                            {activeTab === 'details' && renderDetailsTab()}
                                        </div>
                                    </form>
                                )}

                                {/* Admin Approval Info */}
                                {!success && (
                                    <div className="mt-8 bg-blue-900/10 border border-blue-800/30 rounded-lg p-4">
                                        <h3 className="text-blue-400 font-medium mb-2">Admin Approval Required</h3>
                                        <p className="text-gray-300 text-sm">
                                            All concert submissions require admin approval before they become visible to users.
                                            This helps ensure quality content and prevent spam. The approval process typically takes 24-48 hours.
                                        </p>
                                    </div>
                                )}

                                {/* Transaction Fee Info */}
                                <div className="mt-4 text-center">
                                    <p className="text-gray-400 text-sm">
                                        Estimated transaction fee after approval: <span className="text-purple-400">0.000005 SOL</span>
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>

                {/* Information Cards */}
                <div className="mt-12 grid md:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gray-800/50 rounded-lg p-6"
                    >
                        <div className="w-10 h-10 bg-purple-900/50 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="text-white font-semibold mb-2">Verified Events</h3>
                        <p className="text-gray-400 text-sm">All concerts undergo admin verification to ensure authenticity and quality.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gray-800/50 rounded-lg p-6"
                    >
                        <div className="w-10 h-10 bg-purple-900/50 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                            </svg>
                        </div>
                        <h3 className="text-white font-semibold mb-2">Custom Sections</h3>
                        <p className="text-gray-400 text-sm">Define multiple ticket sections with different prices and quantities.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gray-800/50 rounded-lg p-6"
                    >
                        <div className="w-10 h-10 bg-purple-900/50 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="text-white font-semibold mb-2">Blockchain Security</h3>
                        <p className="text-gray-400 text-sm">Every transaction is securely recorded on Solana blockchain, preventing fraud and ticket forgery.</p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default CreateConcert;