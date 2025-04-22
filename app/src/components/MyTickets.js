// src/components/MyTickets.js
import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProgram } from '../utils/anchor';

const MyTickets = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const wallet = useWallet();

    useEffect(() => {
        const fetchTickets = async () => {
            if (!wallet.connected) return;

            try {
                setLoading(true);
                const program = getProgram(wallet);

                // Fetch tickets owned by the current wallet
                // This is just a placeholder - you need to implement this based on your contract
                const userTickets = await program.account.ticket.all([
                    {
                        memcmp: {
                            offset: 8, // Assuming owner field is at offset 8
                            bytes: wallet.publicKey.toBase58()
                        }
                    }
                ]);

                setTickets(userTickets.map(ticket => ({
                    id: ticket.publicKey.toString(),
                    concertName: 'Loading...', // You'll need to fetch concert details separately
                    ticketType: ticket.account.ticketType,
                    seatNumber: ticket.account.seatNumber,
                    used: ticket.account.used
                })));

                // Fetch concert details for each ticket if needed

            } catch (error) {
                console.error("Error fetching tickets:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTickets();
    }, [wallet.connected, wallet.publicKey]);

    if (!wallet.connected) {
        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">My Tickets</h2>
                <p className="text-gray-400 mb-8">Connect your wallet to view your tickets</p>
                <button className="bg-purple-600 text-white py-3 px-6 rounded-lg">Connect Wallet</button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <h2 className="text-2xl font-bold text-white mb-8">My Tickets</h2>

            {loading ? (
                <div className="text-center py-12">
                    <p className="text-gray-400">Loading your tickets...</p>
                </div>
            ) : tickets.length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg">
                    <h3 className="text-xl font-medium text-white mb-2">No tickets found</h3>
                    <p className="text-gray-400 mb-6">You don't have any tickets yet.</p>
                    <a href="/explore" className="bg-purple-600 text-white py-3 px-6 rounded-lg inline-block">
                        Browse Concerts
                    </a>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tickets.map(ticket => (
                        <div key={ticket.id} className="bg-gray-800 rounded-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4">
                                <h3 className="text-white font-bold text-xl">{ticket.concertName}</h3>
                            </div>
                            <div className="p-6">
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-400">Ticket Type:</span>
                                    <span className="text-white">{ticket.ticketType}</span>
                                </div>
                                {ticket.seatNumber && (
                                    <div className="flex justify-between mb-2">
                                        <span className="text-gray-400">Seat:</span>
                                        <span className="text-white">{ticket.seatNumber}</span>
                                    </div>
                                )}
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-400">Status:</span>
                                    <span className={ticket.used ? "text-red-500" : "text-green-500"}>
                                        {ticket.used ? "Used" : "Valid"}
                                    </span>
                                </div>
                                <div className="mt-6">
                                    <button className="w-full bg-purple-600 text-white py-2 rounded-lg">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyTickets;