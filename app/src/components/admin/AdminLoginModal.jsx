// src/components/admin/AdminLoginModal.jsx
import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { verifyAdminLogin, ADMIN_PUBLIC_KEYS } from '../../utils/adminAuth';
import AuthService from '../../services/AuthService';

const AdminLoginModal = ({ isOpen, onClose, onSuccess }) => {
    const { publicKey, connected, signMessage } = useWallet();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAdminLogin = async () => {
        setError('');
        setIsLoading(true);

        try {
            if (!connected || !publicKey) {
                setError('Please connect your wallet first');
                setIsLoading(false);
                return;
            }

            console.log("Attempting admin login with wallet:", publicKey.toString());
            console.log("Admin wallets:", ADMIN_PUBLIC_KEYS);

            // Check if the wallet is in the admin list
            if (!ADMIN_PUBLIC_KEYS.includes(publicKey.toString())) {
                setError('This wallet does not have admin privileges');
                setIsLoading(false);
                return;
            }

            // Login via test endpoint (for development)
            try {
                const loginResult = await AuthService.loginTest(publicKey.toString());
                console.log("Login result:", loginResult);

                if (loginResult && loginResult.success) {
                    // Verify and create admin session in localStorage
                    const success = verifyAdminLogin({ publicKey });

                    console.log("Admin login successful");
                    if (onSuccess) onSuccess();
                    onClose();
                } else {
                    setError('Failed to verify admin credentials');
                }
            } catch (loginError) {
                console.error("Login error:", loginError);
                setError(`Login failed: ${loginError.message}`);
            }
        } catch (err) {
            console.error("Error during admin login:", err);
            setError('An error occurred during admin login');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700 shadow-xl"
            >
                <h2 className="text-2xl font-bold text-white mb-6">Admin Login</h2>

                {error && (
                    <div className="bg-red-900/20 border border-red-500 rounded-md p-3 mb-4">
                        <p className="text-red-500 text-sm">{error}</p>
                    </div>
                )}

                <div className="mb-6">
                    <p className="text-gray-300 mb-4">
                        Connect your wallet to access admin features. Only authorized wallets can log in.
                    </p>

                    <div className="flex justify-center mb-4">
                        <WalletMultiButton className="!bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 !transition-all !shadow-lg hover:!shadow-yellow-600/20" />
                    </div>

                    {connected && publicKey && (
                        <div className="bg-gray-700/50 rounded-md p-3 mb-4">
                            <p className="text-gray-300 text-sm mb-1">Connected Wallet:</p>
                            <p className="text-white font-mono text-sm break-all">{publicKey.toString()}</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAdminLogin}
                        disabled={!connected || isLoading}
                        className={`px-4 py-2 rounded-lg flex items-center ${connected && !isLoading
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white cursor-pointer'
                            : 'bg-yellow-900/30 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </>
                        ) : 'Login as Admin'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminLoginModal;