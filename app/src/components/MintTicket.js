// src/components/MintTicket.js - Horizontal Layout Version
import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useParams, useNavigate } from 'react-router-dom';

// Import services
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import blockchainService from '../services/blockchain';
import { useConcerts } from '../context/ConcertContext';

// Import components
import SeatSelector from './SeatSelector';
import LoadingSpinner from './common/LoadingSpinner';

const MintTicket = () => {
    const { concertId } = useParams();
    const navigate = useNavigate();
    const wallet = useWallet();
    const { approvedConcerts, loadApprovedConcerts, loadMyTickets } = useConcerts();

    // State for ticket
    const [concert, setConcert] = useState(concertId || '');
    const [ticketType, setTicketType] = useState('');
    const [seatNumber, setSeatNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // State for payment and transaction
    const [processingTx, setProcessingTx] = useState(false);
    const [txProgress, setTxProgress] = useState(0);
    const [txMessage, setTxMessage] = useState('');

    // State for concert data
    const [selectedConcert, setSelectedConcert] = useState(null);
    const [solanaBalance, setSolanaBalance] = useState(0);
    const [mintedSeats, setMintedSeats] = useState([]);

    // UI state
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Performance metrics state
    const [performanceMetrics, setPerformanceMetrics] = useState(null);
    const [showPerformanceDetails, setShowPerformanceDetails] = useState(false);

    // Step tracking
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 4;

    // Load selected concert
    useEffect(() => {
        const loadConcertData = async () => {
            if (concertId) {
                setConcert(concertId);
                console.log("Loading concert with ID:", concertId);

                const selected = approvedConcerts.find(c => c.id === concertId);
                if (selected) {
                    setSelectedConcert(selected);
                } else {
                    await fetchConcertDetail(concertId);
                }
            }
        };

        loadConcertData();
        const isAuth = AuthService.isAuthenticated();
        setIsAuthenticated(isAuth);
    }, [concertId, approvedConcerts]);

    // Fetch Solana balance when wallet connects
    useEffect(() => {
        const fetchBalance = async () => {
            if (wallet && wallet.publicKey) {
                try {
                    const balance = await blockchainService.getSolanaBalance(wallet.publicKey);
                    setSolanaBalance(balance);
                } catch (err) {
                    console.error("Error fetching balance:", err);
                }
            }
        };

        fetchBalance();
    }, [wallet.publicKey, wallet.connected]);

    // Auto-authenticate when wallet connects
    useEffect(() => {
        const authenticate = async () => {
            if (wallet.connected && wallet.publicKey && !isAuthenticated) {
                try {
                    const success = await AuthService.loginTest(wallet.publicKey.toString());
                    setIsAuthenticated(success);
                } catch (err) {
                    console.error("Authentication error:", err);
                }
            }
        };

        authenticate();
    }, [wallet.connected, wallet.publicKey]);

    // Auto-advance steps based on completed data
    useEffect(() => {
        if (concert && selectedConcert) {
            setCurrentStep(2);
            if (ticketType) {
                setCurrentStep(3);
                if (seatNumber) {
                    setCurrentStep(4);
                }
            }
        }
    }, [concert, selectedConcert, ticketType, seatNumber]);

    // Fetch concert detail from API
    const fetchConcertDetail = async (id) => {
        try {
            setLoading(true);
            const concertData = await ApiService.getConcert(id);

            if (concertData) {
                const formattedConcert = {
                    id: concertData._id || concertData.id,
                    name: concertData.name,
                    venue: concertData.venue,
                    date: concertData.date,
                    sections: concertData.sections || [],
                    posterUrl: concertData.posterUrl,
                    creator: concertData.creator
                };

                setSelectedConcert(formattedConcert);
            }
        } catch (err) {
            console.error("Error fetching concert:", err);
            setError("Failed to load concert data");
        } finally {
            setLoading(false);
        }
    };

    // Fetch minted seats for selected concert
    useEffect(() => {
        const fetchMintedSeats = async () => {
            if (!concert) return;

            try {
                const result = await ApiService.getMintedSeats(concert, true);
                const seats = result?.seats || [];
                setMintedSeats(seats);
            } catch (err) {
                console.error("Error fetching minted seats:", err);
                setMintedSeats([]);
            }
        };

        fetchMintedSeats();
    }, [concert]);

    // Handle seat selection
    const handleSeatSelected = (seat) => {
        setSeatNumber(seat);
    };

    // Compact Step indicator component
    const CompactStepIndicator = () => (
        <div className="mb-6">
            <div className="flex items-center justify-center space-x-2 mb-3">
                {[1, 2, 3, 4].map((step) => (
                    <React.Fragment key={step}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${step < currentStep ? 'bg-green-500 text-white' :
                                step === currentStep ? 'bg-blue-500 text-white animate-pulse' :
                                    'bg-gray-600 text-gray-400'
                            }`}>
                            {step < currentStep ? '✓' : step}
                        </div>
                        {step < 4 && (
                            <div className={`w-8 h-0.5 transition-all duration-300 ${step < currentStep ? 'bg-green-500' :
                                    step === currentStep ? 'bg-blue-500' :
                                        'bg-gray-600'
                                }`} />
                        )}
                    </React.Fragment>
                ))}
            </div>
            <p className="text-center text-gray-300 text-sm">
                Step {currentStep}: {
                    currentStep === 1 ? 'Select Concert' :
                        currentStep === 2 ? 'Choose Type' :
                            currentStep === 3 ? 'Pick Seat' :
                                'Complete Purchase'
                }
            </p>
        </div>
    );

    // Transaction overlay (sama seperti sebelumnya)
    const TransactionOverlay = () => (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full border border-gray-700">
                <div className="flex flex-col items-center">
                    <div className="relative mb-6">
                        <LoadingSpinner size={12} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-blue-400 font-bold text-sm">{txProgress}%</span>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">Processing Transaction</h3>
                    <p className="text-gray-300 text-center mb-4">{txMessage}</p>

                    <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
                        <div
                            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${txProgress}%` }}
                        />
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                        Please wait while we process your transaction safely...
                    </p>
                </div>
            </div>
        </div>
    );

    // Compact Performance metrics card
    const CompactPerformanceCard = ({ metrics, onClose }) => {
        if (!metrics) return null;

        return (
            <div className="bg-gray-800 border border-green-500 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-green-400">✅ Transaction Complete</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-sm">✕</button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-gray-700 rounded-lg p-2 text-center">
                        <p className="text-gray-400 text-xs">Time</p>
                        <p className="text-white font-bold text-lg">{metrics.totalTime.toFixed(1)}s</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-2 text-center">
                        <p className="text-gray-400 text-xs">Steps</p>
                        <p className="text-white font-bold text-lg">{metrics.steps.length}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowPerformanceDetails(!showPerformanceDetails)}
                        className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded"
                    >
                        {showPerformanceDetails ? 'Hide' : 'Details'}
                    </button>
                    <button
                        onClick={() => downloadPerformanceData(metrics)}
                        className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded"
                    >
                        Download
                    </button>
                </div>

                {showPerformanceDetails && (
                    <div className="mt-3 pt-3 border-t border-gray-700 space-y-1">
                        {metrics.steps.map((step, index) => (
                            <div key={index} className="flex justify-between text-xs">
                                <span className="text-gray-400 truncate">{step.name}</span>
                                <span className="text-gray-300">{step.time.toFixed(1)}s</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Download performance data (sama seperti sebelumnya)
    const downloadPerformanceData = (metrics) => {
        try {
            let csvContent = "Step,Time (seconds),Percentage\n";
            metrics.steps.forEach(step => {
                csvContent += `"${step.name}",${step.time.toFixed(3)},${step.percentage.toFixed(2)}\n`;
            });
            csvContent += `"TOTAL",${metrics.totalTime.toFixed(3)},100\n`;

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `mint-performance-${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Error downloading performance data:", err);
        }
    };

    // Main mint handler (sama seperti sebelumnya)
    const handleMintTicket = async (e) => {
        e.preventDefault();

        if (!concert || !ticketType || !seatNumber) {
            setError("Please complete all ticket information");
            return;
        }

        setProcessingTx(true);
        setError('');
        setTxProgress(10);
        setTxMessage("Preparing ticket purchase...");

        const startTime = performance.now();
        const perfMetrics = { startTime, steps: [], lastStepTime: startTime };

        const recordStep = (stepName) => {
            const now = performance.now();
            const stepTime = (now - perfMetrics.lastStepTime) / 1000;
            perfMetrics.steps.push({ name: stepName, time: stepTime, timestamp: now });
            perfMetrics.lastStepTime = now;
        };

        try {
            // Step 1: Setup
            const section = selectedConcert.sections.find(s => s.name === ticketType);
            if (!section) throw new Error("Invalid ticket type");

            const ticketPrice = section.price || 0.01;
            recordStep("Initial setup and validation");

            // Step 2: Get receiver address
            setTxProgress(15);
            setTxMessage("Getting payment information...");

            let receiverAddress = "2upQ693dMu2PEdBp6JKnxRBWEimdbmbgNCvncbasP6TU";
            try {
                if (selectedConcert?.creator) {
                    receiverAddress = selectedConcert.creator;
                } else if (concert) {
                    const concertDetails = await ApiService.getConcert(concert);
                    if (concertDetails?.creator) {
                        receiverAddress = concertDetails.creator;
                    }
                }
            } catch (err) {
                console.warn("Error getting concert creator, using default address:", err);
            }
            recordStep("Get receiver wallet address");

            // Step 3: Create blockchain transaction
            setTxProgress(25);
            setTxMessage(`Creating blockchain payment (${ticketPrice} SOL)...`);

            let signature;
            try {
                signature = await blockchainService.createSolanaPayment(
                    wallet,
                    receiverAddress,
                    ticketPrice,
                    (progress) => setTxProgress(25 + Math.floor(progress * 0.4)),
                    (message) => setTxMessage(message)
                );

                setTxProgress(65);
                setTxMessage("Confirming blockchain transaction...");
                await new Promise(resolve => setTimeout(resolve, 2000));
                recordStep("Create and confirm blockchain transaction");

            } catch (txError) {
                recordStep("Blockchain transaction error");
                if (txError.message.includes("Insufficient")) {
                    throw new Error(`Insufficient balance. Required: ${ticketPrice} SOL. Your balance: ${solanaBalance.toFixed(4)} SOL`);
                } else if (txError.message.includes("reject")) {
                    throw new Error("Transaction was rejected in your wallet. Please try again.");
                } else {
                    throw txError;
                }
            }

            // Step 4: Mint ticket
            setTxProgress(75);
            setTxMessage("Creating your ticket...");

            const mintData = {
                concertId: concert,
                sectionName: ticketType,
                seatNumber: seatNumber,
                quantity: 1,
                transactionSignature: signature,
                receiverAddress: receiverAddress
            };

            const result = await ApiService.mintTicket(mintData);
            recordStep("API ticket minting");

            if (!result || !result.success) {
                throw new Error(result?.msg || "Failed to create ticket on server");
            }

            // Complete
            setTxProgress(100);
            setTxMessage("Ticket created successfully!");
            setSuccess(true);

            try {
                await ApiService.clearMintedSeatsCache(concert);
                await ApiService.clearAllTicketCaches();
            } catch (cacheErr) {
                console.warn("Non-critical: Error updating cache:", cacheErr);
            }
            recordStep("Cache updates");

            // Calculate final metrics
            const endTime = performance.now();
            const totalTime = (endTime - startTime) / 1000;
            let totalStepTime = 0;
            perfMetrics.steps.forEach(step => { totalStepTime += step.time; });
            perfMetrics.steps.forEach(step => { step.percentage = (step.time / totalStepTime) * 100; });

            const finalMetrics = {
                totalTime,
                steps: perfMetrics.steps,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                ticketData: { concertId: concert, sectionName: ticketType, seatNumber: seatNumber }
            };

            setPerformanceMetrics(finalMetrics);

            setTimeout(async () => {
                try {
                    await loadMyTickets(true);
                    const storedMetrics = JSON.parse(localStorage.getItem('mint_performance_metrics') || '[]');
                    storedMetrics.push(finalMetrics);
                    localStorage.setItem('mint_performance_metrics', JSON.stringify(storedMetrics));
                    setProcessingTx(false);
                } catch (navErr) {
                    console.error("Error during final refresh:", navErr);
                    setProcessingTx(false);
                }
            }, 2000);

        } catch (err) {
            console.error("Error during ticket minting:", err);
            setTxProgress(0);
            recordStep("Error: " + err.message);

            let errorMessage = err.message || "Failed to create ticket";
            if (errorMessage.includes("Status: 400")) {
                errorMessage = errorMessage.replace(" (Status: 400)", "");
            }

            setError(errorMessage);
            setProcessingTx(false);
        }
    };

    const handleNavigateToMyTickets = () => {
        navigate('/my-tickets');
    };

    return (
        <div className="min-h-screen bg-gray-900 pt-16 pb-12 px-4">
            {processingTx && <TransactionOverlay />}

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Mint Concert Ticket</h1>
                    <p className="text-gray-400">Secure your spot with blockchain-verified tickets</p>
                </div>

                {!wallet.connected ? (
                    <div className="text-center py-16 bg-gray-800 rounded-xl border border-gray-700 max-w-md mx-auto">
                        <div className="mb-6">
                            <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl text-white mb-2">Connect Your Wallet</h3>
                            <p className="text-gray-400 mb-6">Connect your Solana wallet to start minting tickets</p>
                        </div>
                        <WalletMultiButton />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: Form & Controls */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* Step Indicator */}
                            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                                <CompactStepIndicator />
                            </div>

                            {/* Error Display */}
                            {error && (
                                <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Success Display */}
                            {success && (
                                <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                                    <p className="text-green-400 font-medium text-sm">✅ Ticket Successfully Created!</p>
                                    <p className="text-green-300 text-xs mb-3">Your NFT ticket is now secured on the blockchain</p>
                                    <button
                                        onClick={handleNavigateToMyTickets}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm"
                                    >
                                        View Tickets
                                    </button>
                                </div>
                            )}

                            {/* Performance Metrics */}
                            {performanceMetrics && (
                                <CompactPerformanceCard
                                    metrics={performanceMetrics}
                                    onClose={() => setPerformanceMetrics(null)}
                                />
                            )}

                            {/* Concert Selection */}
                            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                                <label className="block text-gray-300 text-sm font-medium mb-3 flex items-center">
                                    <span className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center text-xs ${currentStep >= 2 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                                        {currentStep >= 2 ? '✓' : '1'}
                                    </span>
                                    Concert
                                </label>
                                {concertId ? (
                                    <div className="bg-gray-700 p-3 rounded-lg">
                                        <p className="text-white font-medium text-sm">{selectedConcert?.name || 'Loading...'}</p>
                                        {selectedConcert?.venue && (
                                            <p className="text-gray-400 text-xs">{selectedConcert.venue}</p>
                                        )}
                                    </div>
                                ) : (
                                    <select
                                        value={concert}
                                        onChange={(e) => {
                                            setConcert(e.target.value);
                                            setTicketType('');
                                            setSeatNumber('');
                                            const selected = approvedConcerts.find(c => c.id === e.target.value);
                                            if (selected) setSelectedConcert(selected);
                                        }}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white text-sm"
                                    >
                                        <option value="">Choose a concert...</option>
                                        {approvedConcerts.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} - {c.venue}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Ticket Type Selection */}
                            {selectedConcert && (
                                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                                    <label className="block text-gray-300 text-sm font-medium mb-3 flex items-center">
                                        <span className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center text-xs ${currentStep >= 3 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                                            {currentStep >= 3 ? '✓' : '2'}
                                        </span>
                                        Ticket Type
                                    </label>
                                    <div className="space-y-2">
                                        {selectedConcert.sections?.map((section) => (
                                            <button
                                                key={section.name}
                                                type="button"
                                                disabled={section.availableSeats <= 0}
                                                onClick={() => {
                                                    setTicketType(section.name);
                                                    setSeatNumber('');
                                                }}
                                                className={`w-full p-3 rounded-lg border text-left transition-all ${section.availableSeats <= 0 ?
                                                        'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed' :
                                                        ticketType === section.name ?
                                                            'bg-blue-600 border-blue-400 text-white' :
                                                            'bg-gray-700 border-gray-600 text-white hover:border-blue-500'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h3 className="font-medium text-sm">{section.name}</h3>
                                                        <div className="text-lg font-bold text-blue-400">{section.price} SOL</div>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded text-xs ${section.availableSeats <= 0 ? 'bg-red-900 text-red-400' :
                                                            section.availableSeats < 10 ? 'bg-yellow-900 text-yellow-400' :
                                                                'bg-green-900 text-green-400'
                                                        }`}>
                                                        {section.availableSeats > 0 ? `${section.availableSeats} left` : 'Sold Out'}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Purchase Summary & Wallet Info */}
                            {selectedConcert && ticketType && (
                                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                                        <span className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center text-xs ${currentStep >= 4 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                                            {currentStep >= 4 ? '✓' : '4'}
                                        </span>
                                        Summary
                                    </h3>

                                    <div className="space-y-2 text-sm mb-4">
                                        <div className="flex justify-between">
                                            <span className="text-gray-300">Concert:</span>
                                            <span className="text-white truncate ml-2">{selectedConcert.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-300">Type:</span>
                                            <span className="text-blue-400">{ticketType}</span>
                                        </div>
                                        {seatNumber && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-300">Seat:</span>
                                                <span className="text-purple-400 font-bold">{seatNumber}</span>
                                            </div>
                                        )}
                                        <hr className="border-gray-600" />
                                        <div className="flex justify-between font-bold">
                                            <span className="text-gray-300">Total:</span>
                                            <span className="text-green-400">
                                                {selectedConcert.sections.find(s => s.name === ticketType)?.price || 0.01} SOL
                                            </span>
                                        </div>
                                    </div>

                                    {/* Wallet Info */}
                                    <div className="bg-gray-700 rounded-lg p-3 mb-4">
                                        <div className="flex justify-between items-center text-sm mb-1">
                                            <span className="text-gray-300">Balance:</span>
                                            <span className="text-white">{solanaBalance.toFixed(4)} SOL</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300">Required:</span>
                                            <span className={`font-medium ${solanaBalance < (selectedConcert.sections.find(s => s.name === ticketType)?.price || 0) ?
                                                    'text-red-400' : 'text-green-400'
                                                }`}>
                                                {selectedConcert.sections.find(s => s.name === ticketType)?.price || 0.01} SOL
                                            </span>
                                        </div>

                                        {ticketType && solanaBalance < (selectedConcert?.sections.find(s => s.name === ticketType)?.price || 0) && (
                                            <div className="mt-2 p-2 bg-red-900/20 border border-red-500 rounded text-xs text-red-400">
                                                Insufficient balance to purchase this ticket
                                            </div>
                                        )}
                                    </div>

                                    {/* Security Notice */}
                                    <div className="mb-4 p-2 bg-blue-900/20 border border-blue-500 rounded-lg">
                                        <div className="flex items-start">
                                            <svg className="w-3 h-3 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            <div>
                                                <p className="text-blue-400 text-xs font-medium">Secure Transaction</p>
                                                <p className="text-blue-300 text-xs">
                                                    Your ticket will be minted as an NFT on the Solana blockchain.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Seat Selection */}
                        <div className="lg:col-span-2">
                            {selectedConcert && ticketType ? (
                                <div className="bg-gray-800 rounded-xl border border-gray-700">
                                    {/* Seat Selector Header */}
                                    <div className="p-6 border-b border-gray-700">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-lg font-semibold text-white flex items-center">
                                                <span className={`w-6 h-6 rounded-full mr-3 flex items-center justify-center text-xs ${currentStep >= 4 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                                                    {currentStep >= 4 ? '✓' : '3'}
                                                </span>
                                                Select Your Seat
                                            </h3>
                                            <div className="text-sm text-gray-400">
                                                {ticketType} Section • {selectedConcert.sections.find(s => s.name === ticketType)?.price || 0.01} SOL
                                            </div>
                                        </div>

                                        {/* Selected Seat Display */}
                                        {seatNumber && (
                                            <div className="flex items-center gap-2 mt-3 p-2 bg-purple-900/20 border border-purple-600 rounded-lg">
                                                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="text-purple-400 text-sm font-medium">
                                                    Selected: Seat {seatNumber}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Seat Selector Content */}
                                    <div className="p-6">
                                        <SeatSelector
                                            ticketType={ticketType}
                                            concertId={concert}
                                            selectedConcert={selectedConcert}
                                            onSeatSelected={handleSeatSelected}
                                            mintedSeats={mintedSeats}
                                            ticketPrice={selectedConcert.sections.find(s => s.name === ticketType)?.price || 0.01}
                                        />
                                    </div>

                                    {/* Mint Button - Fixed at bottom of seat selector */}
                                    {seatNumber && (
                                        <div className="p-6 border-t border-gray-700 bg-gray-900/50">
                                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                                                {/* Quick Summary */}
                                                <div className="flex-1 text-center sm:text-left">
                                                    <p className="text-white font-medium">
                                                        {selectedConcert.name} • {ticketType} • Seat {seatNumber}
                                                    </p>
                                                    <p className="text-gray-400 text-sm">
                                                        Total: <span className="text-green-400 font-bold">
                                                            {selectedConcert.sections.find(s => s.name === ticketType)?.price || 0.01} SOL
                                                        </span>
                                                    </p>
                                                </div>

                                                {/* Large Mint Button */}
                                                <button
                                                    onClick={handleMintTicket}
                                                    disabled={loading || !concert || !ticketType || !seatNumber || !isAuthenticated ||
                                                        (ticketType && solanaBalance < (selectedConcert?.sections.find(s => s.name === ticketType)?.price || 0))}
                                                    className={`px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-lg ${loading || !concert || !ticketType || !seatNumber || !isAuthenticated ||
                                                            (ticketType && solanaBalance < (selectedConcert?.sections.find(s => s.name === ticketType)?.price || 0)) ?
                                                            'bg-gray-600 text-gray-400 cursor-not-allowed transform-none' :
                                                            'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-blue-500/25'
                                                        }`}
                                                >
                                                    {loading ? (
                                                        <div className="flex items-center justify-center">
                                                            <LoadingSpinner size={5} />
                                                            <span className="ml-2">Processing...</span>
                                                        </div>
                                                    ) : success ? (
                                                        '🎉 Mint Another Ticket'
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                            </svg>
                                                            Mint Ticket Now
                                                        </div>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Balance Check Warning */}
                                            {ticketType && solanaBalance < (selectedConcert?.sections.find(s => s.name === ticketType)?.price || 0) && (
                                                <div className="mt-3 p-3 bg-red-900/20 border border-red-500 rounded-lg flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <div className="text-red-400 text-sm">
                                                        <span className="font-medium">Insufficient balance!</span>
                                                        <span className="block text-xs">
                                                            You need {selectedConcert.sections.find(s => s.name === ticketType)?.price || 0.01} SOL but have {solanaBalance.toFixed(4)} SOL
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                                    <div className="mb-6">
                                        <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                                            <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl text-gray-400 mb-2">Choose Concert & Ticket Type</h3>
                                        <p className="text-gray-500 text-sm">
                                            Select a concert and ticket type from the left panel to view available seats
                                        </p>
                                    </div>

                                    {/* Progress Indicator */}
                                    <div className="flex justify-center space-x-2">
                                        <div className={`w-2 h-2 rounded-full ${concert && selectedConcert ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                                        <div className={`w-2 h-2 rounded-full ${ticketType ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                                        <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Mobile Instructions */}
                <div className="mt-8 lg:hidden bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-sm font-medium text-white mb-2">💡 How to Use</h4>
                    <ol className="text-xs text-gray-400 space-y-1">
                        <li>1. Connect your Solana wallet</li>
                        <li>2. Select concert and ticket type</li>
                        <li>3. Choose your preferred seat</li>
                        <li>4. Complete the purchase</li>
                    </ol>
                </div>

                {/* Desktop Footer Info */}
                <div className="hidden lg:block mt-8 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🔐</span>
                            <span>Blockchain Secured</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">⚡</span>
                            <span>Instant Verification</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🎫</span>
                            <span>NFT Ownership</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">💎</span>
                            <span>Transferable Assets</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MintTicket;