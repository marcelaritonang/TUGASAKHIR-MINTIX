// src/components/MyTickets.js
import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getProgram } from '../utils/anchor';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// LoadingSpinner component
const LoadingSpinner = ({ size = "h-8 w-8", color = "text-purple-500" }) => (
    <svg className={`animate-spin ${size} ${color}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// Component for individual ticket
const TicketCard = ({ ticket, onDelete, onView }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    // Handle delete with confirmation
    const handleDelete = async () => {
        if (!showConfirmDelete) {
            setShowConfirmDelete(true);
            return;
        }

        setIsDeleting(true);
        try {
            await onDelete(ticket.id);
        } catch (error) {
            console.error("Error deleting ticket:", error);
            setIsDeleting(false);
            setShowConfirmDelete(false);
        }
    };

    // Cancel delete action
    const cancelDelete = () => {
        setShowConfirmDelete(false);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 hover:border-purple-500/50 transition-all duration-300"
        >
            <div className="relative">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 relative overflow-hidden">
                    {/* Ticket diagonal pattern */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-20">
                        <div className="absolute inset-0" style={{
                            backgroundImage: 'repeating-linear-gradient(45deg, #8B5CF6, #8B5CF6 5px, transparent 5px, transparent 15px)',
                            backgroundSize: '20px 20px'
                        }}></div>
                    </div>

                    {/* Mintix NFT Logo */}
                    <div className="bg-gray-900/80 py-1 px-3 rounded inline-block mb-2">
                        <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">MINTIX NFT</span>
                    </div>

                    <h3 className="text-white font-bold text-xl relative">{ticket.concertName}</h3>
                    <p className="text-purple-200 text-sm mt-1 opacity-80">{ticket.venue} • {ticket.date}</p>

                    {/* Ticket Number */}
                    <div className="absolute top-2 right-2 bg-gray-900/50 rounded-full py-1 px-3">
                        <span className="text-xs text-white font-mono">#{ticket.shortId}</span>
                    </div>
                </div>

                <div className="p-6 relative">
                    {/* Ticket details */}
                    <div className="flex flex-col space-y-3 mb-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Ticket Type</span>
                            <span className="text-white font-medium px-3 py-1 bg-purple-900/30 rounded-full text-sm">{ticket.ticketType}</span>
                        </div>

                        {ticket.seatNumber && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Seat</span>
                                <span className="text-white font-medium">{ticket.seatNumber}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Status</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${ticket.used ? "bg-red-900/30 text-red-400" : "bg-green-900/30 text-green-400"}`}>
                                {ticket.used ? "Used" : "Valid"}
                            </span>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => onView(ticket)}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                        >
                            View
                        </button>

                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className={`flex-1 ${showConfirmDelete
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-gray-700 hover:bg-gray-600'} text-white py-2 px-4 rounded-lg transition-colors duration-200 flex justify-center items-center`}
                        >
                            {isDeleting ? (
                                <LoadingSpinner size="h-5 w-5" />
                            ) : showConfirmDelete ? (
                                'Confirm'
                            ) : (
                                'Delete'
                            )}
                        </button>

                        {showConfirmDelete && (
                            <button
                                onClick={cancelDelete}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const MyTickets = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deletingTicket, setDeletingTicket] = useState(null);
    const [loadingStage, setLoadingStage] = useState('init'); // 'init', 'blockchain', 'concerts'
    const wallet = useWallet();
    const navigate = useNavigate();

    // Fetch tickets from blockchain and localStorage (for static tickets)
    useEffect(() => {
        const fetchTickets = async () => {
            try {
                setLoading(true);
                setLoadingStage('init');
                setError(null);

                // Array to store all tickets (blockchain + static)
                let allTickets = [];

                // Only attempt to fetch blockchain tickets if wallet is connected
                if (wallet.connected) {
                    setLoadingStage('blockchain');

                    try {
                        const program = getProgram(wallet);

                        // Fetch tickets owned by the current wallet from blockchain
                        const userTickets = await program.account.ticket.all([
                            {
                                memcmp: {
                                    offset: 8, // Assuming owner field is at offset 8
                                    bytes: wallet.publicKey.toBase58()
                                }
                            }
                        ]);

                        // Process blockchain tickets
                        if (userTickets && userTickets.length > 0) {
                            const blockchainTickets = [];

                            // Verify each ticket's concert still exists
                            for (const ticket of userTickets) {
                                try {
                                    const concertPublicKey = ticket.account.concert;

                                    // Try to fetch the concert - this will throw if it doesn't exist
                                    await program.account.concert.fetch(concertPublicKey);

                                    // If we get here, the concert exists
                                    blockchainTickets.push({
                                        id: ticket.publicKey.toString(),
                                        shortId: ticket.publicKey.toString().substring(0, 5) + '...',
                                        concertId: ticket.account.concert.toString(),
                                        concertName: 'Blockchain Concert',  // We'll update this later
                                        ticketType: ticket.account.ticketType,
                                        seatNumber: ticket.account.seatNumber || 'N/A',
                                        used: ticket.account.used,
                                        isBlockchain: true,
                                        venue: 'Various Venues',
                                        date: 'Upcoming'
                                    });
                                } catch (err) {
                                    console.log(`Skipping ticket ${ticket.publicKey.toString()} because its concert no longer exists`);
                                    // Skip this ticket because its concert doesn't exist
                                }
                            }

                            allTickets = [...blockchainTickets];
                        }
                    } catch (err) {
                        console.error("Error fetching blockchain tickets:", err);
                        // Continue execution to fetch static tickets
                    }
                }

                // Fetch static tickets from localStorage
                setLoadingStage('concerts');

                try {
                    const savedTickets = JSON.parse(localStorage.getItem('mintedStaticTickets') || '[]');

                    // Fetch all available concerts to verify static tickets
                    let availableConcerts = [];
                    try {
                        // Attempt to get static concerts (this would normally come from your state or API)
                        const staticConcerts = [
                            { id: 'static-1', name: 'EDM Festival 2025' },
                            { id: 'static-2', name: 'Rock Legends' },
                            { id: 'static-3', name: 'Jazz Night' },
                            { id: 'static-4', name: 'Classical Symphony' },
                            { id: 'static-5', name: 'Hip Hop Summit' },
                            { id: 'static-6', name: 'Electronic Music Night' },
                            { id: 'static-7', name: 'Pop Sensation' },
                            { id: 'static-8', name: 'Country Music Festival' },
                        ];
                        availableConcerts = staticConcerts.map(c => c.id);
                    } catch (err) {
                        console.error("Error fetching available concerts:", err);
                    }

                    if (savedTickets.length > 0) {
                        // Filter out tickets for concerts that no longer exist
                        const validStaticTickets = savedTickets.filter(ticket =>
                            availableConcerts.includes(ticket.concertId)
                        );

                        // If we found tickets that are no longer valid, update localStorage
                        if (validStaticTickets.length < savedTickets.length) {
                            console.log(`Removing ${savedTickets.length - validStaticTickets.length} tickets for deleted concerts`);
                            localStorage.setItem('mintedStaticTickets', JSON.stringify(validStaticTickets));
                        }

                        const staticTickets = validStaticTickets.map((ticket, index) => ({
                            id: `static-${index}-${ticket.concertId}-${ticket.seatNumber}`,
                            shortId: ticket.concertId.split('-')[1] || String(index + 1000),
                            concertId: ticket.concertId,
                            concertName: ticket.concertName || 'Unknown Concert',
                            ticketType: ticket.ticketType || 'Regular',
                            seatNumber: ticket.seatNumber || 'N/A',
                            used: false,
                            isBlockchain: false,
                            date: ticket.date ? new Date(ticket.date).toLocaleDateString() : 'Upcoming',
                            venue: 'Virtual Arena',
                            mintDate: ticket.date
                        }));

                        allTickets = [...allTickets, ...staticTickets];
                    }
                } catch (err) {
                    console.error("Error fetching static tickets:", err);
                }

                // Sort tickets by date (most recent first)
                allTickets.sort((a, b) => {
                    // If mintDate exists, use it for sorting
                    if (a.mintDate && b.mintDate) {
                        return new Date(b.mintDate) - new Date(a.mintDate);
                    }
                    return 0;
                });

                setTickets(allTickets);
            } catch (error) {
                console.error("Error fetching tickets:", error);
                setError("Failed to load tickets. Please try again later.");
            } finally {
                setLoading(false);
                setLoadingStage('done');
            }
        };

        fetchTickets();
    }, [wallet.connected, wallet.publicKey]);

    // Function to delete a ticket
    const handleDeleteTicket = async (ticketId) => {
        setDeletingTicket(ticketId);

        try {
            if (ticketId.startsWith('static-')) {
                // For static tickets, remove from localStorage
                const savedTickets = JSON.parse(localStorage.getItem('mintedStaticTickets') || '[]');
                const [_, __, concertId, seatNumber] = ticketId.split('-');

                const updatedTickets = savedTickets.filter(
                    ticket => !(ticket.concertId === concertId && ticket.seatNumber === seatNumber)
                );

                localStorage.setItem('mintedStaticTickets', JSON.stringify(updatedTickets));

                // Update UI
                setTickets(tickets.filter(ticket => ticket.id !== ticketId));
            } else {
                // For blockchain tickets, we would need to call a smart contract function
                // This is a placeholder for the real implementation
                alert("Deleting blockchain tickets is not implemented yet");
                return;
            }

            // Simulate a short delay for better UX
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error("Error deleting ticket:", error);
            throw error;
        } finally {
            setDeletingTicket(null);
        }
    };

    // Function to view ticket details
    const handleViewTicket = (ticket) => {
        // For now just show an alert, in a real app you would navigate to a ticket detail page
        console.log("View ticket:", ticket);
        // navigate(`/ticket/${ticket.id}`);
        alert(`Viewing ticket ${ticket.id} for ${ticket.concertName}`);
    };

    // Loading screen based on the stage
    const renderLoadingScreen = () => {
        const loadingMessages = {
            'init': 'Initializing...',
            'blockchain': 'Checking blockchain tickets...',
            'concerts': 'Loading concert information...',
            'done': 'Almost done...'
        };

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center space-y-4"
            >
                <LoadingSpinner size="h-12 w-12" />
                <p className="text-gray-300 animate-pulse">{loadingMessages[loadingStage]}</p>
            </motion.div>
        );
    };

    // Empty state screen
    const renderEmptyState = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 px-4 bg-gray-800/50 rounded-lg border border-gray-700"
        >
            <div className="inline-flex justify-center items-center w-16 h-16 bg-gray-900 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No tickets found</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">You don't have any tickets yet. Browse available concerts and get your first NFT ticket!</p>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/explore')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-6 rounded-lg inline-block font-medium hover:shadow-lg hover:shadow-purple-500/20 transition duration-300"
            >
                Browse Concerts
            </motion.button>
        </motion.div>
    );

    // Error state
    const renderError = () => (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-red-900/20 border border-red-800 rounded-lg"
        >
            <div className="inline-flex justify-center items-center w-12 h-12 bg-red-900/50 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Something went wrong</h3>
            <p className="text-red-300 mb-6">{error}</p>
            <button
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-lg inline-block transition-colors duration-200"
            >
                Try Again
            </button>
        </motion.div>
    );

    if (!wallet.connected) {
        return (
            <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
                {/* Background effects */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600 filter blur-3xl"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-600 filter blur-3xl"></div>
                </div>

                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-gray-800/50 rounded-xl p-8 border border-gray-700"
                    >
                        <h2 className="text-3xl font-bold text-white mb-4">My NFT Tickets</h2>
                        <p className="text-gray-400 mb-8">Connect your wallet to view and manage your tickets</p>
                        <WalletMultiButton className="!bg-gradient-to-br !from-purple-600 !to-indigo-600 hover:!shadow-lg hover:!shadow-purple-500/20 transition duration-300" />
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
            {/* Background effects */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600 filter blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-600 filter blur-3xl"></div>
            </div>

            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-3xl font-bold text-white mb-2">My NFT Tickets</h2>
                    <p className="text-gray-400 mb-8">Manage your concert tickets and view their details</p>
                </motion.div>

                {error ? renderError() : (
                    <>
                        {loading ? renderLoadingScreen() : (
                            <>
                                {tickets.length === 0 ? renderEmptyState() : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <AnimatePresence>
                                            {tickets.map(ticket => (
                                                <TicketCard
                                                    key={ticket.id}
                                                    ticket={ticket}
                                                    onDelete={handleDeleteTicket}
                                                    onView={handleViewTicket}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* Add this back button for better navigation */}
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    onClick={() => navigate('/explore')}
                    className="mt-12 inline-flex items-center text-purple-400 hover:text-purple-300 transition-colors duration-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back to Concerts
                </motion.button>
            </div>
        </div>
    );
};

export default MyTickets;