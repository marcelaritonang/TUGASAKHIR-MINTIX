// components/admin/AdminLoginModal.jsx
import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { verifyAdminLogin, isAdmin } from '../../utils/adminAuth';

const AdminLoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
    const [error, setError] = useState('');
    const wallet = useWallet();

    const handleLogin = (e) => {
        e.preventDefault();

        if (!wallet.connected) {
            setError('Silakan hubungkan wallet Anda terlebih dahulu');
            return;
        }

        if (!isAdmin(wallet)) {
            setError('Wallet ini tidak memiliki hak akses admin');
            return;
        }

        // Verifikasi admin hanya berdasarkan pubkey
        if (verifyAdminLogin(wallet)) {
            onLoginSuccess();
            onClose();
        } else {
            setError('Gagal login sebagai admin');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-purple-700 rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Admin Login</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mb-6">
                    <p className="text-gray-300 mb-4">
                        Admin login menggunakan wallet address:
                        <span className="block mt-2 text-green-400 font-mono text-sm break-all">
                            {wallet.connected ? wallet.publicKey.toString() : 'Wallet belum terhubung'}
                        </span>
                    </p>
                </div>

                {error && (
                    <div className="mb-4 text-red-500 text-sm">{error}</div>
                )}

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="mr-2 px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleLogin}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700"
                    >
                        Login sebagai Admin
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginModal;