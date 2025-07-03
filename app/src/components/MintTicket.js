// src/components/MintTicket.js - Simplified Clean Version
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

    // Step indicator component
    const StepIndicator = () => (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${step < currentStep ? 'bg-green-500 text-white' :
                                step === currentStep ? 'bg-blue-500 text-white animate-pulse' :
                                    'bg-gray-600 text-gray-400'
                            }`}>
                            {step < currentStep ? '✓' : step}
                        </div>
                        {step < 4 && (
                            <div className={`flex-1 h-1 mx-2 transition-all duration-300 ${step < currentStep ? 'bg-green-500' :
                                    step === currentStep ? 'bg-blue-500' :
                                        'bg-gray-600'
                                }`} />
                        )}
                    </div>
                ))}
            </div>
            <div className="text-center">
                <p className="text-gray-300 text-sm">
                    Step {currentStep} of {totalSteps}: {
                        currentStep === 1 ? 'Select Concert' :
                            currentStep === 2 ? 'Choose Ticket Type' :
                                currentStep === 3 ? 'Pick Your Seat' :
                                    'Complete Purchase'
                    }
                </p>
            </div>
        </div>
    );

    // Transaction overlay
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

    // Performance metrics card
    const PerformanceMetricsCard = ({ metrics, onClose }) => {
        if (!metrics) return null;

        return (
            <div className="bg-gray-800 border border-green-500 rounded-lg p-6 mt-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-green-400">Transaction Complete</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200"
                    >
                        ✕
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-700 rounded-lg p-3">
                        <p className="text-gray-400 text-sm">Total Time</p>
                        <p className="text-white font-bold text-xl">{metrics.totalTime.toFixed(2)}s</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                        <p className="text-gray-400 text-sm">Steps</p>
                        <p className="text-white font-bold text-xl">{metrics.steps.length}</p>
                    </div>
                </div>

                {showPerformanceDetails && (
                    <div className="mt-4 space-y-2 border-t border-gray-700 pt-4">
                        {metrics.steps.map((step, index) => (
                            <div key={index} className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">{step.name}</span>
                                <span className="text-gray-300 text-sm">{step.time.toFixed(2)}s</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-3 mt-4">
                    <button
                        onClick={() => setShowPerformanceDetails(!showPerformanceDetails)}
                        className="flex-1 text-sm bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded"
                    >
                        {showPerformanceDetails ? 'Hide Details' : 'Show Details'}
                    </button>
                    <button
                        onClick={() => downloadPerformanceData(metrics)}
                        className="flex-1 text-sm bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded"
                    >
                        Download
                    </button>
                </div>
            </div>
        );
    };

    // Download performance data
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

    // Main mint handler
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

            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Mint Concert Ticket</h1>
                    <p className="text-gray-400">Secure your spot with blockchain-verified tickets</p>
                </div>

                {!wallet.connected ? (
                    <div className="text-center py-16 bg-gray-800 rounded-xl border border-gray-700">
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
                    <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
                        {/* Step Indicator */}
                        <StepIndicator />

                        {/* Error Display */}
                        {error && (
                            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Success Display */}
                        {success && (
                            <div className="bg-green-900/20 border border-green-500 rounded-lg p-6 mb-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-green-400 font-medium">Ticket Successfully Created!</p>
                                        <p className="text-green-300 text-sm">Your NFT ticket is now secured on the blockchain</p>
                                    </div>
                                    <button
                                        onClick={handleNavigateToMyTickets}
                                        className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg"
                                    >
                                        View Tickets
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Performance Metrics */}
                        {performanceMetrics && (
                            <PerformanceMetricsCard
                                metrics={performanceMetrics}
                                onClose={() => setPerformanceMetrics(null)}
                            />
                        )}

                        <form onSubmit={handleMintTicket} className="space-y-8">
                            {/* Step 1: Concert Selection */}
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-3 flex items-center">
                                    <span className={`w-6 h-6 rounded-full mr-2 flex items-center justify-center text-xs ${currentStep >= 2 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                                        {currentStep >= 2 ? '✓' : '1'}
                                    </span>
                                    Select Concert
                                </label>
                                {concertId ? (
                                    <div className="bg-gray-700 p-4 rounded-lg">
                                        <p className="text-white font-medium">{selectedConcert?.name || 'Loading...'}</p>
                                        {selectedConcert?.venue && (
                                            <p className="text-gray-400 text-sm">{selectedConcert.venue}</p>
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
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg p-4 text-white"
                                    >
                                        <option value="">Choose a concert...</option>
                                        {approvedConcerts.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} - {c.venue}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Step 2: Ticket Type */}
                            {selectedConcert && (
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-3 flex items-center">
                                        <span className={`w-6 h-6 rounded-full mr-2 flex items-center justify-center text-xs ${currentStep >= 3 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                                            {currentStep >= 3 ? '✓' : '2'}
                                        </span>
                                        Choose Ticket Type
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedConcert.sections?.map((section) => (
                                            <button
                                                key={section.name}
                                                type="button"
                                                disabled={section.availableSeats <= 0}
                                                onClick={() => {
                                                    setTicketType(section.name);
                                                    setSeatNumber('');
                                                }}
                                                className={`p-4 rounded-lg border text-left transition-all ${section.availableSeats <= 0 ?
                                                        'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed' :
                                                        ticketType === section.name ?
                                                            'bg-blue-600 border-blue-400 text-white' :
                                                            'bg-gray-700 border-gray-600 text-white hover:border-blue-500'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-medium text-lg">{section.name}</h3>
                                                    <span className={`px-2 py-1 rounded text-xs ${section.availableSeats <= 0 ? 'bg-red-900 text-red-400' :
                                                            section.availableSeats < 10 ? 'bg-yellow-900 text-yellow-400' :
                                                                'bg-green-900 text-green-400'
                                                        }`}>
                                                        {section.availableSeats > 0 ? `${section.availableSeats} left` : 'Sold Out'}
                                                    </span>
                                                </div>
                                                <div className="text-2xl font-bold text-blue-400">{section.price} SOL</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Seat Selection */}
                            {selectedConcert && ticketType && (
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-3 flex items-center">
                                        <span className={`w-6 h-6 rounded-full mr-2 flex items-center justify-center text-xs ${currentStep >= 4 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                                            {currentStep >= 4 ? '✓' : '3'}
                                        </span>
                                        Pick Your Seat
                                    </label>
                                    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                                        <SeatSelector
                                            ticketType={ticketType}
                                            concertId={concert}
                                            selectedConcert={selectedConcert}
                                            onSeatSelected={handleSeatSelected}
                                            mintedSeats={mintedSeats}
                                            ticketPrice={selectedConcert.sections.find(s => s.name === ticketType)?.price || 0.01}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Purchase Summary */}
                            {selectedConcert && ticketType && seatNumber && (
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-3 flex items-center">
                                        <span className="w-6 h-6 rounded-full mr-2 flex items-center justify-center text-xs bg-blue-500 text-white">4</span>
                                        Complete Purchase
                                    </label>

                                    <div className="bg-gray-700 rounded-lg p-6 mb-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">Purchase Summary</h3>

                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-gray-300">Concert:</span>
                                                <span className="text-white">{selectedConcert.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-300">Venue:</span>
                                                <span className="text-white">{selectedConcert.venue}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-300">Ticket Type:</span>
                                                <span className="text-blue-400">{ticketType}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-300">Seat:</span>
                                                <span className="text-purple-400">{seatNumber}</span>
                                            </div>
                                            <hr className="border-gray-600" />
                                            <div className="flex justify-between text-lg">
                                                <span className="text-gray-300">Total Price:</span>
                                                <span className="text-green-400 font-bold">
                                                    {selectedConcert.sections.find(s => s.name === ticketType)?.price || 0.01} SOL
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Wallet Info */}
                                    <div className="bg-gray-700 rounded-lg p-4 mb-6">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-gray-300">Wallet Balance:</span>
                                            <span className="text-white">{solanaBalance.toFixed(4)} SOL</span>
                                        </div>

                                        {ticketType && selectedConcert && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-300">Required:</span>
                                                <span className={`font-medium ${solanaBalance < (selectedConcert.sections.find(s => s.name === ticketType)?.price || 0) ? 'text-red-400' : 'text-green-400'}`}>
                                                    {selectedConcert.sections.find(s => s.name === ticketType)?.price || 0.01} SOL
                                                </span>
                                            </div>
                                        )}

                                        {ticketType && solanaBalance < (selectedConcert?.sections.find(s => s.name === ticketType)?.price || 0) && (
                                            <div className="mt-3 p-3 bg-red-900/20 border border-red-500 rounded-lg">
                                                <span className="text-red-400 text-sm">Insufficient balance to purchase this ticket</span>
                                            </div>
                                        )}

                                        {/* Payment destination */}
                                        {selectedConcert && selectedConcert.creator && (
                                            <div className="mt-3 pt-3 border-t border-gray-600">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 text-xs">Payment to:</span>
                                                    <span className="text-gray-400 text-xs font-mono">
                                                        {selectedConcert.creator.substring(0, 8)}...{selectedConcert.creator.substring(selectedConcert.creator.length - 6)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="pt-6 border-t border-gray-700">
                                <button
                                    type="submit"
                                    disabled={loading || !concert || !ticketType || !seatNumber || !isAuthenticated ||
                                        (ticketType && solanaBalance < (selectedConcert?.sections.find(s => s.name === ticketType)?.price || 0))}
                                    className={`w-full py-4 px-6 rounded-lg font-medium text-lg transition-all ${loading || !concert || !ticketType || !seatNumber || !isAuthenticated ||
                                            (ticketType && solanaBalance < (selectedConcert?.sections.find(s => s.name === ticketType)?.price || 0)) ?
                                            'bg-gray-600 text-gray-400 cursor-not-allowed' :
                                            'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center">
                                            <LoadingSpinner size={5} />
                                            <span className="ml-2">Processing...</span>
                                        </div>
                                    ) : success ? (
                                        'Mint Another Ticket'
                                    ) : (
                                        <>
                                            Mint Ticket {selectedConcert && ticketType ?
                                                `- ${selectedConcert.sections.find(s => s.name === ticketType)?.price || 0.01} SOL` :
                                                ''
                                            }
                                        </>
                                    )}
                                </button>

                                {/* Security Notice */}
                                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500 rounded-lg">
                                    <div className="flex items-start">
                                        <svg className="w-4 h-4 text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        <div>
                                            <p className="text-blue-400 text-xs font-medium mb-1">Secure Transaction</p>
                                            <p className="text-blue-300 text-xs">
                                                Your ticket will be minted as an NFT on the Solana blockchain.
                                                This ensures authenticity and prevents fraud.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MintTicket;