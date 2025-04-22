// utils/adminAuth.js
import { PublicKey } from '@solana/web3.js';

// List admin public keys (hanya pubkey yang diizinkan)
const ADMIN_PUBLIC_KEYS = [
    "2upQ693dMu2PEdBp6JKnxRBWEimdbmbgNCvncbasP6TU", // Public key Anda
    // Tambahkan public key admin lain di sini jika diperlukan
];

// Periksa apakah wallet adalah admin
export const isAdmin = (wallet) => {
    if (!wallet || !wallet.publicKey) return false;

    const walletPubkey = wallet.publicKey.toString();
    return ADMIN_PUBLIC_KEYS.includes(walletPubkey);
};

// Admin login status management
let adminLoginStatus = false;

export const setAdminLoginStatus = (status) => {
    adminLoginStatus = status;
};

export const getAdminLoginStatus = () => {
    return adminLoginStatus;
};

// Fungsi verifikasi admin - tanpa password, hanya berdasarkan pubkey
export const verifyAdminLogin = (wallet) => {
    if (isAdmin(wallet)) {
        setAdminLoginStatus(true);
        return true;
    }

    return false;
};

// Fungsi untuk logout admin
export const logoutAdmin = () => {
    setAdminLoginStatus(false);
};