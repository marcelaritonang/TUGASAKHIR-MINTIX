// src/utils/anchor.js
import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { AnchorProvider, Program } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
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

// ------------- TAMBAHAN FUNGSI UNTUK INTEGRASI SMART CONTRACT -------------

/**
 * Membuat konser baru di blockchain
 * @param {Object} wallet - Wallet adapter
 * @param {Object} concertData - Data konser
 * @returns {Promise<Object>} - Hasil transaksi
 */
export const createConcertOnChain = async (wallet, concertData) => {
    try {
        if (!wallet.publicKey) {
            throw new Error('Wallet tidak terhubung');
        }

        // Dapatkan program
        const program = getProgram(wallet);

        // Buat keypair untuk konser baru
        const concertKeypair = Keypair.generate();

        console.log('Creating concert on blockchain:', {
            name: concertData.name,
            venue: concertData.venue,
            date: concertData.date,
            totalTickets: concertData.totalTickets,
            address: concertKeypair.publicKey.toString()
        });

        // Format tanggal sebagai string ISO
        const dateString = new Date(concertData.date).toISOString();

        // Panggil instruksi initializeConcert dari smart contract
        const tx = await program.methods
            .initializeConcert(
                concertData.name,
                concertData.venue,
                dateString,
                concertData.totalTickets || 100
            )
            .accounts({
                authority: wallet.publicKey,
                concert: concertKeypair.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([concertKeypair])
            .rpc();

        console.log('Concert created on blockchain, signature:', tx);

        return {
            success: true,
            signature: tx,
            concertAddress: concertKeypair.publicKey.toString()
        };
    } catch (error) {
        console.error('Error creating concert on blockchain:', error);
        throw error;
    }
};

/**
 * Mencetak tiket NFT di blockchain
 * @param {Object} wallet - Wallet adapter
 * @param {string} concertAddress - Alamat akun konser
 * @param {string} sectionName - Nama section tiket
 * @param {string} seatNumber - Nomor kursi (opsional)
 * @param {Function} statusCallback - Callback status (opsional)
 * @returns {Promise<Object>} - Hasil transaksi
 */
export const mintTicketNFT = async (wallet, concertAddress, sectionName, seatNumber, statusCallback = null) => {
    try {
        if (!wallet.publicKey) {
            throw new Error('Wallet tidak terhubung');
        }

        const program = getProgram(wallet);
        const connection = getConnection();

        if (statusCallback) statusCallback('Membuat akun mint...');

        // STEP 1: Membuat keypair untuk mint dan ticket
        const mintKeypair = Keypair.generate();
        const ticketKeypair = Keypair.generate();
        const tokenAccountKeypair = Keypair.generate();

        if (statusCallback) statusCallback('Menginisialisasi mint SPL Token...');

        // STEP 2: Panggil initializeMint instruction
        const initializeMintTx = await program.methods
            .initializeMint()
            .accounts({
                authority: wallet.publicKey,
                buyer: wallet.publicKey,
                mint: mintKeypair.publicKey,
                tokenAccount: tokenAccountKeypair.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY
            })
            .signers([mintKeypair, tokenAccountKeypair])
            .rpc();

        console.log('Mint initialized with signature:', initializeMintTx);

        if (statusCallback) statusCallback('Membuat tiket NFT...');

        // STEP 3: Panggil createTicket instruction
        const seatOption = seatNumber ? seatNumber : null;

        const createTicketTx = await program.methods
            .createTicket(
                sectionName,
                seatOption
            )
            .accounts({
                authority: wallet.publicKey,
                buyer: wallet.publicKey,
                concert: new PublicKey(concertAddress),
                mint: mintKeypair.publicKey,
                tokenAccount: tokenAccountKeypair.publicKey,
                ticket: ticketKeypair.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId
            })
            .signers([ticketKeypair])
            .rpc();

        console.log('Ticket created with signature:', createTicketTx);

        if (statusCallback) statusCallback('Tiket NFT berhasil dibuat!');

        return {
            success: true,
            signature: createTicketTx,
            mintAddress: mintKeypair.publicKey.toString(),
            ticketAddress: ticketKeypair.publicKey.toString(),
            tokenAccountAddress: tokenAccountKeypair.publicKey.toString()
        };
    } catch (error) {
        console.error('Error minting ticket NFT:', error);
        if (statusCallback) statusCallback(`Error: ${error.message}`);
        throw error;
    }
};

/**
 * Verifikasi tiket di blockchain
 * @param {Object} wallet - Wallet adapter
 * @param {string} ticketAddress - Alamat akun tiket
 * @returns {Promise<Object>} - Data tiket
 */
export const verifyTicketOnChain = async (wallet, ticketAddress) => {
    try {
        const program = getProgram(wallet);

        // Ambil data tiket dari blockchain
        const ticketData = await program.account.ticket.fetch(
            new PublicKey(ticketAddress)
        );

        return {
            exists: true,
            data: ticketData,
            isUsed: ticketData.used,
            owner: ticketData.owner.toString(),
            seatNumber: ticketData.seatNumber, // Ini option
            ticketType: ticketData.ticketType,
            concertAddress: ticketData.concert.toString(),
            mintAddress: ticketData.mint.toString()
        };
    } catch (error) {
        console.error('Error verifying ticket on blockchain:', error);
        return {
            exists: false,
            error: error.message
        };
    }
};

/**
 * Menandai tiket sebagai digunakan di blockchain
 * @param {Object} wallet - Wallet adapter
 * @param {string} ticketAddress - Alamat akun tiket
 * @returns {Promise<Object>} - Hasil transaksi
 */
export const useTicketOnChain = async (wallet, ticketAddress) => {
    try {
        const program = getProgram(wallet);

        // Panggil instruksi useTicket pada smart contract
        const tx = await program.methods
            .useTicket()
            .accounts({
                authority: wallet.publicKey,
                ticket: new PublicKey(ticketAddress)
            })
            .rpc();

        return {
            success: true,
            signature: tx
        };
    } catch (error) {
        console.error('Error using ticket on blockchain:', error);
        throw error;
    }
};

/**
 * Delete concert dari blockchain
 * @param {Object} wallet - Wallet adapter
 * @param {string} concertAddress - Alamat concert account
 * @returns {Promise<Object>} - Hasil transaksi
 */
export const deleteConcertOnChain = async (wallet, concertAddress) => {
    try {
        const program = getProgram(wallet);

        // Panggil instruksi deleteConcert
        const tx = await program.methods
            .deleteConcert()
            .accounts({
                authority: wallet.publicKey,
                concert: new PublicKey(concertAddress),
                systemProgram: SystemProgram.programId
            })
            .rpc();

        return {
            success: true,
            signature: tx
        };
    } catch (error) {
        console.error('Error deleting concert:', error);
        throw error;
    }
};