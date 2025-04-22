// src/pages/MyTicketsPage.jsx
import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import TicketList from '../components/ticket/TicketList';

const MyTicketsPage = () => {
    const { connected, publicKey } = useWallet();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fungsi untuk mengambil tiket dari blockchain atau API
        const fetchTickets = async () => {
            if (!connected || !publicKey) return;

            try {
                setLoading(true);
                // Di sini, Anda akan memanggil fungsi dari anchor.js
                // untuk mendapatkan tiket berdasarkan publicKey

                // Contoh data dummy untuk pengembangan UI
                const dummyTickets = [
                    {
                        id: '1',
                        concertName: 'Rock Revolution',
                        artist: 'The Amplifiers',
                        venue: 'Madison Square Garden',
                        date: '2025-05-22T20:00:00',
                        seatNumber: 'A-123',
                        ticketType: 'VIP',
                        price: 0.8,
                        imageUrl: 'https://via.placeholder.com/300'
                    },
                    {
                        id: '2',
                        concertName: 'Electronic Dreams',
                        artist: 'DJ Pulse',
                        venue: 'Club Nebula',
                        date: '2025-07-08T22:00:00',
                        seatNumber: 'General Admission',
                        ticketType: 'Regular',
                        price: 0.3,
                        imageUrl: 'https://via.placeholder.com/300'
                    }
                ];

                setTickets(dummyTickets);
            } catch (error) {
                console.error('Error fetching tickets:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTickets();
    }, [connected, publicKey]);

    if (!connected) {
        return (
            <div className="min-h-screen pt-24 pb-12 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-gray-800 rounded-lg py-10 px-6 text-center">
                        <h1 className="text-3xl font-bold text-white mb-4">My Tickets</h1>
                        <p className="text-gray-300 mb-6">Connect your wallet to view your tickets</p>
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">
                            Connect Wallet
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 px-4">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-8">My Tickets</h1>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                ) : tickets.length > 0 ? (
                    <TicketList tickets={tickets} />
                ) : (
                    <div className="bg-gray-800 rounded-lg py-10 px-6 text-center">
                        <p className="text-gray-300 mb-6">You don't have any tickets yet</p>
                        <a href="/explore" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">
                            Explore Concerts
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyTicketsPage;