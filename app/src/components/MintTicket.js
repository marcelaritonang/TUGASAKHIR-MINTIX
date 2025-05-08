// src/components/MintTicket.js
import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';

// Import services and context
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import blockchainService from '../services/blockchain';
import { useConcerts } from '../context/ConcertContext';

// Import components
import SeatSelector from './SeatSelector';
import LoadingSpinner from './common/LoadingSpinner';

// Gradient text component
const GradientText = ({ text, className = "" }) => {
    return (
        <span className={`text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 ${className}`}>
            {text}
        </span>
    );
};

// Loading overlay component untuk UX yang lebih baik
const LoadingOverlay = ({ message = "Loading..." }) => (
    <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-50 rounded-xl">
        <div className="text-center">
            <LoadingSpinner size={8} />
            <p className="mt-4 text-white">{message}</p>
        </div>
    </div>
);

const MintTicket = () => {
    const { concertId } = useParams();
    const navigate = useNavigate();
    const wallet = useWallet();
    const { approvedConcerts, loadApprovedConcerts, loadMyTickets } = useConcerts();

    // Mint state
    const [concert, setConcert] = useState(concertId || '');
    const [ticketType, setTicketType] = useState('');
    const [seatNumber, setSeatNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true); // Separate loading state for initial load
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [paymentComplete, setPaymentComplete] = useState(false);
    const [txSignature, setTxSignature] = useState('');

    // Concert data state
    const [selectedConcert, setSelectedConcert] = useState(null);
    const [availabilityInfo, setAvailabilityInfo] = useState({});
    const [solanaBalance, setSolanaBalance] = useState(0);

    // UI state
    const [seatSelectorOpen, setSeatSelectorOpen] = useState(false);
    const [mintedSeats, setMintedSeats] = useState([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(null); // NEW: Interval untuk refresh

    // Pengaturan Solana Connection
    const solanaConnection = new Connection(
        process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
    );

    // Efek untuk mengambil konser yang dipilih saat URL parameter berubah
    useEffect(() => {
        const loadSelectedConcert = async () => {
            setInitialLoading(true);

            if (concertId) {
                setConcert(concertId);
                console.log("Looking for concert with ID:", concertId);

                // Cari konser dalam approvedConcerts
                const selected = approvedConcerts.find(c => c.id === concertId);

                if (selected) {
                    console.log("Concert found in approved concerts:", selected.name);
                    setSelectedConcert(selected);
                    calculateAvailability(selected);
                } else {
                    console.log("Concert not found in context, fetching from API");
                    // Jika tidak ditemukan, coba ambil dari API
                    await fetchConcertDetail(concertId);
                }
            }

            setInitialLoading(false);
        };

        loadSelectedConcert();

        // Cek authentication
        const isAuth = AuthService.isAuthenticated();
        setIsAuthenticated(isAuth);
        console.log("Is authenticated:", isAuth);

    }, [concertId, approvedConcerts]);

    // NEW: Setup polling untuk refresh data konser
    useEffect(() => {
        // Setup interval untuk refresh konser setiap 10 detik
        const interval = setInterval(() => {
            // Silent refresh dari approvedConcerts jika ada concertId
            if (concertId) {
                loadApprovedConcerts(true);
            }
        }, 10000);

        setRefreshInterval(interval);

        // Cleanup interval saat component unmount
        return () => {
            clearInterval(interval);
        };
    }, [concertId]);

    // UPDATE: Effect untuk merespon perubahan dalam approvedConcerts
    useEffect(() => {
        if (concertId && approvedConcerts.length > 0) {
            const updatedConcert = approvedConcerts.find(c => c.id === concertId);
            if (updatedConcert) {
                console.log("Found updated concert data:", updatedConcert.name);
                setSelectedConcert(updatedConcert);
                calculateAvailability(updatedConcert);
            }
        }
    }, [approvedConcerts, concertId]);

    // Mengambil saldo Solana saat wallet terhubung
    useEffect(() => {
        const fetchBalance = async () => {
            if (wallet && wallet.publicKey) {
                try {
                    const balance = await solanaConnection.getBalance(wallet.publicKey);
                    setSolanaBalance(balance / LAMPORTS_PER_SOL);
                    console.log(`Saldo Solana: ${balance / LAMPORTS_PER_SOL} SOL`);
                } catch (err) {
                    console.error("Error fetching Solana balance:", err);
                }
            }
        };

        fetchBalance();
    }, [wallet, wallet.publicKey]);

    // Menghitung availability untuk setiap section
    const calculateAvailability = (concert) => {
        if (!concert || !concert.sections) return;

        const info = {};
        let totalAvailable = 0;
        let totalSeats = 0;

        concert.sections.forEach(section => {
            info[section.name] = {
                available: section.availableSeats,
                total: section.totalSeats,
                percentage: Math.round((section.availableSeats / section.totalSeats) * 100)
            };

            totalAvailable += section.availableSeats;
            totalSeats += section.totalSeats;
        });

        info.total = {
            available: totalAvailable,
            total: totalSeats,
            percentage: totalSeats > 0 ? Math.round((totalAvailable / totalSeats) * 100) : 0
        };

        setAvailabilityInfo(info);
        console.log("Availability info calculated:", info);
    };

    // Fungsi untuk mengambil detail konser dari API
    const fetchConcertDetail = async (id) => {
        try {
            setLoading(true);
            console.log("Fetching concert detail for ID:", id);

            // Gunakan ApiService untuk mendapatkan data konser
            const concertData = await ApiService.getConcert(id);
            console.log("Concert data received from API:", concertData);

            if (concertData) {
                const formattedConcert = {
                    id: concertData._id,
                    name: concertData.name,
                    venue: concertData.venue,
                    date: concertData.date,
                    description: concertData.description,
                    sections: concertData.sections || [],
                    posterUrl: concertData.posterUrl,
                    status: concertData.status
                };

                console.log("Formatted concert:", formattedConcert);
                setSelectedConcert(formattedConcert);
                calculateAvailability(formattedConcert);
            }
        } catch (err) {
            console.error("Error mengambil detail konser:", err);
            setError("Gagal mengambil informasi konser. Silakan coba lagi.");
        } finally {
            setLoading(false);
        }
    };

    // Autentikasi ketika wallet terhubung
    useEffect(() => {
        const authenticate = async () => {
            if (wallet.connected && wallet.publicKey && !isAuthenticated) {
                try {
                    console.log("Attempting auto-login with wallet:", wallet.publicKey.toString());
                    const success = await AuthService.loginTest(wallet.publicKey.toString());
                    setIsAuthenticated(success);
                    console.log("Auto-login result:", success);
                } catch (err) {
                    console.error("Error saat login:", err);
                }
            }
        };

        authenticate();
    }, [wallet.connected, wallet.publicKey, isAuthenticated]);

    // Mengambil kursi yang sudah di-mint
    useEffect(() => {
        if (concert) {
            fetchMintedSeats(concert);
        }
    }, [concert, refreshTrigger]);

    // Fungsi untuk mengambil kursi yang sudah di-mint
    const fetchMintedSeats = async (concertId) => {
        try {
            console.log("Mengambil kursi terjual untuk konser:", concertId);
            // Panggil API untuk mendapatkan kursi yang sudah di-mint
            const response = await ApiService.getMintedSeats(concertId);

            if (response && response.seats) {
                console.log(`Ditemukan ${response.seats.length} kursi yang sudah di-mint:`, response.seats);
                setMintedSeats(response.seats);
                updateAvailabilityFromMintedSeats(response.seats);
            } else {
                console.log("Tidak ada data kursi terjual dari API");
                setMintedSeats([]);
            }
        } catch (err) {
            console.error("Error mengambil kursi yang sudah di-mint:", err);
            setMintedSeats([]);
        }
    };

    // Fungsi untuk memperbarui availability berdasarkan kursi yang sudah di-mint
    const updateAvailabilityFromMintedSeats = (seats) => {
        if (!selectedConcert || !selectedConcert.sections) return;

        // Buat salinan sections untuk diperbarui
        const updatedSections = selectedConcert.sections.map(section => {
            // Hitung jumlah kursi yang sudah terjual untuk section ini
            const soldSeats = seats.filter(seat => seat.startsWith(`${section.name}-`)).length;
            // Perbarui jumlah kursi yang tersedia
            const availableSeats = Math.max(0, section.totalSeats - soldSeats);

            return {
                ...section,
                availableSeats: availableSeats
            };
        });

        // Perbarui selectedConcert dengan sections yang telah diperbarui
        setSelectedConcert(prev => ({
            ...prev,
            sections: updatedSections
        }));

        // Hitung ulang availability info
        calculateAvailability({
            ...selectedConcert,
            sections: updatedSections
        });
    };

    // Handler untuk pemilihan kursi dengan dukungan pembaruan availability
    const handleSeatSelected = (selectedSeat, updateInfo = null) => {
        // Jika ada data pembaruan availability
        if (updateInfo && updateInfo.updateAvailability) {
            console.log("Memperbarui ketersediaan kursi:", updateInfo);

            // Perbarui sections dalam selectedConcert
            if (selectedConcert && selectedConcert.sections) {
                const updatedSections = selectedConcert.sections.map(section => {
                    if (section.name === updateInfo.ticketType) {
                        return {
                            ...section,
                            availableSeats: updateInfo.availableSeats
                        };
                    }
                    return section;
                });

                // Perbarui selectedConcert
                setSelectedConcert(prev => ({
                    ...prev,
                    sections: updatedSections
                }));

                // Hitung ulang availability info
                calculateAvailability({
                    ...selectedConcert,
                    sections: updatedSections
                });
            }

            return;
        }

        // Jika tidak ada seat yang dipilih, abaikan
        if (!selectedSeat) return;

        console.log("Kursi dipilih:", selectedSeat);

        // Debug
        console.log("mintedSeats:", mintedSeats);
        console.log("ticketType:", ticketType);

        // Verifikasi bahwa array mintedSeats ada dan pemeriksaan apakah kursi sudah terjual
        if (Array.isArray(mintedSeats)) {
            const isMinted = mintedSeats.some(mintedSeat => {
                return mintedSeat === selectedSeat ||
                    (mintedSeat.startsWith(`${ticketType}-`) &&
                        mintedSeat.includes(selectedSeat.split('-')[1]));
            });

            if (isMinted) {
                console.log("Kursi ini sudah terjual!");
                setError("Kursi ini sudah di-mint. Silakan pilih kursi lain.");
                return;
            }
        }

        setSeatNumber(selectedSeat);
        console.log("Kursi terpilih diupdate:", selectedSeat);
    };

    // Fungsi untuk membuat transaksi pembayaran Solana
    const createSolanaPayment = async (receiverAddress, amount) => {
        if (!wallet.publicKey || !wallet.signTransaction) {
            throw new Error("Wallet tidak terhubung atau tidak mendukung signTransaction");
        }

        // Konversi jumlah SOL ke lamports
        const lamports = Math.round(amount * LAMPORTS_PER_SOL);

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
        const { blockhash } = await solanaConnection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        // Tanda tangani transaksi
        const signedTransaction = await wallet.signTransaction(transaction);

        // Kirim transaksi ke jaringan
        const signature = await solanaConnection.sendRawTransaction(signedTransaction.serialize());

        // Tunggu konfirmasi
        await solanaConnection.confirmTransaction(signature);

        return signature;
    };

    // Handler untuk mint tiket dengan pembayaran Solana
    const handleMintTicket = async (e) => {
        e.preventDefault();

        // Validasi input
        if (!concert) {
            setError("Silakan pilih konser terlebih dahulu");
            return;
        }

        if (!ticketType) {
            setError("Silakan pilih tipe tiket terlebih dahulu");
            return;
        }

        if (!seatNumber) {
            setError("Silakan pilih kursi terlebih dahulu");
            return;
        }

        // Periksa jika kursi sudah di-mint
        if (Array.isArray(mintedSeats)) {
            const isMinted = mintedSeats.some(mintedSeat => {
                return mintedSeat === seatNumber ||
                    (mintedSeat.startsWith(`${ticketType}-`) &&
                        mintedSeat.includes(seatNumber.split('-')[1]));
            });

            if (isMinted) {
                setError("Kursi ini sudah di-mint. Silakan pilih kursi lain.");
                return;
            }
        }

        // Periksa autentikasi
        if (!isAuthenticated) {
            try {
                console.log("Mencoba autentikasi untuk mint tiket");
                const success = await AuthService.loginTest(wallet.publicKey.toString());
                if (!success) {
                    setError("Gagal melakukan otentikasi. Silakan coba lagi.");
                    return;
                }
                setIsAuthenticated(true);
            } catch (err) {
                setError("Gagal melakukan otentikasi. Silakan coba lagi.");
                return;
            }
        }

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            // Dapatkan harga tiket
            const section = selectedConcert.sections.find(s => s.name === ticketType);
            if (!section) {
                throw new Error("Tipe tiket tidak ditemukan");
            }

            const ticketPrice = section.price || 0.01; // Default ke 0.01 SOL jika tidak ada harga

            // Periksa saldo
            if (solanaBalance < ticketPrice) {
                throw new Error(`Saldo Solana tidak mencukupi. Diperlukan: ${ticketPrice} SOL, Saldo Anda: ${solanaBalance.toFixed(4)} SOL`);
            }

            // Lakukan pembayaran Solana
            // Di dunia nyata, Anda akan menggunakan alamat penyelenggara konser yang sebenarnya di sini
            const organizerAddress = "2upQ693dMu2PEdBp6JKnxRBWEimdbmbgNCvncbasP6TU"; // Contoh alamat

            console.log(`Melakukan pembayaran ${ticketPrice} SOL ke ${organizerAddress}`);

            const signature = await createSolanaPayment(organizerAddress, ticketPrice);
            console.log("Pembayaran berhasil dengan signature:", signature);

            // Simpan signature untuk referensi
            setTxSignature(signature);
            setPaymentComplete(true);

            // Persiapkan data untuk API
            const mintData = {
                concertId: concert,
                sectionName: ticketType,
                seatNumber: seatNumber,
                quantity: 1,
                transactionSignature: signature
            };

            console.log("Mencoba mint tiket dengan data:", mintData);

            // Panggil API untuk mint tiket
            const result = await ApiService.mintTicket(mintData);

            if (!result.success && !result.tickets) {
                throw new Error(result.msg || "Gagal membuat tiket");
            }

            console.log("Hasil mint tiket:", result);

            // Perbarui daftar kursi yang sudah di-mint
            setMintedSeats(prev => [...prev, seatNumber]);

            // Update ketersediaan kursi di state
            if (selectedConcert) {
                const updatedSections = selectedConcert.sections.map(s => {
                    if (s.name === ticketType) {
                        return {
                            ...s,
                            availableSeats: Math.max(0, s.availableSeats - 1)
                        };
                    }
                    return s;
                });

                const updatedConcert = {
                    ...selectedConcert,
                    sections: updatedSections
                };

                setSelectedConcert(updatedConcert);
                calculateAvailability(updatedConcert);
            }

            setSuccess(true);

            // Muat ulang tiket pengguna
            await loadMyTickets();

            // Update saldo setelah pembayaran
            if (wallet && wallet.publicKey) {
                const newBalance = await solanaConnection.getBalance(wallet.publicKey);
                setSolanaBalance(newBalance / LAMPORTS_PER_SOL);
            }

            // Refresh daftar kursi yang sudah di-mint
            setRefreshTrigger(prev => prev + 1);

            // Navigasi ke halaman tiket saya setelah delay
            setTimeout(() => {
                navigate('/my-tickets');
            }, 2000);
        } catch (error) {
            console.error("Error saat mint tiket:", error);
            setError(error.message || "Terjadi kesalahan saat mint tiket. Silakan coba lagi.");
            setPaymentComplete(false);
        } finally {
            setLoading(false);
        }
    };

    // Render informasi ketersediaan kursi
    const renderAvailabilityInfo = (concert) => {
        if (!concert || !concert.sections || concert.sections.length === 0) return null;

        return (
            <div className="mt-2 bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
                <h4 className="text-gray-300 text-sm font-medium mb-2">Ketersediaan Kursi:</h4>
                <div className="space-y-2">
                    {concert.sections.map((section) => (
                        <div key={section.name} className="flex justify-between items-center">
                            <span className="text-gray-400 text-xs">{section.name}:</span>
                            <div className="flex items-center">
                                <span className="text-gray-300 text-xs mr-2">
                                    {section.availableSeats}/{section.totalSeats}
                                </span>
                                <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500"
                                        style={{ width: `${(section.availableSeats / section.totalSeats) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="flex justify-between items-center pt-1 border-t border-gray-700/50">
                        <span className="text-gray-400 text-xs font-medium">Total:</span>
                        <div className="flex items-center">
                            <span className="text-gray-300 text-xs mr-2">
                                {availabilityInfo.total?.available || 0}/{availabilityInfo.total?.total || 0}
                            </span>
                            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-purple-500"
                                    style={{ width: `${availabilityInfo.total?.percentage || 0}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Render informasi pembayaran
    const renderPaymentInfo = () => {
        if (!selectedConcert || !ticketType) return null;

        const section = selectedConcert.sections.find(s => s.name === ticketType);
        const price = section ? section.price : 0;

        return (
            <div className="mt-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <h3 className="text-white text-sm font-medium mb-3">Informasi Pembayaran</h3>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Harga Tiket ({ticketType}):</span>
                        <span className="text-white font-medium">{price} SOL</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Biaya Transaksi:</span>
                        <span className="text-white">~0.000005 SOL</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                        <span className="text-gray-300 text-sm font-medium">Total:</span>
                        <span className="text-purple-400 font-medium">{(price + 0.000005).toFixed(6)} SOL</span>
                    </div>
                </div>

                <div className="mt-3 flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Saldo Wallet:</span>
                    <span className={`${solanaBalance < price ? 'text-red-400' : 'text-green-400'} font-medium`}>
                        {solanaBalance.toFixed(6)} SOL
                    </span>
                </div>

                {solanaBalance < price && (
                    <div className="mt-2 bg-red-500/20 p-2 rounded text-red-400 text-xs">
                        Saldo tidak mencukupi untuk membeli tiket ini. Silakan isi saldo Solana Anda.
                    </div>
                )}

                {paymentComplete && (
                    <div className="mt-2 bg-green-500/20 p-2 rounded text-green-400 text-xs">
                        Pembayaran berhasil! Signature: {txSignature.substring(0, 8)}...{txSignature.substring(txSignature.length - 8)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 pt-24 pb-16 px-4">
            {/* Background effects */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600 filter blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-600 filter blur-3xl"></div>
            </div>

            <div className="max-w-4xl mx-auto relative">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-xl"
                >
                    <div className="bg-gray-900 rounded-xl p-8 relative">
                        {/* Loading Overlay - menampilkan jika initialLoading aktif */}
                        <AnimatePresence>
                            {initialLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center z-50 rounded-xl"
                                >
                                    <LoadingSpinner size={10} />
                                    <p className="mt-4 text-white text-lg">Memuat konser...</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
                            Mint <GradientText text="Tiket Konser" />
                        </h1>

                        {!wallet.connected ? (
                            <div className="text-center py-12">
                                <h3 className="text-xl text-white mb-6">Hubungkan wallet Anda untuk membuat tiket</h3>
                                <WalletMultiButton className="!bg-gradient-to-br !from-purple-600 !to-indigo-600 hover:!shadow-lg hover:!shadow-purple-500/20 transition duration-300" />
                            </div>
                        ) : (
                            <form onSubmit={handleMintTicket} className="space-y-6">
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        Pilih Konser
                                    </label>
                                    <div className="relative">
                                        {loading && !selectedConcert ? (
                                            <div className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-400 flex items-center justify-center h-12">
                                                <LoadingSpinner />
                                                <span className="ml-2">Memuat daftar konser...</span>
                                            </div>
                                        ) : concertId ? (
                                            <div className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white">
                                                {selectedConcert ? selectedConcert.name : "Memuat konser..."}
                                            </div>
                                        ) : (
                                            <select
                                                value={concert}
                                                onChange={(e) => {
                                                    setConcert(e.target.value);
                                                    setTicketType('');
                                                    setSeatNumber('');
                                                    setSeatSelectorOpen(false);

                                                    // Cari konser yang dipilih
                                                    const selected = approvedConcerts.find(c => c.id === e.target.value);
                                                    if (selected) {
                                                        setSelectedConcert(selected);
                                                        calculateAvailability(selected);
                                                    }
                                                }}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                            >
                                                <option value="">-- Pilih konser --</option>
                                                {approvedConcerts.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.name} - {c.venue} ({c.sections.reduce((acc, s) => acc + s.availableSeats, 0)}/{c.sections.reduce((acc, s) => acc + s.totalSeats, 0)} kursi)
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* Tampilkan informasi ketersediaan kursi */}
                                    {selectedConcert && renderAvailabilityInfo(selectedConcert)}
                                </div>

                                {/* Show selected concert details */}
                                {selectedConcert && (
                                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-white font-semibold">{selectedConcert.name}</h3>
                                            <span className="bg-purple-600 text-white text-xs py-1 px-2 rounded-full">
                                                {selectedConcert.status || 'Approved'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-400 block mb-1">Lokasi:</span>
                                                <p className="text-white">{selectedConcert.venue}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 block mb-1">Tanggal:</span>
                                                <p className="text-white">
                                                    {new Date(selectedConcert.date).toLocaleDateString('id-ID', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        {selectedConcert.posterUrl && (
                                            <div className="mt-3">
                                                <img
                                                    src={selectedConcert.posterUrl}
                                                    alt={selectedConcert.name}
                                                    className="max-h-32 mx-auto rounded"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Render payment info if concert and ticket type selected */}
                                {selectedConcert && ticketType && renderPaymentInfo()}

                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        Tipe Tiket
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {selectedConcert && selectedConcert.sections && selectedConcert.sections.length > 0 ? (
                                            selectedConcert.sections.map((section) => (
                                                <button
                                                    key={section.name}
                                                    type="button"
                                                    disabled={section.availableSeats <= 0}
                                                    onClick={() => {
                                                        console.log("Tipe tiket dipilih:", section.name);
                                                        setTicketType(section.name);
                                                        setSeatNumber(''); // Reset pilihan kursi saat tipe tiket berubah
                                                        setSeatSelectorOpen(true); // Buka selector kursi langsung
                                                    }}
                                                    className={`py-3 px-4 rounded-lg border transition duration-300 
                                                        ${section.availableSeats <= 0 ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed' :
                                                            ticketType === section.name ?
                                                                'bg-purple-600 border-purple-500 text-white' :
                                                                'bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-500'
                                                        }`}
                                                >
                                                    <div className="text-sm">{section.name}</div>
                                                    <div className="text-xs mt-1">{section.price} SOL</div>
                                                    <div className="text-xs mt-1">{section.availableSeats}/{section.totalSeats} kursi</div>
                                                </button>
                                            ))
                                        ) : (
                                            // Default options jika tidak ada section
                                            ['Regular', 'VIP', 'Backstage'].map((type) => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => {
                                                        console.log("Tipe tiket default dipilih:", type);
                                                        setTicketType(type);
                                                        setSeatNumber(''); // Reset pilihan kursi saat tipe tiket berubah
                                                        setSeatSelectorOpen(true); // Buka selector kursi langsung
                                                    }}
                                                    className={`py-3 px-4 rounded-lg border transition duration-300 ${ticketType === type
                                                        ? 'bg-purple-600 border-purple-500 text-white'
                                                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-500'
                                                        }`}
                                                >
                                                    {type}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Seat Selection Section */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-gray-300 text-sm font-medium">
                                            Pilih Kursi
                                        </label>
                                        {seatNumber && (
                                            <span className="text-purple-400 text-sm">
                                                Kursi terpilih: <strong>{seatNumber}</strong>
                                            </span>
                                        )}
                                    </div>

                                    {/* Jika konser dan tipe tiket dipilih tetapi pemilihan kursi belum dibuka */}
                                    {!seatSelectorOpen && selectedConcert && ticketType ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                console.log("Membuka pemilihan kursi");
                                                setSeatSelectorOpen(true);
                                            }}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white hover:border-purple-500 focus:outline-none focus:border-purple-500 flex items-center justify-between"
                                        >
                                            <span>
                                                {seatNumber ? `Kursi: ${seatNumber}` : 'Klik untuk memilih kursi'}
                                            </span>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    ) : !selectedConcert || !ticketType ? (
                                        // Tampilkan pesan jika konser atau tipe tiket belum dipilih
                                        <div className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-500">
                                            Silakan pilih konser dan tipe tiket terlebih dahulu
                                        </div>
                                    ) : (
                                        // Tampilkan pemilihan kursi jika sudah terbuka
                                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <h3 className="text-white text-sm font-medium">Pemilihan Kursi</h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setSeatSelectorOpen(false)}
                                                    className="text-gray-400 hover:text-white"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* SeatSelector component */}
                                            <SeatSelector
                                                ticketType={ticketType}
                                                concertId={concert}
                                                selectedConcert={selectedConcert}
                                                onSeatSelected={handleSeatSelected}
                                                mintedSeats={mintedSeats}
                                                refreshTrigger={refreshTrigger}
                                                ticketPrice={selectedConcert.sections.find(s => s.name === ticketType)?.price || 0.01}
                                            />
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
                                        <p className="text-red-500 text-sm">{error}</p>
                                    </div>
                                )}

                                {success && (
                                    <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
                                        <p className="text-green-500 text-sm">
                                            Tiket berhasil dibuat! [Tipe: {ticketType} - Kursi: {seatNumber}]
                                        </p>
                                        <p className="text-green-500 text-xs mt-1">
                                            Mengalihkan ke halaman Tiket Saya...
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !concert || !ticketType || !seatNumber || !isAuthenticated || solanaBalance < (selectedConcert?.sections.find(s => s.name === ticketType)?.price || 0)}
                                    className={`w-full bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg group ${(loading || !concert || !ticketType || !seatNumber || !isAuthenticated || solanaBalance < (selectedConcert?.sections.find(s => s.name === ticketType)?.price || 0)) ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-purple-500/20'
                                        }`}
                                >
                                    <div className="bg-gray-900 rounded-md py-3 px-6 text-white font-medium group-hover:bg-gray-900/80 transition duration-300">
                                        {loading ? (
                                            <span className="flex items-center justify-center">
                                                <LoadingSpinner />
                                                <span className="ml-2">Membuat Tiket...</span>
                                            </span>
                                        ) : (
                                            'Mint Tiket dengan Solana'
                                        )}
                                    </div>
                                </button>

                                {!isAuthenticated && (
                                    <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 mt-4">
                                        <p className="text-yellow-500 text-sm flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            Anda perlu melakukan autentikasi untuk mint tiket.
                                        </p>
                                    </div>
                                )}
                            </form>
                        )}

                        {/* Transaction Fee Info */}
                        <div className="mt-8 text-center">
                            <p className="text-gray-400 text-sm">
                                Estimasi biaya transaksi: <span className="text-purple-400">0.000005 SOL</span>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default MintTicket;