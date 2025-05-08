// services/blockchain.js
import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL
} from '@solana/web3.js';

class BlockchainService {
    constructor() {
        this.connection = new Connection(
            process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
            'confirmed'
        );

        // Cache untuk mengurangi panggilan RPC yang berlebihan
        this.balanceCache = new Map();
        this.lastBalanceCheck = new Map();
        this.cacheTime = 30000; // 30 detik
    }

    /**
     * Mendapatkan saldo Solana dari wallet
     * @param {PublicKey} publicKey - Public key dari wallet
     * @returns {Promise<number>} Saldo dalam SOL
     */
    async getSolanaBalance(publicKey) {
        try {
            if (!publicKey) {
                throw new Error('Public key diperlukan');
            }

            const keyStr = publicKey.toString();
            const now = Date.now();

            // Gunakan cache jika masih valid
            if (
                this.balanceCache.has(keyStr) &&
                this.lastBalanceCheck.has(keyStr) &&
                (now - this.lastBalanceCheck.get(keyStr)) < this.cacheTime
            ) {
                console.log(`Using cached balance for ${keyStr}`);
                return this.balanceCache.get(keyStr);
            }

            // Ambil saldo baru dari blockchain
            console.log(`Fetching fresh balance for ${keyStr}`);
            const balance = await this.connection.getBalance(publicKey);
            const solBalance = balance / LAMPORTS_PER_SOL;

            // Update cache
            this.balanceCache.set(keyStr, solBalance);
            this.lastBalanceCheck.set(keyStr, now);

            return solBalance;
        } catch (err) {
            console.error('Error mendapatkan saldo Solana:', err);
            throw err;
        }
    }

    /**
     * Membuat dan mengirim transaksi pembayaran Solana
     * @param {Object} wallet - Wallet objek dari @solana/wallet-adapter-react
     * @param {string} receiverAddress - Alamat wallet penerima
     * @param {number} amount - Jumlah SOL yang akan dikirim
     * @returns {Promise<string>} Signature transaksi
     */
    async createSolanaPayment(wallet, receiverAddress, amount) {
        try {
            if (!wallet || !wallet.publicKey || !wallet.signTransaction) {
                throw new Error('Wallet tidak terhubung atau tidak mendukung signTransaction');
            }

            // Konversi jumlah SOL ke lamports
            const lamports = Math.round(amount * LAMPORTS_PER_SOL);
            console.log(`Mengirim ${lamports} lamports (${amount} SOL) ke ${receiverAddress}`);

            // Alamat penerima (diubah ke PublicKey)
            const toPublicKey = new PublicKey(receiverAddress);

            // Buat transaksi
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: toPublicKey,
                    lamports: lamports
                })
            );

            // Set blockhash terbaru
            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;

            // Tanda tangani transaksi
            const signedTransaction = await wallet.signTransaction(transaction);
            console.log('Transaksi ditandatangani oleh wallet');

            // Kirim transaksi ke jaringan
            const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
            console.log('Transaksi terkirim dengan signature:', signature);

            // Hapus cache saldo setelah transaksi
            this.invalidateBalanceCache(wallet.publicKey.toString());

            // Tunggu konfirmasi
            const confirmation = await this.connection.confirmTransaction({
                blockhash: blockhash,
                lastValidBlockHeight: 150,
                signature
            });

            if (confirmation.value.err) {
                throw new Error(`Transaksi gagal: ${JSON.stringify(confirmation.value.err)}`);
            }

            console.log('Transaksi berhasil dikonfirmasi');
            return signature;
        } catch (error) {
            console.error('Error melakukan pembayaran Solana:', error);
            throw error;
        }
    }

    /**
     * Hapus cache saldo untuk wallet tertentu
     * @param {string} publicKeyStr - Public key wallet dalam bentuk string
     */
    invalidateBalanceCache(publicKeyStr) {
        if (this.balanceCache.has(publicKeyStr)) {
            console.log(`Invalidating balance cache for ${publicKeyStr}`);
            this.balanceCache.delete(publicKeyStr);
            this.lastBalanceCheck.delete(publicKeyStr);
        }
    }

    /**
     * Memeriksa status transaksi Solana
     * @param {string} signature - Signature transaksi
     * @returns {Promise<Object>} Status transaksi
     */
    async checkTransactionStatus(signature) {
        try {
            console.log(`Memeriksa status transaksi: ${signature}`);
            const status = await this.connection.getSignatureStatus(signature);
            return status;
        } catch (error) {
            console.error('Error memeriksa status transaksi:', error);
            throw error;
        }
    }

    /**
     * Mendapatkan harga gas saat ini
     * @returns {Promise<number>} Harga gas dalam SOL
     */
    async getCurrentGasPrice() {
        // Solana tidak memiliki konsep gas price seperti Ethereum
        // Tapi kita bisa memberikan estimasi biaya transaksi standar
        return 0.000005; // Perkiraan biaya transaksi Solana dalam SOL
    }
}

// Ekspor instance tunggal
const blockchainService = new BlockchainService();
export default blockchainService;