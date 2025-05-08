// src/utils/adminAuth.js
import { v4 as uuidv4 } from 'uuid';

// Daftar admin wallet - hanya wallet address Anda
export const ADMIN_PUBLIC_KEYS = [
    '2upQ693dMu2PEdBp6JKnxRBWEimdbmbgNCvncbasP6TU'  // Admin Wallet Anda
];

// Cek jika wallet address adalah admin
export const isAdmin = (walletAddress) => {
    const isAdminWallet = ADMIN_PUBLIC_KEYS.includes(walletAddress);
    console.log(`Checking if ${walletAddress} is admin: ${isAdminWallet}`);
    return isAdminWallet;
};

// Simpan session admin ke localStorage
export const verifyAdminLogin = ({ publicKey }) => {
    try {
        const wallet = publicKey.toString();
        console.log(`Verifying admin login for wallet: ${wallet}`);

        // Hanya izinkan jika public key ada di daftar admin
        if (!ADMIN_PUBLIC_KEYS.includes(wallet)) {
            console.error("Unauthorized wallet attempting admin access:", wallet);
            return false;
        }

        // Buat session info
        const adminAuth = {
            id: uuidv4(),
            wallet,
            loginTime: new Date().toISOString(),
            expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 jam
        };

        // Simpan ke localStorage
        localStorage.setItem('adminAuth', JSON.stringify(adminAuth));
        console.log("Admin session created and saved to localStorage");

        return true;
    } catch (error) {
        console.error("Admin login error:", error);
        return false;
    }
};

// Ambil info admin dari localStorage
export const getAdminAuth = () => {
    try {
        const adminAuth = JSON.parse(localStorage.getItem('adminAuth'));

        // Jika tidak ada session atau session expired
        if (!adminAuth) return null;

        const now = new Date();
        const expiryTime = new Date(adminAuth.expiryTime);

        if (now > expiryTime) {
            // Session expired, hapus
            localStorage.removeItem('adminAuth');
            return null;
        }

        return adminAuth;
    } catch (error) {
        console.error("Error getting admin auth:", error);
        return null;
    }
};

// Perpanjang session admin
export const extendAdminSession = () => {
    try {
        const adminAuth = getAdminAuth();

        if (!adminAuth) return false;

        // Perpanjang waktu kadaluarsa 24 jam dari sekarang
        adminAuth.expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        // Simpan kembali ke localStorage
        localStorage.setItem('adminAuth', JSON.stringify(adminAuth));

        return true;
    } catch (error) {
        console.error("Error extending admin session:", error);
        return false;
    }
};

// Logout admin
export const logoutAdmin = () => {
    localStorage.removeItem('adminAuth');
    console.log("Admin logged out, session removed");
};