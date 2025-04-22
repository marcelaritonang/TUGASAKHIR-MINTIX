import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Keypair, SystemProgram } from '@solana/web3.js';
import { getProgram, getBalance, requestAirdrop } from '../utils/anchor';
import { motion } from 'framer-motion';

const CreateConcert = () => {
    const [name, setName] = useState('');
    const [venue, setVenue] = useState('');
    const [date, setDate] = useState('');
    const [totalTickets, setTotalTickets] = useState(100);
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState(0);
    const [airdropLoading, setAirdropLoading] = useState(false);
    const [walletError, setWalletError] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [concertCreated, setConcertCreated] = useState(null);
    const wallet = useWallet();
    const navigate = useNavigate();

    // Load balance when wallet connects or changes
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

        // Set interval to update balance every 10 seconds with error handling
        const interval = setInterval(() => {
            try {
                updateBalance();
            } catch (err) {
                console.error("Error in balance update interval:", err);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [wallet, wallet.publicKey]);

    const handleAirdrop = async () => {
        if (!wallet.connected) return;

        setAirdropLoading(true);
        try {
            await requestAirdrop(wallet, 2); // Request 2 SOL
            const newBalance = await getBalance(wallet);
            setBalance(newBalance);
            alert('Airdrop berhasil! 2 SOL telah ditambahkan ke wallet Anda.');
        } catch (error) {
            console.error("Airdrop gagal:", error);
            alert(`Airdrop gagal: ${error.message}`);
        } finally {
            setAirdropLoading(false);
        }
    };

    const handleCreateConcert = async (e) => {
        e.preventDefault();
        if (!wallet.connected) {
            setError('Please connect your wallet first');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const program = getProgram(wallet);

            // Debug: log available methods
            console.log("Available program methods:", Object.keys(program.methods));

            // Generate a new keypair for the concert account
            const concertKeypair = Keypair.generate();
            console.log("Concert account pubkey:", concertKeypair.publicKey.toString());

            // Check if the method exists and try different possible method names
            if (program.methods.initializeConcert) {
                // Using initializeConcert method
                const tx = await program.methods
                    .initializeConcert(name, venue, date, totalTickets)
                    .accounts({
                        authority: wallet.publicKey,
                        concert: concertKeypair.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([concertKeypair])
                    .rpc();

                console.log("Transaction signature:", tx);
                setSuccess(true);
                setError('');

                // Update balance after transaction
                const newBalance = await getBalance(wallet);
                setBalance(newBalance);

                // Reset form
                setName('');
                setVenue('');
                setDate('');
                setTotalTickets(100);

            } else if (program.methods.createConcert) {
                // If the method is named createConcert instead
                const tx = await program.methods
                    .createConcert(name, venue, date, totalTickets)
                    .accounts({
                        authority: wallet.publicKey,
                        concert: concertKeypair.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([concertKeypair])
                    .rpc();

                console.log("Transaction signature:", tx);
                setSuccess(true);
                setError('');

                // Update balance after transaction
                const newBalance = await getBalance(wallet);
                setBalance(newBalance);

                // Reset form
                setName('');
                setVenue('');
                setDate('');
                setTotalTickets(100);

            } else {
                throw new Error('Concert creation method not found in the program');
            }

            // After successful creation, show success message and redirect
            const concertId = concertKeypair.publicKey.toString();

            // Set success state with concert ID
            setSuccess(true);
            setError('');

            // Store concert ID for display
            setConcertCreated({
                id: concertId,
                name: name,
                venue: venue,
                date: date
            });

            // Redirect to collections after 3 seconds
            setTimeout(() => {
                navigate('/collections');
            }, 3000);

        } catch (error) {
            console.error("Error creating concert:", error);
            let errorMessage = error.message;

            // Check for specific Solana errors
            if (errorMessage.includes("Attempt to debit an account but found no record of a prior credit")) {
                errorMessage = "Insufficient SOL balance. Please request an airdrop first.";
            }

            setError(errorMessage);
            setSuccess(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
            {/* Background effects */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600 filter blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-600 filter blur-3xl"></div>
            </div>

            <div className="max-w-4xl mx-auto relative">
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
                                <div className="bg-gray-800/50 rounded-lg p-6 mb-8">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-gray-400 text-sm">Wallet Address</p>
                                            <p className="text-white font-mono">{wallet.publicKey.toString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-400 text-sm">Balance</p>
                                            <p className="text-white font-medium">{balance.toFixed(4)} SOL</p>
                                        </div>
                                    </div>
                                    {walletError && (
                                        <p className="text-red-500 text-sm mt-2">{walletError}</p>
                                    )}
                                    <button
                                        onClick={handleAirdrop}
                                        disabled={airdropLoading}
                                        className={`mt-4 w-full bg-purple-600 text-white py-2 px-4 rounded-lg transition duration-300 ${airdropLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-purple-700'
                                            }`}
                                    >
                                        {airdropLoading ? 'Requesting...' : 'Request 2 SOL (Testnet Only)'}
                                    </button>
                                </div>

                                <form onSubmit={handleCreateConcert} className="space-y-6">
                                    <div>
                                        <label className="block text-gray-300 text-sm font-medium mb-2">
                                            Concert Name
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
                                            Venue
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
                                            Date
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
                                            Total Tickets
                                        </label>
                                        <input
                                            type="number"
                                            value={totalTickets}
                                            onChange={(e) => setTotalTickets(parseInt(e.target.value))}
                                            required
                                            min="1"
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                            placeholder="Enter total number of tickets"
                                        />
                                    </div>

                                    {error && (
                                        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
                                            <p className="text-red-500 text-sm">{error}</p>
                                        </div>
                                    )}

                                    {success && (
                                        <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
                                            <p className="text-green-500 text-sm">Concert created successfully!</p>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`w-full bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg group ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-purple-500/20'
                                            }`}
                                    >
                                        <div className="bg-gray-900 rounded-md py-3 px-6 text-white font-medium group-hover:bg-gray-900/80 transition duration-300">
                                            {loading ? (
                                                <span className="flex items-center justify-center">
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Creating...
                                                </span>
                                            ) : (
                                                'Create Concert'
                                            )}
                                        </div>
                                    </button>
                                </form>

                                {/* Transaction Fee Info */}
                                <div className="mt-8 text-center">
                                    <p className="text-gray-400 text-sm">
                                        Estimated transaction fee: <span className="text-purple-400">0.000005 SOL</span>
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
                        <h3 className="text-white font-semibold mb-2">Create Events</h3>
                        <p className="text-gray-400 text-sm">Set up your concert with customizable ticket types and pricing.</p>
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
                        <h3 className="text-white font-semibold mb-2">Manage Tickets</h3>
                        <p className="text-gray-400 text-sm">Control your ticket inventory and pricing in real-time.</p>
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
                        <h3 className="text-white font-semibold mb-2">Secure & Transparent</h3>
                        <p className="text-gray-400 text-sm">All transactions are recorded on the Solana blockchain.</p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default CreateConcert;