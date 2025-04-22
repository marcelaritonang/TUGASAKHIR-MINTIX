import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// Komponen GradientText konsisten dengan section lainnya
const GradientText = ({ text, className = "" }) => {
    return (
        <span className={`text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 ${className}`}>
            {text}
        </span>
    );
};

// Komponen CountdownTimer untuk menampilkan waktu mundur hingga konser dimulai
const CountdownTimer = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = new Date(targetDate) - new Date();

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                });
            }
        };

        const timer = setInterval(calculateTimeLeft, 1000);
        calculateTimeLeft();

        return () => clearInterval(timer);
    }, [targetDate]);

    return (
        <div className="flex justify-center space-x-3 md:space-x-4">
            <div className="flex flex-col items-center">
                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg">
                    <div className="bg-gray-900 px-3 py-2 rounded-md">
                        <span className="text-white text-xl md:text-2xl font-bold">{timeLeft.days}</span>
                    </div>
                </div>
                <span className="text-gray-400 text-xs mt-1">Days</span>
            </div>
            <div className="flex flex-col items-center">
                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg">
                    <div className="bg-gray-900 px-3 py-2 rounded-md">
                        <span className="text-white text-xl md:text-2xl font-bold">{timeLeft.hours}</span>
                    </div>
                </div>
                <span className="text-gray-400 text-xs mt-1">Hours</span>
            </div>
            <div className="flex flex-col items-center">
                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg">
                    <div className="bg-gray-900 px-3 py-2 rounded-md">
                        <span className="text-white text-xl md:text-2xl font-bold">{timeLeft.minutes}</span>
                    </div>
                </div>
                <span className="text-gray-400 text-xs mt-1">Minutes</span>
            </div>
            <div className="flex flex-col items-center">
                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg">
                    <div className="bg-gray-900 px-3 py-2 rounded-md">
                        <span className="text-white text-xl md:text-2xl font-bold">{timeLeft.seconds}</span>
                    </div>
                </div>
                <span className="text-gray-400 text-xs mt-1">Seconds</span>
            </div>
        </div>
    );
};

// Komponen UpcomingConcertCard untuk menampilkan konser yang akan datang
const UpcomingConcertCard = ({ concert, index }) => {
    // Pilih background image berdasarkan index untuk variasi
    const previewImages = [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='0' x2='0' y1='0' y2='100%25' gradientTransform='rotate(240)'%3E%3Cstop offset='0' stop-color='%234338ca'/%3E%3Cstop offset='1' stop-color='%23a855f7'/%3E%3C/linearGradient%3E%3Cpattern patternUnits='userSpaceOnUse' id='b' width='300' height='250' x='0' y='0' viewBox='0 0 1080 900'%3E%3Cg fill-opacity='0.05'%3E%3Cpolygon fill='%23444' points='90 150 0 300 180 300'/%3E%3Cpolygon points='90 150 180 0 0 0'/%3E%3Cpolygon fill='%23AAA' points='270 150 360 0 180 0'/%3E%3Cpolygon fill='%23DDD' points='450 150 360 300 540 300'/%3E%3Cpolygon fill='%23999' points='450 150 540 0 360 0'/%3E%3Cpolygon points='630 150 540 300 720 300'/%3E%3Cpolygon fill='%23DDD' points='630 150 720 0 540 0'/%3E%3Cpolygon fill='%23444' points='810 150 720 300 900 300'/%3E%3Cpolygon fill='%23FFF' points='810 150 900 0 720 0'/%3E%3Cpolygon fill='%23DDD' points='990 150 900 300 1080 300'/%3E%3Cpolygon fill='%23444' points='990 150 1080 0 900 0'/%3E%3Cpolygon fill='%23DDD' points='90 450 0 600 180 600'/%3E%3Cpolygon points='90 450 180 300 0 300'/%3E%3Cpolygon fill='%23666' points='270 450 180 600 360 600'/%3E%3Cpolygon fill='%23AAA' points='270 450 360 300 180 300'/%3E%3Cpolygon fill='%23DDD' points='450 450 360 600 540 600'/%3E%3Cpolygon fill='%23999' points='450 450 540 300 360 300'/%3E%3Cpolygon fill='%23999' points='630 450 540 600 720 600'/%3E%3Cpolygon fill='%23FFF' points='630 450 720 300 540 300'/%3E%3Cpolygon points='810 450 720 600 900 600'/%3E%3Cpolygon fill='%23DDD' points='810 450 900 300 720 300'/%3E%3Cpolygon fill='%23AAA' points='990 450 900 600 1080 600'/%3E%3Cpolygon fill='%23444' points='990 450 1080 300 900 300'/%3E%3Cpolygon fill='%23222' points='90 750 0 900 180 900'/%3E%3Cpolygon points='270 750 180 900 360 900'/%3E%3Cpolygon fill='%23DDD' points='270 750 360 600 180 600'/%3E%3Cpolygon points='450 750 540 600 360 600'/%3E%3Cpolygon points='630 750 540 900 720 900'/%3E%3Cpolygon fill='%23444' points='630 750 720 600 540 600'/%3E%3Cpolygon fill='%23AAA' points='810 750 720 900 900 900'/%3E%3Cpolygon fill='%23666' points='810 750 900 600 720 600'/%3E%3Cpolygon fill='%23999' points='990 750 900 900 1080 900'/%3E%3Cpolygon fill='%23999' points='180 0 90 150 270 150'/%3E%3Cpolygon fill='%23444' points='360 0 270 150 450 150'/%3E%3Cpolygon fill='%23FFF' points='540 0 450 150 630 150'/%3E%3Cpolygon points='900 0 810 150 990 150'/%3E%3Cpolygon fill='%23222' points='0 300 -90 450 90 450'/%3E%3Cpolygon fill='%23FFF' points='0 300 90 150 -90 150'/%3E%3Cpolygon fill='%23FFF' points='180 300 90 450 270 450'/%3E%3Cpolygon fill='%23666' points='180 300 270 150 90 150'/%3E%3Cpolygon fill='%23222' points='360 300 270 450 450 450'/%3E%3Cpolygon fill='%23FFF' points='360 300 450 150 270 150'/%3E%3Cpolygon fill='%23444' points='540 300 450 450 630 450'/%3E%3Cpolygon fill='%23222' points='540 300 630 150 450 150'/%3E%3Cpolygon fill='%23AAA' points='720 300 630 450 810 450'/%3E%3Cpolygon fill='%23666' points='720 300 810 150 630 150'/%3E%3Cpolygon fill='%23FFF' points='900 300 810 450 990 450'/%3E%3Cpolygon fill='%23999' points='900 300 990 150 810 150'/%3E%3Cpolygon points='0 600 -90 750 90 750'/%3E%3Cpolygon fill='%23666' points='0 600 90 450 -90 450'/%3E%3Cpolygon fill='%23AAA' points='180 600 90 750 270 750'/%3E%3Cpolygon fill='%23444' points='180 600 270 450 90 450'/%3E%3Cpolygon fill='%23444' points='360 600 270 750 450 750'/%3E%3Cpolygon fill='%23999' points='360 600 450 450 270 450'/%3E%3Cpolygon fill='%23666' points='540 600 630 450 450 450'/%3E%3Cpolygon fill='%23222' points='720 600 630 750 810 750'/%3E%3Cpolygon fill='%23FFF' points='900 600 810 750 990 750'/%3E%3Cpolygon fill='%23222' points='900 600 990 450 810 450'/%3E%3Cpolygon fill='%23DDD' points='0 900 90 750 -90 750'/%3E%3Cpolygon fill='%23444' points='180 900 270 750 90 750'/%3E%3Cpolygon fill='%23FFF' points='360 900 450 750 270 750'/%3E%3Cpolygon fill='%23AAA' points='540 900 630 750 450 750'/%3E%3Cpolygon fill='%23FFF' points='720 900 810 750 630 750'/%3E%3Cpolygon fill='%23222' points='900 900 990 750 810 750'/%3E%3Cpolygon fill='%23222' points='1080 300 990 450 1170 450'/%3E%3Cpolygon fill='%23FFF' points='1080 300 1170 150 990 150'/%3E%3Cpolygon points='1080 600 990 750 1170 750'/%3E%3Cpolygon fill='%23666' points='1080 600 1170 450 990 450'/%3E%3Cpolygon fill='%23DDD' points='1080 900 1170 750 990 750'/%3E%3C/g%3E%3C/pattern%3E%3C/defs%3E%3Crect x='0' y='0' fill='url(%23a)' width='100%25' height='100%25'/%3E%3Crect x='0' y='0' fill='url(%23b)' width='100%25' height='100%25'/%3E%3C/svg%3E"
    ];

    const imgIndex = parseInt(index) % previewImages.length;
    const previewImage = previewImages[imgIndex];

    // Konversikan tanggal konser menjadi objek Date
    const concertDate = new Date(concert.dateTime);

    // Format tanggal untuk ditampilkan
    const formattedDate = new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(concertDate);

    // Format waktu untuk ditampilkan
    const formattedTime = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(concertDate);

    // Cek apakah waktu minting sudah dibuka (misalnya 14 hari sebelum konser)
    const mintingStartDate = new Date(concertDate.getTime() - (14 * 24 * 60 * 60 * 1000));
    const currentDate = new Date();
    const isMintingOpen = currentDate >= mintingStartDate;

    return (
        <motion.div
            className="shadow-xl rounded-lg overflow-hidden relative"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
            {/* Warna border ungu seperti di NFT Ticket */}
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg">
                {/* Background dalam berwarna gelap seperti di NFT Ticket */}
                <div className="w-full h-full bg-gray-900 p-4 rounded-md">
                    <div
                        className="h-48 rounded-md overflow-hidden mb-4 relative"
                        style={{
                            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url("${previewImage}")`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}
                    >
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                            <h3 className="text-white text-xl font-bold mb-2">{concert.name}</h3>

                            {/* Countdown timer untuk konser ini */}
                            <div className="mt-4">
                                <CountdownTimer targetDate={concert.dateTime} />
                            </div>
                        </div>

                        {/* Status label - untuk informasi minting */}
                        {isMintingOpen ? (
                            <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                                Minting Open
                            </div>
                        ) : (
                            <div className="absolute top-3 right-3 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                                Minting Soon
                            </div>
                        )}
                    </div>

                    {/* Informasi konser */}
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Date</span>
                            <span className="text-white text-sm font-medium">{formattedDate}</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Time</span>
                            <span className="text-white text-sm font-medium">{formattedTime}</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Venue</span>
                            <span className="text-white text-sm font-medium">{concert.venue}</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Price</span>
                            <span className="text-white text-sm font-medium">{concert.price} SOL</span>
                        </div>
                    </div>

                    {/* Progress bar untuk jumlah tiket yang tersedia */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400 text-xs">Available tickets</span>
                            <span className="text-white text-xs font-medium">{concert.available}/{concert.total}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                style={{ width: `${(concert.available / concert.total) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Tombol aksi */}
                    <div className="space-y-2">
                        <Link
                            to={`/concert/${concert.id}`}
                            className="block w-full bg-gradient-to-br from-indigo-600 to-purple-600 p-0.5 rounded-lg hover:shadow-lg hover:shadow-purple-500/20 transition duration-300"
                        >
                            <div className="bg-gray-900 text-white text-center py-2 rounded-md text-sm font-medium hover:bg-gray-800/90 transition duration-300">
                                View Details
                            </div>
                        </Link>

                        {isMintingOpen ? (
                            <Link
                                to={`/mint-ticket/${concert.id}`}
                                className="block w-full bg-gradient-to-br from-pink-500 to-purple-600 p-0.5 rounded-lg hover:shadow-lg hover:shadow-pink-500/20 transition duration-300"
                            >
                                <div className="bg-gray-900 text-white text-center py-2 rounded-md text-sm font-medium hover:bg-gray-800/90 transition duration-300">
                                    Mint NFT Ticket
                                </div>
                            </Link>
                        ) : (
                            <button
                                disabled
                                className="block w-full bg-gradient-to-br from-gray-500 to-gray-600 p-0.5 rounded-lg cursor-not-allowed"
                            >
                                <div className="bg-gray-900 text-gray-400 text-center py-2 rounded-md text-sm font-medium">
                                    Minting Not Available
                                </div>
                            </button>
                        )}
                    </div>

                    {/* Status minting */}
                    {!isMintingOpen && (
                        <div className="mt-3 text-center">
                            <p className="text-xs text-gray-400">
                                Minting opens on {new Intl.DateTimeFormat('en-US', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                }).format(mintingStartDate)}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const UpcomingConcertsSection = () => {
    const [loading, setLoading] = useState(true);
    const [upcomingConcerts, setUpcomingConcerts] = useState([]);

    // Data konser yang akan datang - nantinya akan diambil dari API/Smart Contract
    const concertData = [
        {
            id: 101,
            name: "Solana Summer Fest 2025",
            venue: "Metaverse Stadium Jakarta",
            dateTime: "2025-05-25T19:30:00",
            price: 0.5, // Price in SOL
            available: 450,
            total: 500,
            description: "The biggest crypto music festival featuring top artists in the metaverse"
        },
        {
            id: 102,
            name: "Electronic Dance Festival",
            venue: "Blockchain Arena Bali",
            dateTime: "2025-06-12T20:00:00",
            price: 0.3,
            available: 280,
            total: 350,
            description: "An immersive EDM festival with international DJs and blockchain experiences"
        },
        {
            id: 103,
            name: "Web3 Symphony Concert",
            venue: "Web3 Concert Hall Bandung",
            dateTime: "2025-07-05T18:00:00",
            price: 0.8,
            available: 120,
            total: 200,
            description: "The first classical orchestra concert with exclusive NFT tickets and digital merchandise"
        }
    ];

    // Simulasi loading data dari API/Smart Contract
    useEffect(() => {
        const fetchConcerts = async () => {
            try {
                // Di sini nantinya akan ada kode untuk mengambil data dari API atau Smart Contract
                // Untuk sekarang, simulasikan loading dengan setTimeout
                setTimeout(() => {
                    setUpcomingConcerts(concertData);
                    setLoading(false);
                }, 1000);
            } catch (error) {
                console.error("Error fetching upcoming concerts:", error);
                setLoading(false);
            }
        };

        fetchConcerts();
    }, []);

    return (
        <section className="py-16 px-4 bg-gray-900 relative overflow-hidden -mt-px">
            {/* Background subtle effect */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-indigo-600 filter blur-3xl"></div>
                <div className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-purple-600 filter blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto relative">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Upcoming <GradientText text="Concerts" />
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Schedule your calendar and get exclusive NFT tickets for the following concerts
                    </p>
                </motion.div>

                {loading ? (
                    // Loading state
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                ) : upcomingConcerts.length > 0 ? (
                    // Daftar konser yang akan datang
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {upcomingConcerts.map((concert, index) => (
                            <UpcomingConcertCard
                                key={concert.id}
                                concert={concert}
                                index={index}
                            />
                        ))}
                    </div>
                ) : (
                    // Tampilan jika tidak ada konser yang akan datang
                    <div className="bg-gray-800/50 rounded-lg p-8 text-center">
                        <h3 className="text-white text-xl mb-2">No upcoming concerts</h3>
                        <p className="text-gray-400">Stay tuned for our newest concert announcements</p>
                    </div>
                )}

                {/* CTA untuk melihat semua konser */}
                <div className="mt-12 text-center">
                    <Link
                        to="/explore"
                        className="bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg shadow-lg hover:shadow-purple-500/30 transition duration-300 inline-block"
                    >
                        <div className="bg-gray-900 text-white px-6 py-3 rounded-md hover:bg-gray-800/90 transition duration-300 font-medium">
                            View All Concerts
                        </div>
                    </Link>
                </div>

                {/* Informasi tambahan berdasarkan fakta Solana */}
                <motion.div
                    className="mt-16 bg-gradient-to-r from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-lg p-6 border border-purple-900/30"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    viewport={{ once: true }}
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                        <div>
                            <div className="text-purple-400 text-2xl font-bold mb-2">400ms</div>
                            <p className="text-white font-medium mb-1">Block Time</p>
                            <p className="text-gray-400 text-sm">Ultra-fast transaction confirmation</p>
                        </div>
                        <div>
                            <div className="text-purple-400 text-2xl font-bold mb-2">~0.1%</div>
                            <p className="text-white font-medium mb-1">Average Fee</p>
                            <p className="text-gray-400 text-sm">Of transaction value</p>
                        </div>
                        <div>
                            <div className="text-purple-400 text-2xl font-bold mb-2">65,000+</div>
                            <p className="text-white font-medium mb-1">TPS</p>
                            <p className="text-gray-400 text-sm">Transactions per second on Solana</p>
                        </div>
                    </div>
                </motion.div>

                {/* Informasi minting untuk konser mendatang */}
                <div className="mt-8 text-center bg-gray-800/30 p-4 rounded-lg">
                    <p className="text-sm text-gray-300">
                        <span className="text-purple-400 font-bold">Note:</span> NFT ticket minting for upcoming concerts will open 14 days before the concert date.
                        Early bird gets priority minting with lower gas fees.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default UpcomingConcertsSection;