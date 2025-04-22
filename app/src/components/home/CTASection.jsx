import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// Komponen GradientText untuk konsistensi dengan section lainnya
const GradientText = ({ text, className = "" }) => {
    return (
        <span className={`text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 ${className}`}>
            {text}
        </span>
    );
};

const CTASection = () => {
    const { connected } = useWallet();

    return (
        <section className="py-16 px-4 bg-gray-900 relative overflow-hidden -mt-px">
            {/* Background subtle effect sama seperti UpcomingConcertsSection */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-indigo-600 filter blur-3xl"></div>
                <div className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-purple-600 filter blur-3xl"></div>
            </div>

            <div className="max-w-6xl mx-auto relative">
                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-xl shadow-xl overflow-hidden">
                    <div className="bg-gray-900 rounded-lg p-8 md:p-12">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                            <motion.div
                                className="md:w-2/3"
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6 }}
                                viewport={{ once: true }}
                            >
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                    Join the Concert Ticket <GradientText text="Revolution" />
                                </h2>
                                <p className="text-gray-300 mb-6">
                                    Mint your NFT tickets now and enjoy concerts with blockchain technology.
                                    Verified security, no intermediaries, and tradeable tickets.
                                </p>

                                <div className="flex flex-wrap gap-6">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-purple-900/50 rounded-full flex items-center justify-center mr-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <span className="text-white text-sm">Verified</span>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-purple-900/50 rounded-full flex items-center justify-center mr-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <span className="text-white text-sm">Fast Transactions</span>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-purple-900/50 rounded-full flex items-center justify-center mr-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <span className="text-white text-sm">Low Fees</span>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                className="md:w-1/3 flex flex-col items-center"
                                initial={{ opacity: 0, x: 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                viewport={{ once: true }}
                            >
                                {connected ? (
                                    <div className="space-y-4 w-full">
                                        <Link
                                            to="/explore"
                                            className="block w-full bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg hover:shadow-lg hover:shadow-purple-500/20 transition duration-300"
                                        >
                                            <div className="bg-gray-900 text-white text-center py-3 rounded-md font-bold hover:bg-gray-800/90 transition duration-300">
                                                Explore Concerts
                                            </div>
                                        </Link>
                                        <Link
                                            to="/mint-ticket"
                                            className="block w-full bg-gradient-to-br from-pink-500 to-purple-600 p-0.5 rounded-lg hover:shadow-lg hover:shadow-pink-500/20 transition duration-300"
                                        >
                                            <div className="bg-gray-900 text-white text-center py-3 rounded-md font-bold hover:bg-gray-800/90 transition duration-300">
                                                Mint NFT Ticket
                                            </div>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-4 w-full">
                                        <div className="mb-2 text-center">
                                            <p className="text-white font-medium mb-4">Connect wallet to get started</p>
                                            <div className="flex justify-center">
                                                <WalletMultiButton className="!bg-gradient-to-br !from-purple-600 !to-indigo-600 hover:!shadow-lg hover:!shadow-purple-500/20 transition duration-300" />
                                            </div>
                                        </div>
                                        <Link
                                            to="/explore"
                                            className="block w-full bg-gradient-to-br from-indigo-600 to-purple-600 p-0.5 rounded-lg hover:shadow-lg hover:shadow-indigo-500/20 transition duration-300"
                                        >
                                            <div className="bg-gray-900 text-white text-center py-3 rounded-md font-medium hover:bg-gray-800/90 transition duration-300">
                                                Explore First
                                            </div>
                                        </Link>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CTASection;