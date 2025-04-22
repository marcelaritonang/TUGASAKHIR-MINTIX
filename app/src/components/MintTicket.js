import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { getProgram } from '../utils/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as anchor from '@project-serum/anchor';
import { motion } from 'framer-motion';

// Gradient text component
const GradientText = ({ text, className = "" }) => {
    return (
        <span className={`text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 ${className}`}>
            {text}
        </span>
    );
};

const MintTicket = () => {
    const [concert, setConcert] = useState('');
    const [ticketType, setTicketType] = useState('Regular');
    const [seatNumber, setSeatNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const wallet = useWallet();

    const handleMintTicket = async (e) => {
        e.preventDefault();
        if (!wallet.connected) return;

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const program = getProgram(wallet);

            // Validate concert selection
            if (!concert) {
                throw new Error("Please select a concert");
            }

            // Validate the concert ID is a valid public key
            let concertPublicKey;
            try {
                concertPublicKey = new PublicKey(concert);
            } catch (err) {
                throw new Error("Invalid concert public key");
            }

            // Generate keypairs untuk mint dan token account
            const mintKeypair = Keypair.generate();
            const tokenAccountKeypair = Keypair.generate();

            console.log("Mint pubkey:", mintKeypair.publicKey.toString());
            console.log("Token account pubkey:", tokenAccountKeypair.publicKey.toString());

            // 1. Pertama, jalankan initializeMint
            console.log("Initializing mint...");
            const initMintTx = await program.methods
                .initializeMint()
                .accounts({
                    authority: wallet.publicKey,
                    buyer: wallet.publicKey,
                    mint: mintKeypair.publicKey,
                    tokenAccount: tokenAccountKeypair.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                })
                .signers([mintKeypair, tokenAccountKeypair])
                .rpc();

            console.log("Mint initialized: ", initMintTx);

            // 2. Kemudian, buat ticket
            const ticketKeypair = Keypair.generate();

            console.log("Creating ticket...");
            const seatOption = seatNumber ? seatNumber : null;

            const createTicketTx = await program.methods
                .createTicket(ticketType, seatOption)
                .accounts({
                    authority: wallet.publicKey,
                    buyer: wallet.publicKey,
                    concert: concertPublicKey,
                    mint: mintKeypair.publicKey,
                    tokenAccount: tokenAccountKeypair.publicKey,
                    ticket: ticketKeypair.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([ticketKeypair])
                .rpc();

            console.log("Ticket created: ", createTicketTx);
            setSuccess(true);

            // Reset form
            setConcert('');
            setTicketType('Regular');
            setSeatNumber('');
        } catch (error) {
            console.error("Error minting ticket:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Ambil daftar konser untuk dropdown
    const [concerts, setConcerts] = useState([]);

    useEffect(() => {
        const fetchConcerts = async () => {
            if (!wallet.connected) return;

            try {
                const program = getProgram(wallet);
                // Fetch actual concerts from blockchain
                const concertAccounts = await program.account.concert.all();

                if (concertAccounts.length > 0) {
                    const concerts = concertAccounts.map(concert => ({
                        id: concert.publicKey.toString(),
                        name: concert.account.name,
                        date: new Date(concert.account.date * 1000).toLocaleDateString(),
                        price: concert.account.ticketPrice,
                        available: concert.account.totalTickets - concert.account.ticketsSold
                    }));
                    setConcerts(concerts);
                } else {
                    // No concerts found
                    console.log("No concerts found on blockchain");
                    setError("No concerts available. Please create a concert first.");
                }
            } catch (error) {
                console.error("Error fetching concerts:", error);
                setError("Failed to fetch concerts from blockchain");
            }
        };

        fetchConcerts();
    }, [wallet.connected]);

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
                            Mint <GradientText text="Concert Ticket" />
                        </h1>

                        {!wallet.connected ? (
                            <div className="text-center py-12">
                                <h3 className="text-xl text-white mb-6">Connect your wallet to mint a ticket</h3>
                                <WalletMultiButton className="!bg-gradient-to-br !from-purple-600 !to-indigo-600 hover:!shadow-lg hover:!shadow-purple-500/20 transition duration-300" />
                            </div>
                        ) : (
                            <form onSubmit={handleMintTicket} className="space-y-6">
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        Select Concert
                                    </label>
                                    <select
                                        value={concert}
                                        onChange={(e) => setConcert(e.target.value)}
                                        required
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                    >
                                        <option value="">-- Select a concert --</option>
                                        {concerts.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} - {c.date} ({c.price} SOL)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        Ticket Type
                                    </label>
                                    <div className="grid grid-cols-3 gap-4">
                                        {['Regular', 'VIP', 'Backstage'].map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setTicketType(type)}
                                                className={`py-3 px-4 rounded-lg border transition duration-300 ${ticketType === type
                                                        ? 'bg-purple-600 border-purple-500 text-white'
                                                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-500'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        Seat Number (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={seatNumber}
                                        onChange={(e) => setSeatNumber(e.target.value)}
                                        placeholder="e.g., A-123"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                {error && (
                                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
                                        <p className="text-red-500 text-sm">{error}</p>
                                    </div>
                                )}

                                {success && (
                                    <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
                                        <p className="text-green-500 text-sm">Ticket minted successfully!</p>
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
                                                Minting...
                                            </span>
                                        ) : (
                                            'Mint Ticket'
                                        )}
                                    </div>
                                </button>
                            </form>
                        )}

                        {/* Transaction Fee Info */}
                        <div className="mt-8 text-center">
                            <p className="text-gray-400 text-sm">
                                Estimated transaction fee: <span className="text-purple-400">0.000005 SOL</span>
                            </p>
                        </div>
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
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="text-white font-semibold mb-2">Secure Minting</h3>
                        <p className="text-gray-400 text-sm">Your tickets are minted as NFTs on Solana blockchain ensuring authenticity.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gray-800/50 rounded-lg p-6"
                    >
                        <div className="w-10 h-10 bg-purple-900/50 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="text-white font-semibold mb-2">Instant Transfer</h3>
                        <p className="text-gray-400 text-sm">Transfer or sell your tickets instantly with minimal fees.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gray-800/50 rounded-lg p-6"
                    >
                        <div className="w-10 h-10 bg-purple-900/50 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="text-white font-semibold mb-2">Multiple Types</h3>
                        <p className="text-gray-400 text-sm">Choose from Regular, VIP, and Backstage access levels.</p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default MintTicket;