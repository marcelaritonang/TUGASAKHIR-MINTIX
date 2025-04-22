import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

// Icons - using inline SVG for better style control and consistency
const MintIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
        <path d="M12 8v4l3 3" />
    </svg>
);

const WalletIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
        <path d="M16 12h.01" />
        <path d="M22 10V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2v-2" />
    </svg>
);

const TicketIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
        <path d="M13 5v2" />
        <path d="M13 17v2" />
        <path d="M13 11v2" />
    </svg>
);

// Gradient text component to match styling in other sections
const GradientText = ({ text, className = "" }) => {
    return (
        <span className={`text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 ${className}`}>
            {text}
        </span>
    );
};

// Animated step card with consistent styling
const StepCard = ({ icon, title, description, index }) => {
    return (
        <motion.div
            className="shadow-xl rounded-lg overflow-hidden hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.5,
                delay: index * 0.2,
                ease: [0.25, 1, 0.5, 1]
            }}
            viewport={{ once: true }}
            whileHover={{
                y: -5,
                boxShadow: "0 10px 25px -5px rgba(139, 92, 246, 0.25)"
            }}
        >
            {/* Warna border ungu seperti di NFT Ticket */}
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg">
                {/* Background dalam berwarna gelap seperti di NFT Ticket */}
                <div className="w-full h-full bg-gray-900 p-6 rounded-md relative">
                    {/* Step number in background */}
                    <div className="absolute -top-6 -right-6 text-gray-700 text-[100px] font-bold opacity-10">
                        {index + 1}
                    </div>

                    {/* Icon with gradient background - konsisten dengan styling lainnya */}
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-full mx-auto mb-6">
                        <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center">
                            <div className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                {icon}
                            </div>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-white text-center mb-4">
                        {title}
                    </h3>
                    <p className="text-gray-400 text-center relative z-10">
                        {description}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

// Feature item component for benefits section
const FeatureItem = ({ icon, title, description }) => {
    return (
        <div className="flex items-start gap-3">
            <div className="text-purple-400 bg-purple-900/30 p-2 rounded-lg flex-shrink-0">
                {icon}
            </div>
            <div>
                <h3 className="text-white font-semibold text-sm">{title}</h3>
                <p className="text-gray-400 text-xs">{description}</p>
            </div>
        </div>
    );
};

const HowItWorksSection = () => {
    // Animation variants for the title
    const titleVariants = {
        hidden: { opacity: 0, y: -20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1]
            }
        }
    };

    return (
        <section className="py-16 px-4 bg-gray-900 relative overflow-hidden -mt-px">
            {/* Background subtle effects - diperbaiki untuk transisi yang lebih smooth */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600 filter blur-3xl"></div>
                <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-indigo-600 filter blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto relative">
                <motion.div
                    className="text-center mb-12"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={titleVariants}
                >
                    <motion.h2
                        className="text-3xl font-bold text-white mb-4"
                    >
                        How <GradientText text="Mintix" /> Works
                    </motion.h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Secure your concert tickets on the Solana blockchain in three simple steps
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <StepCard
                        index={0}
                        icon={<MintIcon />}
                        title="Mint Your Ticket"
                        description="Purchase concert tickets as NFTs directly from organizers with ultra-low fees on Solana."
                    />
                    <StepCard
                        index={1}
                        icon={<WalletIcon />}
                        title="Store Securely"
                        description="Your NFT tickets are safely stored in your wallet with verifiable ownership on the blockchain."
                    />
                    <StepCard
                        index={2}
                        icon={<TicketIcon />}
                        title="Use or Trade"
                        description="Attend events by presenting your NFT ticket or easily transfer/sell it to others."
                    />
                </div>

                {/* Extra information about Solana advantages - dengan styling konsisten */}
                <motion.div
                    className="mt-12 bg-gradient-to-r from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-lg p-6 border border-purple-900/30"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.4 }}
                    viewport={{ once: true }}
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FeatureItem
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                </svg>
                            }
                            title="Ultra-Fast Transactions"
                            description="Mint and transfer tickets in less than a second with Solana's 65,000 TPS network"
                        />
                        <FeatureItem
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V5z" clipRule="evenodd" />
                                </svg>
                            }
                            title="Lowest Fees in the Market"
                            description="Just 0.1% transaction fee on Solana network — a fraction of traditional ticketing platforms"
                        />
                        <FeatureItem
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            }
                            title="Verifiable and Secure"
                            description="Immutable blockchain records ensure ticket authenticity and prevent counterfeiting"
                        />
                    </div>
                </motion.div>

                {/* CTA Button - konsisten dengan section lain */}
                <div className="flex justify-center mt-12">
                    <Link
                        to="/explore"
                        className="bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg shadow-lg hover:shadow-purple-500/30 transition duration-300 transform hover:-translate-y-1 active:translate-y-0"
                    >
                        <div className="bg-gray-900 text-white font-bold py-3 px-8 rounded-md hover:bg-gray-900/80 transition duration-300 text-center">
                            Explore Events
                        </div>
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default HowItWorksSection;