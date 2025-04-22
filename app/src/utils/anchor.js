// utils/anchor.js
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AnchorProvider, Program } from '@project-serum/anchor';
import idl from '../idl.json';

// Program ID dari smart contract yang sudah di-deploy
const programId = new PublicKey('3oKZi6zmYzbRDuq8nAAGeL9m9TcwFPAiR2cfz4vjANum');

// URL untuk testnet
const network = 'https://api.testnet.solana.com';

// Deteksi apakah ekstensi Magic Eden ada
const isMagicEdenExtensionPresent = typeof window !== 'undefined' &&
    window.solana &&
    Object.getOwnPropertySymbols(window.solana).some(s =>
        s.toString().includes('__magic_eden_solana_provider')
    );

// Membuat koneksi ke testnet
export const getConnection = () => {
    return new Connection(network, 'confirmed');
};

// Membuat provider dari wallet dengan menghindari konflik Magic Eden
export const getProvider = (wallet) => {
    const connection = getConnection();

    // Jika ekstensi Magic Eden terdeteksi, gunakan pendekatan alternatif
    if (isMagicEdenExtensionPresent) {
        console.log("Magic Eden extension detected, using alternative provider approach");
        return {
            connection,
            wallet,
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction,
            signAllTransactions: wallet.signAllTransactions,
            sendTransaction: async (tx, signers, opts) => {
                if (signers && signers.length > 0) {
                    tx.partialSign(...signers);
                }
                return await wallet.sendTransaction(tx, connection, opts);
            }
        };
    }

    // Cara normal jika tidak ada konflik
    try {
        return new AnchorProvider(
            connection,
            wallet,
            { commitment: 'confirmed', preflightCommitment: 'confirmed' }
        );
    } catch (error) {
        console.error("Error creating AnchorProvider:", error);
        // Fallback ke pendekatan alternatif jika AnchorProvider error
        return {
            connection,
            wallet,
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction,
            signAllTransactions: wallet.signAllTransactions,
            sendTransaction: async (tx, signers, opts) => {
                if (signers && signers.length > 0) {
                    tx.partialSign(...signers);
                }
                return await wallet.sendTransaction(tx, connection, opts);
            }
        };
    }
};

// Mendapatkan instance program
export const getProgram = (wallet) => {
    try {
        const provider = getProvider(wallet);
        console.log("Creating program with IDL:", idl);
        console.log("Program ID:", programId.toString());
        console.log("Available instructions:", idl.instructions.map(instr => instr.name));
        const program = new Program(idl, programId, provider);

        // Debugging: log semua metode program
        console.log("Program methods:", Object.keys(program.methods));

        return program;
    } catch (error) {
        console.error("Error creating Program instance:", error);
        throw new Error(`Failed to initialize program: ${error.message}`);
    }
};

// Mendapatkan saldo wallet dalam SOL dengan error handling
export const getBalance = async (wallet) => {
    if (!wallet.publicKey) return 0;

    try {
        const connection = getConnection();
        const balance = await connection.getBalance(wallet.publicKey);
        return balance / LAMPORTS_PER_SOL;
    } catch (error) {
        console.error("Error fetching balance:", error);
        return 0;
    }
};

// Melakukan airdrop SOL ke wallet (hanya untuk testnet)
export const requestAirdrop = async (wallet, amount = 2) => {
    if (!wallet.publicKey) throw new Error("Wallet not connected");

    try {
        const connection = getConnection();
        const signature = await connection.requestAirdrop(
            wallet.publicKey,
            amount * LAMPORTS_PER_SOL
        );

        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            signature
        });

        return signature;
    } catch (error) {
        console.error("Airdrop failed:", error);
        throw new Error(`Airdrop failed: ${error.message}`);
    }
};

// Fungsi untuk memeriksa apakah wallet adalah admin
export const isAdmin = (wallet) => {
    // Pubkey admin
    const ADMIN_PUBLIC_KEY = "2upQ693dMu2PEdBp6JKnxRBWEimdbmbgNCvncbasP6TU"; // Ganti dengan public key Anda
    return wallet.publicKey && wallet.publicKey.toString() === ADMIN_PUBLIC_KEY;
};