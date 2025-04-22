import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// NFT Card component
const NFTCard = ({ delay, rotate, scale, x, y, index }) => {
    // Array gambar preview untuk tiket
    const previewImages = [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='0' x2='0' y1='0' y2='100%25' gradientTransform='rotate(240)'%3E%3Cstop offset='0' stop-color='%234338ca'/%3E%3Cstop offset='1' stop-color='%23a855f7'/%3E%3C/linearGradient%3E%3Cpattern patternUnits='userSpaceOnUse' id='b' width='300' height='250' x='0' y='0' viewBox='0 0 1080 900'%3E%3Cg fill-opacity='0.05'%3E%3Cpolygon fill='%23444' points='90 150 0 300 180 300'/%3E%3Cpolygon points='90 150 180 0 0 0'/%3E%3Cpolygon fill='%23AAA' points='270 150 360 0 180 0'/%3E%3Cpolygon fill='%23DDD' points='450 150 360 300 540 300'/%3E%3Cpolygon fill='%23999' points='450 150 540 0 360 0'/%3E%3Cpolygon points='630 150 540 300 720 300'/%3E%3Cpolygon fill='%23DDD' points='630 150 720 0 540 0'/%3E%3Cpolygon fill='%23444' points='810 150 720 300 900 300'/%3E%3Cpolygon fill='%23FFF' points='810 150 900 0 720 0'/%3E%3Cpolygon fill='%23DDD' points='990 150 900 300 1080 300'/%3E%3Cpolygon fill='%23444' points='990 150 1080 0 900 0'/%3E%3Cpolygon fill='%23DDD' points='90 450 0 600 180 600'/%3E%3Cpolygon points='90 450 180 300 0 300'/%3E%3Cpolygon fill='%23666' points='270 450 180 600 360 600'/%3E%3Cpolygon fill='%23AAA' points='270 450 360 300 180 300'/%3E%3Cpolygon fill='%23DDD' points='450 450 360 600 540 600'/%3E%3Cpolygon fill='%23999' points='450 450 540 300 360 300'/%3E%3Cpolygon fill='%23999' points='630 450 540 600 720 600'/%3E%3Cpolygon fill='%23FFF' points='630 450 720 300 540 300'/%3E%3Cpolygon points='810 450 720 600 900 600'/%3E%3Cpolygon fill='%23DDD' points='810 450 900 300 720 300'/%3E%3Cpolygon fill='%23AAA' points='990 450 900 600 1080 600'/%3E%3Cpolygon fill='%23444' points='990 450 1080 300 900 300'/%3E%3Cpolygon fill='%23222' points='90 750 0 900 180 900'/%3E%3Cpolygon points='270 750 180 900 360 900'/%3E%3Cpolygon fill='%23DDD' points='270 750 360 600 180 600'/%3E%3Cpolygon points='450 750 540 600 360 600'/%3E%3Cpolygon points='630 750 540 900 720 900'/%3E%3Cpolygon fill='%23444' points='630 750 720 600 540 600'/%3E%3Cpolygon fill='%23AAA' points='810 750 720 900 900 900'/%3E%3Cpolygon fill='%23666' points='810 750 900 600 720 600'/%3E%3Cpolygon fill='%23999' points='990 750 900 900 1080 900'/%3E%3Cpolygon fill='%23999' points='180 0 90 150 270 150'/%3E%3Cpolygon fill='%23444' points='360 0 270 150 450 150'/%3E%3Cpolygon fill='%23FFF' points='540 0 450 150 630 150'/%3E%3Cpolygon points='900 0 810 150 990 150'/%3E%3Cpolygon fill='%23222' points='0 300 -90 450 90 450'/%3E%3Cpolygon fill='%23FFF' points='0 300 90 150 -90 150'/%3E%3Cpolygon fill='%23FFF' points='180 300 90 450 270 450'/%3E%3Cpolygon fill='%23666' points='180 300 270 150 90 150'/%3E%3Cpolygon fill='%23222' points='360 300 270 450 450 450'/%3E%3Cpolygon fill='%23FFF' points='360 300 450 150 270 150'/%3E%3Cpolygon fill='%23444' points='540 300 450 450 630 450'/%3E%3Cpolygon fill='%23222' points='540 300 630 150 450 150'/%3E%3Cpolygon fill='%23AAA' points='720 300 630 450 810 450'/%3E%3Cpolygon fill='%23666' points='720 300 810 150 630 150'/%3E%3Cpolygon fill='%23FFF' points='900 300 810 450 990 450'/%3E%3Cpolygon fill='%23999' points='900 300 990 150 810 150'/%3E%3Cpolygon points='0 600 -90 750 90 750'/%3E%3Cpolygon fill='%23666' points='0 600 90 450 -90 450'/%3E%3Cpolygon fill='%23AAA' points='180 600 90 750 270 750'/%3E%3Cpolygon fill='%23444' points='180 600 270 450 90 450'/%3E%3Cpolygon fill='%23444' points='360 600 270 750 450 750'/%3E%3Cpolygon fill='%23999' points='360 600 450 450 270 450'/%3E%3Cpolygon fill='%23666' points='540 600 630 450 450 450'/%3E%3Cpolygon fill='%23222' points='720 600 630 750 810 750'/%3E%3Cpolygon fill='%23FFF' points='900 600 810 750 990 750'/%3E%3Cpolygon fill='%23222' points='900 600 990 450 810 450'/%3E%3Cpolygon fill='%23DDD' points='0 900 90 750 -90 750'/%3E%3Cpolygon fill='%23444' points='180 900 270 750 90 750'/%3E%3Cpolygon fill='%23FFF' points='360 900 450 750 270 750'/%3E%3Cpolygon fill='%23AAA' points='540 900 630 750 450 750'/%3E%3Cpolygon fill='%23FFF' points='720 900 810 750 630 750'/%3E%3Cpolygon fill='%23222' points='900 900 990 750 810 750'/%3E%3Cpolygon fill='%23222' points='1080 300 990 450 1170 450'/%3E%3Cpolygon fill='%23FFF' points='1080 300 1170 150 990 150'/%3E%3Cpolygon points='1080 600 990 750 1170 750'/%3E%3Cpolygon fill='%23666' points='1080 600 1170 450 990 450'/%3E%3Cpolygon fill='%23DDD' points='1080 900 1170 750 990 750'/%3E%3C/g%3E%3C/pattern%3E%3C/defs%3E%3Crect x='0' y='0' fill='url(%23a)' width='100%25' height='100%25'/%3E%3Crect x='0' y='0' fill='url(%23b)' width='100%25' height='100%25'/%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 800 800'%3E%3Cdefs%3E%3CradialGradient id='a' cx='400' cy='400' r='50%25' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%236d28d9'/%3E%3Cstop offset='1' stop-color='%23312e81'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='400' cy='400' r='70%25' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23A855F7'/%3E%3Cstop offset='1' stop-color='%23312E81'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect fill='url(%23a)' width='800' height='800'/%3E%3Cg fill-opacity='0.3'%3E%3Ccircle fill='url(%23b)' cx='267.5' cy='61' r='300'/%3E%3Ccircle fill='url(%23b)' cx='532.5' cy='61' r='300'/%3E%3Ccircle fill='url(%23b)' cx='400' cy='30' r='300'/%3E%3C/g%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='0' x2='0' y1='0' y2='100%25' gradientTransform='rotate(240)'%3E%3Cstop offset='0' stop-color='%232563eb'/%3E%3Cstop offset='1' stop-color='%236d28d9'/%3E%3C/linearGradient%3E%3Cpattern patternUnits='userSpaceOnUse' id='b' width='540' height='450' x='0' y='0' viewBox='0 0 1080 900'%3E%3Cg fill-opacity='0.1'%3E%3Cpolygon fill='%23444' points='90 150 0 300 180 300'/%3E%3Cpolygon points='90 150 180 0 0 0'/%3E%3Cpolygon fill='%23AAA' points='270 150 360 0 180 0'/%3E%3Cpolygon fill='%23DDD' points='450 150 360 300 540 300'/%3E%3Cpolygon fill='%23999' points='450 150 540 0 360 0'/%3E%3Cpolygon points='630 150 540 300 720 300'/%3E%3Cpolygon fill='%23DDD' points='630 150 720 0 540 0'/%3E%3Cpolygon fill='%23444' points='810 150 720 300 900 300'/%3E%3Cpolygon fill='%23FFF' points='810 150 900 0 720 0'/%3E%3Cpolygon fill='%23DDD' points='990 150 900 300 1080 300'/%3E%3Cpolygon fill='%23444' points='990 150 1080 0 900 0'/%3E%3Cpolygon fill='%23DDD' points='90 450 0 600 180 600'/%3E%3Cpolygon points='90 450 180 300 0 300'/%3E%3Cpolygon fill='%23666' points='270 450 180 600 360 600'/%3E%3Cpolygon fill='%23AAA' points='270 450 360 300 180 300'/%3E%3Cpolygon fill='%23DDD' points='450 450 360 600 540 600'/%3E%3Cpolygon fill='%23999' points='450 450 540 300 360 300'/%3E%3Cpolygon fill='%23999' points='630 450 540 600 720 600'/%3E%3Cpolygon fill='%23FFF' points='630 450 720 300 540 300'/%3E%3Cpolygon points='810 450 720 600 900 600'/%3E%3Cpolygon fill='%23DDD' points='810 450 900 300 720 300'/%3E%3Cpolygon fill='%23AAA' points='990 450 900 600 1080 600'/%3E%3Cpolygon fill='%23444' points='990 450 1080 300 900 300'/%3E%3Cpolygon fill='%23222' points='90 750 0 900 180 900'/%3E%3Cpolygon points='270 750 180 900 360 900'/%3E%3Cpolygon fill='%23DDD' points='270 750 360 600 180 600'/%3E%3Cpolygon points='450 750 540 600 360 600'/%3E%3Cpolygon points='630 750 540 900 720 900'/%3E%3Cpolygon fill='%23444' points='630 750 720 600 540 600'/%3E%3Cpolygon fill='%23AAA' points='810 750 720 900 900 900'/%3E%3Cpolygon fill='%23666' points='810 750 900 600 720 600'/%3E%3Cpolygon fill='%23999' points='990 750 900 900 1080 900'/%3E%3Cpolygon fill='%23999' points='180 0 90 150 270 150'/%3E%3Cpolygon fill='%23444' points='360 0 270 150 450 150'/%3E%3Cpolygon fill='%23FFF' points='540 0 450 150 630 150'/%3E%3Cpolygon points='900 0 810 150 990 150'/%3E%3Cpolygon fill='%23222' points='0 300 -90 450 90 450'/%3E%3Cpolygon fill='%23FFF' points='0 300 90 150 -90 150'/%3E%3Cpolygon fill='%23FFF' points='180 300 90 450 270 450'/%3E%3Cpolygon fill='%23666' points='180 300 270 150 90 150'/%3E%3Cpolygon fill='%23222' points='360 300 270 450 450 450'/%3E%3Cpolygon fill='%23FFF' points='360 300 450 150 270 150'/%3E%3Cpolygon fill='%23444' points='540 300 450 450 630 450'/%3E%3Cpolygon fill='%23222' points='540 300 630 150 450 150'/%3E%3Cpolygon fill='%23AAA' points='720 300 630 450 810 450'/%3E%3Cpolygon fill='%23666' points='720 300 810 150 630 150'/%3E%3Cpolygon fill='%23FFF' points='900 300 810 450 990 450'/%3E%3Cpolygon fill='%23999' points='900 300 990 150 810 150'/%3E%3Cpolygon points='0 600 -90 750 90 750'/%3E%3Cpolygon fill='%23666' points='0 600 90 450 -90 450'/%3E%3Cpolygon fill='%23AAA' points='180 600 90 750 270 750'/%3E%3Cpolygon fill='%23444' points='180 600 270 450 90 450'/%3E%3Cpolygon fill='%23444' points='360 600 270 750 450 750'/%3E%3Cpolygon fill='%23999' points='360 600 450 450 270 450'/%3E%3Cpolygon fill='%23666' points='540 600 630 450 450 450'/%3E%3Cpolygon fill='%23222' points='720 600 630 750 810 750'/%3E%3Cpolygon fill='%23FFF' points='900 600 810 750 990 750'/%3E%3Cpolygon fill='%23222' points='900 600 990 450 810 450'/%3E%3Cpolygon fill='%23DDD' points='0 900 90 750 -90 750'/%3E%3Cpolygon fill='%23444' points='180 900 270 750 90 750'/%3E%3Cpolygon fill='%23FFF' points='360 900 450 750 270 750'/%3E%3Cpolygon fill='%23AAA' points='540 900 630 750 450 750'/%3E%3Cpolygon fill='%23FFF' points='720 900 810 750 630 750'/%3E%3Cpolygon fill='%23222' points='900 900 990 750 810 750'/%3E%3Cpolygon fill='%23222' points='1080 300 990 450 1170 450'/%3E%3Cpolygon fill='%23FFF' points='1080 300 1170 150 990 150'/%3E%3Cpolygon points='1080 600 990 750 1170 750'/%3E%3Cpolygon fill='%23666' points='1080 600 1170 450 990 450'/%3E%3Cpolygon fill='%23DDD' points='1080 900 1170 750 990 750'/%3E%3C/g%3E%3C/pattern%3E%3C/defs%3E%3Crect x='0' y='0' fill='url(%23a)' width='100%25' height='100%25'/%3E%3Crect x='0' y='0' fill='url(%23b)' width='100%25' height='100%25'/%3E%3C/svg%3E"
    ];

    // Pilih gambar preview secara acak berdasarkan index
    const imgIndex = parseInt(index) % previewImages.length;
    const previewImage = previewImages[imgIndex];

    return (
        <motion.div
            className="absolute shadow-xl rounded-lg overflow-hidden hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 transform hover:-translate-y-2"
            style={{ width: '180px', height: '240px', zIndex: 5 + parseInt(index) % 4 }}
            initial={{ opacity: 0, scale: 0.8, y: 100, rotate: rotate }}
            animate={{
                opacity: 1,
                scale: scale,
                y: y,
                x: x,
                rotate: rotate
            }}
            transition={{
                duration: 1.5,
                delay: delay,
                ease: "easeOut"
            }}
            whileHover={{
                scale: scale * 1.1,
                rotate: 0,
                zIndex: 20
            }}
        >
            {/* Kotak luar dengan warna ungu */}
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5">
                {/* Kotak dalam dengan warna gelap */}
                <div className="w-full h-full bg-gray-900 p-2.5 rounded-sm">
                    {/* Bagian gambar/preview tiket dengan SVG background yang lebih menarik */}
                    <div
                        className="bg-gray-900 rounded-md h-3/5 mb-2 overflow-hidden border border-purple-800"
                        style={{
                            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url("${previewImage}")`,
                            backgroundSize: 'cover',
                            opacity: 0.9
                        }}
                    >
                        <div className="flex items-center justify-center h-full">
                            <span className="text-xs font-bold text-white bg-black/80 px-2 py-1 rounded backdrop-blur-sm border border-purple-900/50">
                                MINTIX NFT
                            </span>
                        </div>
                    </div>
                    <div className="h-1/5">
                        <div className="text-gray-200 text-xs font-bold">Mintix #{index}</div>
                        <div className="text-purple-400/70 text-xs">2025 • Virtual Arena</div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <div className="bg-purple-900/50 border border-purple-700/50 rounded-full w-8 h-8 flex items-center justify-center">
                            <span className="text-purple-300/80 text-xs">M</span>
                        </div>
                        <div className="text-right">
                            <div className="text-gray-300/80 text-xs font-bold">#{index}</div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// Feature item component
const FeatureItem = ({ icon, title, description }) => {
    return (
        <div className="mb-3 flex items-start bg-gray-800/40 rounded-lg p-3 border-l-2 border-purple-500">
            <div className="text-purple-400 mr-3 mt-1 bg-purple-900/30 p-2 rounded-lg">{icon}</div>
            <div>
                <h3 className="text-white font-semibold text-sm">{title}</h3>
                <p className="text-gray-400 text-xs">{description}</p>
            </div>
        </div>
    );
};

// Animated gradient text component
const AnimatedGradientText = ({ text, className = "", gradient = "from-purple-500 via-pink-500 to-blue-500" }) => {
    return (
        <motion.span
            className={`inline-block ${className}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <span className={`bg-gradient-to-r ${gradient} text-transparent bg-clip-text animate-gradient-x`}>
                {text}
            </span>
        </motion.span>
    );
};

const HeroSection = () => {
    return (
        <section className="bg-gray-900 py-12 md:py-16 px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-64px)] flex items-center">
            {/* Background gradient effect */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20">
                <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-purple-600 filter blur-3xl"></div>
                <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-indigo-600 filter blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto w-full">
                {/* Two-column layout with text on left, NFT cards on right */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between md:gap-12 lg:gap-16">
                    {/* Left Column - Text Content */}
                    <div className="md:w-1/2 mb-12 md:mb-0 space-y-5">
                        <div className="space-y-2">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                                <span className="text-white">SECURE</span>{' '}
                                <AnimatedGradientText text="COST" className="font-black" gradient="from-blue-500 via-purple-500 to-pink-500" />
                            </h1>
                        </div>

                        <p className="text-gray-300 text-base leading-relaxed">
                            Premium NFT ticket marketplace powered by Solana.
                            <span className="text-purple-400 font-medium"> Lightning-fast</span> transactions with
                            <span className="text-purple-400 font-medium"> near-zero</span> fees.
                        </p>

                        {/* Solana Advantages - Focused on minting benefits */}
                        <div className="space-y-3">
                            <h3 className="text-white text-base font-medium">
                                Why Solana
                            </h3>

                            <FeatureItem
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>}
                                title="Ultra-Low Transaction Fees"
                                description="Pay just fractions of a cent per transaction, unlike Ethereum's high gas fees"
                            />
                            <FeatureItem
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" /></svg>}
                                title="Blazing Fast Performance"
                                description="65,000 TPS with sub-second finality – instant minting and trading"
                            />
                        </div>

                        {/* Network info box */}
                        <div className="bg-gradient-to-r from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-purple-900/30">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center">
                                    <div className="bg-green-400 h-3 w-3 rounded-full mr-3 animate-pulse"></div>
                                    <span className="text-sm text-gray-300 font-medium">Solana Network</span>
                                </div>
                                <div className="text-white text-sm">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">0.1%</span> fee
                                </div>
                            </div>
                        </div>

                        {/* Action buttons - UPDATED with Mint Ticket button */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-3">
                            <Link
                                to="/explore"
                                className="bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg shadow-lg hover:shadow-purple-500/30 transition duration-300 transform hover:-translate-y-1 active:translate-y-0"
                            >
                                <div className="bg-gray-900 text-white font-bold py-3 px-6 rounded-md hover:bg-gray-900/80 transition duration-300 text-center">
                                    Explore Events
                                </div>
                            </Link>
                            <Link
                                to="/mint-ticket"
                                className="bg-gradient-to-br from-pink-500 to-purple-600 p-0.5 rounded-lg shadow-lg hover:shadow-pink-500/30 transition duration-300 transform hover:-translate-y-1 active:translate-y-0"
                            >
                                <div className="bg-gray-900 text-white font-bold py-3 px-6 rounded-md hover:bg-gray-900/80 transition duration-300 text-center">
                                    Mint Ticket
                                </div>
                            </Link>
                            <Link
                                to="/create-concert"
                                className="bg-gradient-to-br from-indigo-600 to-purple-600 p-0.5 rounded-lg shadow-lg hover:shadow-indigo-500/30 transition duration-300 transform hover:-translate-y-1 active:translate-y-0"
                            >
                                <div className="bg-gray-900 text-white font-bold py-3 px-6 rounded-md hover:bg-gray-900/80 transition duration-300 text-center">
                                    Create Concert
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Right Column - NFT Cards with positions preserved */}
                    <div className="md:w-1/2 relative h-80 md:h-[400px]">
                        <NFTCard delay={0.4} rotate={-5} scale={1.0} x={270} y={0} index="12345" />
                        <NFTCard delay={0.5} rotate={5} scale={0.9} x={100} y={70} index="67890" />
                        <NFTCard delay={0.6} rotate={-10} scale={0.85} x={420} y={40} index="24680" />
                        <NFTCard delay={0.7} rotate={8} scale={0.75} x={200} y={180} index="13579" />

                        {/* Subtle floating glow effect */}
                        <motion.div
                            className="absolute w-20 h-20 rounded-full bg-purple-500/20 filter blur-xl"
                            animate={{
                                x: [100, 140, 100],
                                y: [150, 120, 150],
                                scale: [1, 1.2, 1],
                            }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                repeatType: "reverse"
                            }}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;