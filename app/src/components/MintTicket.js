// src/components/MintTicket.js (Versi dengan Performance Timing)
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

    // Load selected concert
    useEffect(() => {
        const loadConcertData = async () => {
            if (concertId) {
                setConcert(concertId);
                console.log("Loading concert with ID:", concertId);

                // Check if concert exists in approvedConcerts
                const selected = approvedConcerts.find(c => c.id === concertId);
                if (selected) {
                    setSelectedConcert(selected);
                } else {
                    // Fetch from API if not in context
                    await fetchConcertDetail(concertId);
                }
            }
        };

        loadConcertData();

        // Check authentication
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
                    creator: concertData.creator // Make sure we get the creator address
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
                // Use API service
                const result = await ApiService.getMintedSeats(concert);
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

    // Performance metrics component
    const PerformanceMetricsCard = ({ metrics, onClose }) => {
        if (!metrics) return null;

        return (
            <div className="bg-gray-800 border border-green-500 rounded-lg p-4 mt-6 mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-green-400">Performance Metrics</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex justify-between mb-2">
                    <span className="text-gray-300">Total Minting Time:</span>
                    <span className="text-white font-medium">{metrics.totalTime.toFixed(2)} seconds</span>
                </div>

                {showPerformanceDetails && (
                    <div className="mt-4 space-y-3 border-t border-gray-700 pt-3">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Detailed Timing:</h4>

                        {metrics.steps.map((step, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2">
                                <div className="col-span-7 text-gray-400 text-sm">{step.name}:</div>
                                <div className="col-span-3 text-right text-gray-400 text-sm">{step.time.toFixed(2)}s</div>
                                <div className="col-span-2 text-right text-gray-500 text-xs">({step.percentage.toFixed(1)}%)</div>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={() => setShowPerformanceDetails(!showPerformanceDetails)}
                    className="mt-3 text-sm text-indigo-400 hover:text-indigo-300"
                >
                    {showPerformanceDetails ? 'Hide Details' : 'Show Details'}
                </button>

                {/* "Download as CSV" button for research purposes */}
                <button
                    onClick={() => downloadPerformanceData(metrics)}
                    className="mt-2 w-full bg-gray-700 hover:bg-gray-600 text-sm text-white py-1 px-2 rounded"
                >
                    Download Data (CSV)
                </button>
            </div>
        );
    };

    // Function to download performance data as CSV
    const downloadPerformanceData = (metrics) => {
        try {
            // Create CSV content
            let csvContent = "Step,Time (seconds),Percentage\n";

            // Add each step
            metrics.steps.forEach(step => {
                csvContent += `"${step.name}",${step.time.toFixed(3)},${step.percentage.toFixed(2)}\n`;
            });

            // Add total
            csvContent += `"TOTAL",${metrics.totalTime.toFixed(3)},100\n`;

            // Add system info
            csvContent += "\nSystem Information\n";
            csvContent += `Date,"${new Date().toISOString()}"\n`;
            csvContent += `User Agent,"${navigator.userAgent}"\n`;
            csvContent += `Network Info,"${navigator.connection ?
                `${navigator.connection.effectiveType}, Round-trip: ${navigator.connection.rtt}ms` :
                'Not Available'}"\n`;

            // Create a blob and download
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

    // Transaction overlay component with performance metrics
    const TransactionOverlay = () => (
        <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
                <div className="flex flex-col items-center">
                    <LoadingSpinner size={8} />
                    <p className="mt-4 text-white text-lg font-medium">{txMessage}</p>
                    {txProgress > 0 && (
                        <div className="w-full mt-4 bg-gray-700 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="bg-blue-600 h-2.5"
                                style={{ width: `${txProgress}%` }}
                            ></div>
                            <p className="text-right text-gray-400 text-sm mt-1">{txProgress}%</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Fungsi untuk memastikan data tiket diperbarui setelah minting
    const refreshTicketData = async () => {
        try {
            console.log("Memperbarui data tiket...");

            // Hapus cache tiket di localStorage untuk memastikan data segar
            localStorage.removeItem('myTickets');
            localStorage.removeItem(`my_tickets_false`);
            localStorage.removeItem(`my_tickets_true`);
            localStorage.removeItem('my_tickets_last_update');

            // Tunggu 2 detik untuk memastikan data disimpan di server
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Muat ulang tiket dengan force refresh
            await loadMyTickets(true);

            return true;
        } catch (err) {
            console.error("Error refreshing ticket data:", err);
            return false;
        }
    };

    // Main mint handler - IMPROVED untuk monitor kecepatan minting
    const handleMintTicket = async (e) => {
        e.preventDefault();

        // Validate inputs
        if (!concert || !ticketType || !seatNumber) {
            setError("Please complete all ticket information");
            return;
        }

        // Start mint process with UI overlay
        setProcessingTx(true);
        setError('');
        setTxProgress(10);
        setTxMessage("Preparing ticket purchase...");

        // Setup performance tracking
        const startTime = performance.now();
        const perfMetrics = {
            startTime,
            steps: [],
            lastStepTime: startTime
        };

        // Function to record performance step
        const recordStep = (stepName) => {
            const now = performance.now();
            const stepTime = (now - perfMetrics.lastStepTime) / 1000; // convert to seconds

            perfMetrics.steps.push({
                name: stepName,
                time: stepTime,
                timestamp: now
            });

            perfMetrics.lastStepTime = now;
            console.log(`Performance: ${stepName} took ${stepTime.toFixed(2)} seconds`);
        };

        try {
            // ========== STEP 1: FIND SECTION & PRICE ==========
            const section = selectedConcert.sections.find(s => s.name === ticketType);
            if (!section) {
                throw new Error("Invalid ticket type");
            }

            const ticketPrice = section.price || 0.01;
            console.log(`Selected section: ${section.name}, Price: ${ticketPrice} SOL`);

            recordStep("Initial setup and validation");

            // ========== STEP 2: GET RECEIVER ADDRESS ==========
            setTxProgress(15);
            setTxMessage("Getting concert creator information...");
            let receiverAddress = "2upQ693dMu2PEdBp6JKnxRBWEimdbmbgNCvncbasP6TU";  // Default fallback

            try {
                // Try to use creator address from concert data
                if (selectedConcert && selectedConcert.creator) {
                    receiverAddress = selectedConcert.creator;
                    console.log("Using concert creator from cached data:", receiverAddress);
                } else if (concert) {
                    // Fetch concert details if needed
                    const concertDetails = await ApiService.getConcert(concert);
                    if (concertDetails && concertDetails.creator) {
                        receiverAddress = concertDetails.creator;
                        console.log("Payment will be sent to concert creator:", receiverAddress);
                    }
                }
            } catch (err) {
                console.warn("Error getting concert creator, using default address:", err);
            }

            recordStep("Get receiver wallet address");

            // ========== STEP 3: CREATE BLOCKCHAIN TRANSACTION ==========
            setTxProgress(20);
            setTxMessage(`Creating blockchain transaction (${ticketPrice} SOL)...`);

            // Indicates whether to use real blockchain tx (false) or dummy (true)
            const skipBlockchain = false;  // Set to true for testing if needed

            let signature;
            if (!skipBlockchain) {
                try {
                    const txStartTime = performance.now();

                    // Create actual blockchain transaction
                    signature = await blockchainService.createSolanaPayment(
                        wallet,
                        receiverAddress,
                        ticketPrice,
                        (progress) => {
                            setTxProgress(20 + Math.floor(progress * 0.5));
                        },
                        (message) => {
                            setTxMessage(message);
                        }
                    );

                    const txEndTime = performance.now();
                    const txDuration = (txEndTime - txStartTime) / 1000;

                    console.log(`Transaction created in ${txDuration.toFixed(2)} seconds with signature:`, signature);
                    console.log("Transaction created with signature:", signature);

                    // Wait for confirmation
                    setTxProgress(70);
                    setTxMessage("Waiting for blockchain confirmation...");

                    // Start confirmation timer
                    const confirmStartTime = performance.now();

                    await new Promise(resolve => setTimeout(resolve, 3000));

                    const confirmEndTime = performance.now();
                    const confirmDuration = (confirmEndTime - confirmStartTime) / 1000;

                    // Record blockchain transaction step
                    recordStep("Create and sign blockchain transaction");

                    // Record confirmation step
                    perfMetrics.steps.push({
                        name: "Blockchain confirmation",
                        time: confirmDuration,
                        timestamp: confirmEndTime
                    });

                    perfMetrics.lastStepTime = confirmEndTime;
                } catch (txError) {
                    console.error("Error creating blockchain transaction:", txError);

                    // Record error
                    recordStep("Blockchain transaction error");

                    // Handle specific transaction errors
                    if (txError.message.includes("Insufficient")) {
                        throw new Error(`Insufficient balance. Required: ${ticketPrice} SOL. Your balance: ${solanaBalance.toFixed(4)} SOL`);
                    } else if (txError.message.includes("reject")) {
                        throw new Error("Transaction was rejected in your wallet. Please try again.");
                    } else {
                        throw txError;
                    }
                }
            } else {
                // For development/testing use a dummy signature
                signature = `dummy_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
                console.log("DEVELOPMENT: Using dummy transaction signature:", signature);
                setTxProgress(70);
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Record development step
                recordStep("Create dummy transaction (dev mode)");
            }

            // ========== STEP 4: CALL API TO MINT TICKET ==========
            setTxProgress(80);
            setTxMessage("Creating ticket on server...");

            // Prepare data for API
            const mintData = {
                concertId: concert,
                sectionName: ticketType,
                seatNumber: seatNumber,
                quantity: 1,
                transactionSignature: signature,
                receiverAddress: receiverAddress
            };

            console.log("Calling API to mint ticket with data:", mintData);

            // Start API timer
            const apiStartTime = performance.now();

            // Call the API service
            const result = await ApiService.mintTicket(mintData);

            const apiEndTime = performance.now();
            const apiDuration = (apiEndTime - apiStartTime) / 1000;

            // Record API step
            recordStep("API ticket minting");

            console.log(`API mint took ${apiDuration.toFixed(2)} seconds, result:`, result);

            if (!result || !result.success) {
                // If API returns error, throw with the error message
                throw new Error(result?.msg || "Failed to create ticket on server");
            }

            // ========== STEP 5: UPDATE UI & CACHE ==========
            setTxProgress(100);
            setTxMessage("Ticket created successfully!");
            setSuccess(true);

            // Force cache update for minted seats
            try {
                await ApiService.updateMintedSeatsCache(concert, ticketType, seatNumber);
            } catch (cacheErr) {
                console.warn("Non-critical: Error updating seats cache:", cacheErr);
            }

            // Record cache update step
            recordStep("Cache updates");

            // Clear all relevant caches
            localStorage.removeItem('myTickets');
            localStorage.removeItem(`my_tickets_false`);
            localStorage.removeItem(`my_tickets_true`);
            localStorage.removeItem(`minted_seats_${concert}`);
            localStorage.removeItem('my_tickets_last_update');

            // ========== STEP 6: CALCULATE FINAL PERFORMANCE METRICS ==========
            const endTime = performance.now();
            const totalTime = (endTime - startTime) / 1000; // in seconds

            // Calculate percentages
            let totalStepTime = 0;
            perfMetrics.steps.forEach(step => {
                totalStepTime += step.time;
            });

            perfMetrics.steps.forEach(step => {
                step.percentage = (step.time / totalStepTime) * 100;
            });

            // Set final metrics
            const finalMetrics = {
                totalTime,
                steps: perfMetrics.steps,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                ticketData: {
                    concertId: concert,
                    sectionName: ticketType,
                    seatNumber: seatNumber
                }
            };

            console.log("Final performance metrics:", finalMetrics);
            setPerformanceMetrics(finalMetrics);

            // Use a longer delay to ensure server has time to process
            setTimeout(async () => {
                try {
                    // Final refresh to ensure data is current
                    await loadMyTickets(true);

                    // Record metrics first before navigating away
                    if (localStorage) {
                        try {
                            // Store metrics in localStorage for research
                            const storedMetrics = JSON.parse(localStorage.getItem('mint_performance_metrics') || '[]');
                            storedMetrics.push(finalMetrics);
                            localStorage.setItem('mint_performance_metrics', JSON.stringify(storedMetrics));
                        } catch (e) {
                            console.error("Error storing metrics:", e);
                        }
                    }

                    // Hide processing overlay
                    setProcessingTx(false);

                    // We don't navigate automatically now, so user can see performance metrics
                    // User will navigate manually after reviewing the data
                } catch (navErr) {
                    console.error("Error during final refresh:", navErr);
                    setProcessingTx(false);
                }
            }, 3000);

        } catch (err) {
            console.error("Error during ticket minting:", err);
            setTxProgress(0);

            // Record error timing
            recordStep("Error: " + err.message);

            // Calculate error metrics
            const errorTime = performance.now();
            const totalErrorTime = (errorTime - startTime) / 1000;

            // Calculate percentages for error case
            let totalStepTime = 0;
            perfMetrics.steps.forEach(step => {
                totalStepTime += step.time;
            });

            perfMetrics.steps.forEach(step => {
                step.percentage = (step.time / totalStepTime) * 100;
            });

            // Set error metrics
            const errorMetrics = {
                totalTime: totalErrorTime,
                steps: perfMetrics.steps,
                timestamp: new Date().toISOString(),
                error: err.message,
                userAgent: navigator.userAgent
            };

            console.log("Error performance metrics:", errorMetrics);

            // Don't show performance metrics on error
            // setPerformanceMetrics(errorMetrics);

            // Extract and format error message
            let errorMessage = err.message || "Failed to create ticket";

            // Clean up common error messages
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
            {/* Transaction overlay */}
            {processingTx && <TransactionOverlay />}

            <div className="max-w-xl mx-auto">
                <h1 className="text-2xl font-bold text-white mb-6 text-center">Mint Concert Ticket</h1>

                {!wallet.connected ? (
                    <div className="text-center py-12 bg-gray-800 rounded-lg">
                        <h3 className="text-lg text-white mb-6">Connect your wallet to create a ticket</h3>
                        <WalletMultiButton />
                    </div>
                ) : (
                    <div className="bg-gray-800 rounded-lg p-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6">
                                <p className="text-red-500 text-sm">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 mb-6">
                                <p className="text-green-500 text-sm">
                                    Ticket successfully created! You can view performance metrics below or navigate to your tickets.
                                </p>
                                <button
                                    onClick={handleNavigateToMyTickets}
                                    className="mt-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                                >
                                    Go to My Tickets
                                </button>
                            </div>
                        )}

                        {/* Performance Metrics Display */}
                        {performanceMetrics && (
                            <PerformanceMetricsCard
                                metrics={performanceMetrics}
                                onClose={() => setPerformanceMetrics(null)}
                            />
                        )}

                        <form onSubmit={handleMintTicket} className="space-y-6">
                            {/* Concert */}
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">
                                    Concert
                                </label>
                                {concertId ? (
                                    <div className="bg-gray-700 p-3 rounded">
                                        <p className="text-white">{selectedConcert?.name || 'Loading...'}</p>
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
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white"
                                    >
                                        <option value="">-- Select Concert --</option>
                                        {approvedConcerts.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} - {c.venue}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Ticket Type */}
                            {selectedConcert && (
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        Ticket Type
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {selectedConcert.sections?.map((section) => (
                                            <button
                                                key={section.name}
                                                type="button"
                                                disabled={section.availableSeats <= 0}
                                                onClick={() => {
                                                    setTicketType(section.name);
                                                    setSeatNumber('');
                                                }}
                                                className={`p-3 rounded-lg border text-center
                                                    ${section.availableSeats <= 0 ?
                                                        'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed' :
                                                        ticketType === section.name ?
                                                            'bg-blue-600 border-blue-500 text-white' :
                                                            'bg-gray-700 border-gray-600 text-white hover:border-blue-500'
                                                    }`}
                                            >
                                                <div>{section.name}</div>
                                                <div className="text-sm">{section.price} SOL</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Seat Selection */}
                            {selectedConcert && ticketType && (
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        Select Seat
                                    </label>
                                    <SeatSelector
                                        ticketType={ticketType}
                                        concertId={concert}
                                        selectedConcert={selectedConcert}
                                        onSeatSelected={handleSeatSelected}
                                        mintedSeats={mintedSeats}
                                        ticketPrice={selectedConcert.sections.find(s => s.name === ticketType)?.price || 0.01}
                                    />
                                </div>
                            )}

                            {/* Balance Info */}
                            <div className="bg-gray-700 p-3 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">Wallet Balance:</span>
                                    <span className="text-white">{solanaBalance.toFixed(6)} SOL</span>
                                </div>

                                {ticketType && selectedConcert && (
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-gray-300">Ticket Price:</span>
                                        <span className={`font-medium ${solanaBalance < (selectedConcert.sections.find(s => s.name === ticketType)?.price || 0) ? 'text-red-400' : 'text-green-400'}`}>
                                            {selectedConcert.sections.find(s => s.name === ticketType)?.price || 0.01} SOL
                                        </span>
                                    </div>
                                )}

                                {ticketType && solanaBalance < (selectedConcert?.sections.find(s => s.name === ticketType)?.price || 0) && (
                                    <div className="mt-2 text-red-400 text-sm">
                                        Insufficient balance to purchase this ticket
                                    </div>
                                )}

                                {/* Display creator information if available */}
                                {selectedConcert && selectedConcert.creator && (
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-gray-300">Payment to:</span>
                                        <span className="text-gray-300 text-sm font-mono">
                                            {selectedConcert.creator.substring(0, 6)}...{selectedConcert.creator.substring(selectedConcert.creator.length - 4)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || !concert || !ticketType || !seatNumber || !isAuthenticated ||
                                    (ticketType && solanaBalance < (selectedConcert?.sections.find(s => s.name === ticketType)?.price || 0))}
                                className={`w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium
                                    ${loading || !concert || !ticketType || !seatNumber || !isAuthenticated ||
                                        (ticketType && solanaBalance < (selectedConcert?.sections.find(s => s.name === ticketType)?.price || 0)) ?
                                        'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                            >
                                {loading ? 'Processing...' : success ? 'Mint Another Ticket' : 'Mint Ticket'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MintTicket;