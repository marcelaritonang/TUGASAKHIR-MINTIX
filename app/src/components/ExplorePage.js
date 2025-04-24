import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { getProgram } from '../utils/anchor';
import LoadingSpinner from './common/LoadingSpinner'; // Buat komponen ini terpisah

// Gradient text component untuk konsistensi
const GradientText = ({ text, className = "" }) => {
    return (
        <span className={`text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 ${className}`}>
            {text}
        </span>
    );
};

const ExplorePage = () => {
    const [loading, setLoading] = useState(true);
    const [concerts, setConcerts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date');
    const [searchQuery, setSearchQuery] = useState('');
    const wallet = useWallet();

    // Fungsi untuk mendapatkan konser dari blockchain dan static data
    const fetchConcerts = async () => {
        try {
            setLoading(true);

            let allConcerts = [];
            let blockchainConcerts = [];

            if (wallet.connected && wallet.publicKey) {
                const program = getProgram(wallet);
                const concertAccounts = await program.account.concert.all();

                blockchainConcerts = concertAccounts.map((account) => {
                    const concert = account.account;
                    return {
                        id: account.publicKey.toString(),
                        name: concert.name,
                        venue: concert.venue,
                        date: concert.date,
                        available: concert.totalTickets - concert.ticketsSold,
                        total: concert.totalTickets,
                        category: concert.category || 'uncategorized',
                        creator: concert.authority.toString(),
                        featured: Math.random() > 0.7 // Randomly feature some concerts
                    };
                });
            }

            // Static concerts untuk fallback
            const staticConcerts = [
                { id: 'static-1', name: 'EDM Festival 2025', venue: 'Metaverse Arena', date: 'Jun 15, 2025', available: 120, total: 500, category: 'festival', featured: true },
                { id: 'static-2', name: 'Rock Legends', venue: 'Crypto Stadium', date: 'Jul 22, 2025', available: 75, total: 300, category: 'rock', featured: false },
                { id: 'static-3', name: 'Jazz Night', venue: 'NFT Concert Hall', date: 'Aug 05, 2025', available: 50, total: 100, category: 'jazz', featured: true },
                { id: 'static-4', name: 'Classical Symphony', venue: 'Blockchain Theater', date: 'Sep 18, 2025', available: 25, total: 400, category: 'classical', featured: false },
                { id: 'static-5', name: 'Hip Hop Summit', venue: 'Web3 Arena', date: 'Oct 10, 2025', available: 200, total: 800, category: 'hiphop', featured: true },
                { id: 'static-6', name: 'Electronic Music Night', venue: 'Digital Dome', date: 'Nov 20, 2025', available: 150, total: 500, category: 'electronic', featured: false },
                { id: 'static-7', name: 'Pop Sensation', venue: 'Virtual Stadium', date: 'Dec 12, 2025', available: 300, total: 1000, category: 'pop', featured: true },
                { id: 'static-8', name: 'Country Music Festival', venue: 'Decentralized Park', date: 'Jan 25, 2026', available: 100, total: 350, category: 'country', featured: false },
            ];

            allConcerts = [...blockchainConcerts, ...staticConcerts];
            setConcerts(allConcerts);

            // Extract unique categories
            const uniqueCategories = [...new Set(allConcerts.map(concert => concert.category))];
            setCategories(uniqueCategories);
        } catch (error) {
            console.error("Error fetching concerts:", error);
        } finally {
            setLoading(false);
        }
    };

    // Load concerts on component mount and when wallet connection changes
    useEffect(() => {
        fetchConcerts();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchConcerts();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        let refreshInterval;
        if (wallet.connected) {
            refreshInterval = setInterval(() => {
                fetchConcerts();
            }, 30000);
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (refreshInterval) clearInterval(refreshInterval);
        };
    }, [wallet.connected, wallet.publicKey]);

    // Filter and sort concerts
    const filteredAndSortedConcerts = concerts
        .filter(concert => {
            // Category filter
            const categoryMatch = filter === 'all' || concert.category === filter;

            // Search filter
            const searchLower = searchQuery.toLowerCase();
            const searchMatch = !searchQuery ||
                concert.name.toLowerCase().includes(searchLower) ||
                concert.venue.toLowerCase().includes(searchLower);

            return categoryMatch && searchMatch;
        })
        .sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            } else if (sortBy === 'availability') {
                return (b.available / b.total) - (a.available / a.total);
            } else { // Sort by date
                // Assuming date format: MMM DD, YYYY
                return new Date(a.date) - new Date(b.date);
            }
        });

    // Featured concerts
    const featuredConcerts = concerts.filter(concert => concert.featured);

    return (
        <div className="min-h-screen bg-gray-900 pt-20 pb-16 px-4">
            {/* Hero Section */}
            <div className="max-w-7xl mx-auto mb-16">
                <div className="text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Explore <GradientText text="Upcoming Concerts" />
                    </h1>
                    <p className="text-gray-400 text-lg max-w-3xl mx-auto">
                        Discover and mint tickets for the hottest blockchain-powered concerts.
                        All tickets are minted as NFTs, ensuring authenticity and easy transfer.
                    </p>
                </div>
            </div>

            {/* Search and Filter Section */}
            <div className="max-w-7xl mx-auto mb-12">
                <div className="bg-gray-800/50 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search concerts or venues..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 pl-10"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </div>

                        {/* Category Filter */}
                        <div>
                            <select
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                onChange={(e) => setFilter(e.target.value)}
                                value={filter}
                            >
                                <option value="all">All Genres</option>
                                {categories.map(category => (
                                    <option key={category} value={category}>
                                        {category.charAt(0).toUpperCase() + category.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Sort By */}
                        <div>
                            <select
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                onChange={(e) => setSortBy(e.target.value)}
                                value={sortBy}
                            >
                                <option value="date">Sort by Date</option>
                                <option value="name">Sort by Name</option>
                                <option value="availability">Sort by Availability</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Featured Concerts */}
            {featuredConcerts.length > 0 && (
                <div className="max-w-7xl mx-auto mb-16">
                    <h2 className="text-2xl font-bold text-white mb-6">
                        <GradientText text="Featured" /> Concerts
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {featuredConcerts.slice(0, 3).map((concert, index) => (
                            <motion.div
                                key={concert.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg hover:shadow-lg hover:shadow-purple-500/20 transition-all hover:-translate-y-1 duration-300"
                            >
                                <div className="bg-gray-900 rounded-lg overflow-hidden h-full">
                                    <div
                                        className="h-48 bg-gradient-to-br from-indigo-900/80 to-purple-900/80 relative"
                                        style={{
                                            backgroundImage: "url('https://source.unsplash.com/random/800x600/?concert')",
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            backgroundBlendMode: 'overlay'
                                        }}
                                    >
                                        <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-3 py-1 m-2 rounded-full">
                                            Featured
                                        </div>
                                        <div className="absolute bottom-0 w-full bg-gradient-to-t from-gray-900 to-transparent p-4">
                                            <h3 className="text-white text-xl font-bold">{concert.name}</h3>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="text-gray-400 text-sm">{concert.venue}</div>
                                            <div className="text-gray-300 text-sm font-medium">{concert.date}</div>
                                        </div>
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center">
                                                <span className="text-gray-400 text-sm mr-2">Tickets:</span>
                                                <span className="text-white text-sm font-medium">{concert.available}/{concert.total}</span>
                                            </div>
                                            <div className="bg-purple-900/50 border border-purple-700/50 rounded-full px-2 py-1">
                                                <span className="text-purple-300 text-xs">{concert.category}</span>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/mint-ticket/${concert.id}`}
                                            className="block w-full bg-gradient-to-br from-pink-500 to-purple-600 p-0.5 rounded-lg hover:shadow-lg hover:shadow-pink-500/20 transition duration-300"
                                        >
                                            <div className="bg-gray-900 text-white text-center py-2 rounded-md text-sm font-medium hover:bg-gray-800/90 transition duration-300">
                                                Mint Ticket
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Concerts */}
            <div className="max-w-7xl mx-auto">
                <h2 className="text-2xl font-bold text-white mb-6">
                    <GradientText text="All" /> Concerts
                </h2>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <LoadingSpinner size="h-10 w-10" />
                    </div>
                ) : filteredAndSortedConcerts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {filteredAndSortedConcerts.map((concert, index) => (
                            <motion.div
                                key={concert.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                className="bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg hover:shadow-lg hover:shadow-purple-500/20 transition-all hover:-translate-y-1 duration-300"
                            >
                                <div className="bg-gray-900 p-4 rounded-lg h-full flex flex-col">
                                    <h3 className="text-white text-lg font-bold mb-2">{concert.name}</h3>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="text-gray-400 text-sm">{concert.venue}</div>
                                        <div className="text-gray-300 text-xs">{concert.date}</div>
                                    </div>
                                    <div className="mb-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-gray-400 text-xs">Available</span>
                                            <span className="text-white text-xs">{concert.available}/{concert.total}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                                style={{ width: `${(concert.available / concert.total) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="mb-3 flex-grow">
                                        <div className="inline-block bg-purple-900/50 border border-purple-700/50 rounded-full px-2 py-0.5">
                                            <span className="text-purple-300 text-xs">{concert.category}</span>
                                        </div>
                                    </div>
                                    <div className="mt-auto">
                                        <Link
                                            to={`/mint-ticket/${concert.id}`}
                                            className="block w-full bg-gradient-to-br from-pink-500 to-purple-600 p-0.5 rounded-lg hover:shadow-lg hover:shadow-pink-500/20 transition duration-300"
                                        >
                                            <div className="bg-gray-900 text-white text-center py-2 rounded-md text-xs font-medium hover:bg-gray-800/90 transition duration-300">
                                                Mint Ticket
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-gray-800/20 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-xl text-white mb-2">No concerts found</h3>
                        <p className="text-gray-400">Try adjusting your search or filters to find concerts.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExplorePage;