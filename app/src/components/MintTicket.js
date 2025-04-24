import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { getProgram } from '../utils/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as anchor from '@project-serum/anchor';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';

// Import SeatSelector component
import SeatSelector from '../components/SeatSelector';

// Gradient text component
const GradientText = ({ text, className = "" }) => {
    return (
        <span className={`text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 ${className}`}>
            {text}
        </span>
    );
};

// Loading Spinner component
const LoadingSpinner = ({ size = "h-5 w-5", color = "text-purple-500" }) => (
    <svg className={`animate-spin ${size} ${color}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const MintTicket = () => {
    const { concertId } = useParams();
    const navigate = useNavigate();
    const [concert, setConcert] = useState(concertId || '');
    const [ticketType, setTicketType] = useState('Regular');
    const [seatNumber, setSeatNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const wallet = useWallet();

    // State untuk loading daftar konser
    const [concerts, setConcerts] = useState([]);
    const [loadingConcerts, setLoadingConcerts] = useState(false);
    const [selectedConcert, setSelectedConcert] = useState(null);

    // State untuk menunjukkan apakah tampilan pemilihan kursi telah dibuka
    const [seatSelectorOpen, setSeatSelectorOpen] = useState(false);

    // Tambahkan state untuk melacak kursi yang sudah dimint
    const [mintedSeats, setMintedSeats] = useState([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Static concerts data (copied from ConcertList.js)
    const staticConcerts = [
        { id: 'static-1', name: 'EDM Festival 2025', venue: 'Metaverse Arena', date: 'Jun 15, 2025', available: 120, total: 500, category: 'festival', creator: 'Admin' },
        { id: 'static-2', name: 'Rock Legends', venue: 'Crypto Stadium', date: 'Jul 22, 2025', available: 75, total: 300, category: 'rock', creator: 'Admin' },
        { id: 'static-3', name: 'Jazz Night', venue: 'NFT Concert Hall', date: 'Aug 05, 2025', available: 50, total: 100, category: 'jazz', creator: 'Admin' },
        { id: 'static-4', name: 'Classical Symphony', venue: 'Blockchain Theater', date: 'Sep 18, 2025', available: 25, total: 400, category: 'classical', creator: 'Admin' },
        { id: 'static-5', name: 'Hip Hop Summit', venue: 'Web3 Arena', date: 'Oct 10, 2025', available: 200, total: 800, category: 'hiphop', creator: 'Admin' },
        { id: 'static-6', name: 'Electronic Music Night', venue: 'Digital Dome', date: 'Nov 20, 2025', available: 150, total: 500, category: 'electronic', creator: 'Admin' },
        { id: 'static-7', name: 'Pop Sensation', venue: 'Virtual Stadium', date: 'Dec 12, 2025', available: 300, total: 1000, category: 'pop', creator: 'Admin' },
        { id: 'static-8', name: 'Country Music Festival', venue: 'Decentralized Park', date: 'Jan 25, 2026', available: 100, total: 350, category: 'country', creator: 'Admin' },
    ];

    // Fungsi untuk mengambil daftar kursi yang sudah dimint
    const fetchMintedSeats = async (concertId) => {
        try {
            // Set loading state untuk menunjukkan sedang memuat data
            setLoading(true);

            console.log(`Fetching minted seats for concert: ${concertId}`);

            // Untuk tiket statis, kita gunakan localStorage
            if (concertId.startsWith('static-')) {
                const savedTickets = JSON.parse(localStorage.getItem('mintedStaticTickets') || '[]');
                const seatsForConcert = savedTickets
                    .filter(ticket => ticket.concertId === concertId)
                    .map(ticket => ticket.seatNumber);

                console.log(`Found ${seatsForConcert.length} minted seats for concert ${concertId}:`, seatsForConcert);
                setMintedSeats(seatsForConcert);
                setLoading(false);

                // Trigger refresh pada SeatSelector
                setRefreshTrigger(prev => prev + 1);
                return;
            }

            // Untuk tiket blockchain, kita perlu kueri dari blockchain
            if (wallet.connected) {
                try {
                    const program = getProgram(wallet);

                    // Metode simulasi menggunakan localStorage 
                    const savedBlockchainTickets = JSON.parse(localStorage.getItem(`blockchain_tickets_${concertId}`) || '[]');

                    console.log(`Found ${savedBlockchainTickets.length} blockchain tickets for concert ${concertId}:`, savedBlockchainTickets);
                    setMintedSeats(savedBlockchainTickets);

                    // Trigger refresh pada SeatSelector
                    setRefreshTrigger(prev => prev + 1);
                } catch (err) {
                    console.error("Error fetching blockchain tickets:", err);
                    setMintedSeats([]);
                } finally {
                    setLoading(false);
                }
            } else {
                console.log("Wallet not connected, can't fetch blockchain tickets");
                setMintedSeats([]);
                setLoading(false);
            }
        } catch (error) {
            console.error("Error fetching minted seats:", error);
            setMintedSeats([]);
            setLoading(false);
        }
    };

    // Efek untuk mengambil konser yang dipilih saat URL parameter berubah
    useEffect(() => {
        if (concertId) {
            setConcert(concertId);
        }
    }, [concertId]);

    // Fetch daftar kursi yang sudah dimint saat pertama kali atau saat ganti konser
    useEffect(() => {
        if (concert) {
            fetchMintedSeats(concert);
        }
    }, [concert, wallet.connected]);

    // Tambahkan useEffect baru untuk menangani navigasi halaman
    useEffect(() => {
        // Cleanup function untuk menyimpan state saat navigasi
        return () => {
            // Jika ada concertId dan selectedConcert, simpan state sementara
            if (concert && selectedConcert) {
                try {
                    // Simpan state terakhir untuk referensi
                    sessionStorage.setItem('lastViewedConcert', concert);
                    sessionStorage.setItem('lastTicketType', ticketType);
                } catch (err) {
                    console.error("Error saving session state:", err);
                }
            }
        };
    }, [concert, selectedConcert, ticketType]);

    // Efek untuk memuat state dari session storage saat mount
    useEffect(() => {
        // Jika tidak ada concertId dari URL, coba ambil dari session storage
        if (!concertId) {
            try {
                const lastConcert = sessionStorage.getItem('lastViewedConcert');
                const lastType = sessionStorage.getItem('lastTicketType');

                if (lastConcert) {
                    console.log("Restoring last viewed concert:", lastConcert);
                    setConcert(lastConcert);
                }

                if (lastType) {
                    setTicketType(lastType);
                }
            } catch (err) {
                console.error("Error restoring from session storage:", err);
            }
        }
    }, [concertId]);

    // Handler untuk pemilihan kursi
    const handleSeatSelected = (selectedSeat) => {
        setSeatNumber(selectedSeat);
    };

    const handleMintTicket = async (e) => {
        e.preventDefault();

        // Validasi apakah pengguna telah memilih kursi
        if (!seatNumber) {
            setError("Anda harus memilih kursi terlebih dahulu");
            return;
        }

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            // Check if selected concert is a static concert
            if (concert.startsWith('static-')) {
                // Untuk tiket statis, kita simpan ke localStorage
                try {
                    // Cek dulu apakah kursi ini sudah di-mint sebelumnya
                    const savedTickets = JSON.parse(localStorage.getItem('mintedStaticTickets') || '[]');
                    const seatAlreadyMinted = savedTickets.some(
                        ticket => ticket.concertId === concert && ticket.seatNumber === seatNumber
                    );

                    if (seatAlreadyMinted) {
                        setError(`Kursi ${seatNumber} sudah di-mint sebelumnya.`);
                        setLoading(false);
                        return;
                    }

                    // Tambahkan tiket baru ke daftar
                    savedTickets.push({
                        concertId: concert,
                        concertName: selectedConcert.name,
                        ticketType,
                        seatNumber,
                        date: new Date().toISOString()
                    });

                    localStorage.setItem('mintedStaticTickets', JSON.stringify(savedTickets));
                    console.log(`Successfully saved ticket ${seatNumber} for concert ${concert} to localStorage`);

                    // Update mintedSeats state
                    setMintedSeats(prev => {
                        const updatedSeats = [...prev, seatNumber];
                        console.log("Updated mintedSeats:", updatedSeats);
                        return updatedSeats;
                    });

                    // Update selected concert's available tickets
                    if (selectedConcert) {
                        const updatedConcert = {
                            ...selectedConcert,
                            available: selectedConcert.available - 1
                        };
                        setSelectedConcert(updatedConcert);

                        // Update the concerts list
                        setConcerts(prevConcerts =>
                            prevConcerts.map(c => c.id === updatedConcert.id ? updatedConcert : c)
                        );
                    }

                    // Show success message
                    setSuccess(true);

                    // Trigger refresh pada SeatSelector
                    setRefreshTrigger(prev => prev + 1);

                    // Reset form after delay
                    setTimeout(() => {
                        // Keep the concert selection but reset other fields
                        setTicketType('Regular');
                        setSeatNumber('');
                        setSuccess(false);
                        setSeatSelectorOpen(false);

                        // Fetch minted seats again to ensure we have the latest data
                        fetchMintedSeats(concert);
                    }, 3000);

                } catch (err) {
                    console.error("Error saving ticket to localStorage:", err);
                    setError("Terjadi kesalahan saat menyimpan tiket. Silakan coba lagi.");
                    setLoading(false);
                }

                setLoading(false);
                return;
            }

            // For blockchain concerts, we need a connected wallet
            if (!wallet.connected) {
                throw new Error("Silakan hubungkan wallet Anda terlebih dahulu");
            }

            const program = getProgram(wallet);

            // Validate concert selection
            if (!concert) {
                throw new Error("Silakan pilih konser terlebih dahulu");
            }

            // Validate the concert ID is a valid public key
            let concertPublicKey;
            try {
                concertPublicKey = new PublicKey(concert);
            } catch (err) {
                throw new Error("Invalid concert public key");
            }

            // Generate keypairs untuk mint dan token account
            const mintKeypair = Keypair.generate();
            const tokenAccountKeypair = Keypair.generate();

            console.log("Mint pubkey:", mintKeypair.publicKey.toString());
            console.log("Token account pubkey:", tokenAccountKeypair.publicKey.toString());

            // 1. Pertama, jalankan initializeMint
            console.log("Initializing mint...");
            const initMintTx = await program.methods
                .initializeMint()
                .accounts({
                    authority: wallet.publicKey,
                    buyer: wallet.publicKey,
                    mint: mintKeypair.publicKey,
                    tokenAccount: tokenAccountKeypair.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                })
                .signers([mintKeypair, tokenAccountKeypair])
                .rpc();

            console.log("Mint initialized: ", initMintTx);

            // 2. Kemudian, buat ticket
            const ticketKeypair = Keypair.generate();

            console.log("Creating ticket...");
            // Kirim seatNumber yang sudah dipilih melalui UI pemilihan kursi
            const seatOption = seatNumber || null;

            const createTicketTx = await program.methods
                .createTicket(ticketType, seatOption)
                .accounts({
                    authority: wallet.publicKey,
                    buyer: wallet.publicKey,
                    concert: concertPublicKey,
                    mint: mintKeypair.publicKey,
                    tokenAccount: tokenAccountKeypair.publicKey,
                    ticket: ticketKeypair.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([ticketKeypair])
                .rpc();

            console.log("Ticket created: ", createTicketTx);
            setSuccess(true);

            // Update local state to reflect the ticket sale
            if (selectedConcert) {
                const updatedConcert = {
                    ...selectedConcert,
                    available: selectedConcert.available - 1
                };
                setSelectedConcert(updatedConcert);

                // Update the concerts list
                setConcerts(concerts.map(c =>
                    c.id === updatedConcert.id ? updatedConcert : c
                ));
            }

            // Simpan data ke localStorage sementara untuk pengujian
            try {
                // Simpan data sementara di localStorage untuk pengujian
                const blockchainTickets = JSON.parse(localStorage.getItem(`blockchain_tickets_${concert}`) || '[]');

                if (!blockchainTickets.includes(seatNumber)) {
                    blockchainTickets.push(seatNumber);
                    localStorage.setItem(`blockchain_tickets_${concert}`, JSON.stringify(blockchainTickets));
                    console.log(`Saved blockchain ticket ${seatNumber} for concert ${concert} to localStorage`);
                }

                // Update mintedSeats state
                setMintedSeats(prev => [...prev, seatNumber]);

                // Trigger refresh SeatSelector
                setRefreshTrigger(prev => prev + 1);

                // Re-fetch minted seats
                setTimeout(() => {
                    fetchMintedSeats(concert);
                }, 1000);
            } catch (err) {
                console.error("Error saving blockchain ticket data:", err);
            }

            // Show success for 3 seconds, then reset form
            setTimeout(() => {
                setConcert('');
                setTicketType('Regular');
                setSeatNumber('');
                setSuccess(false);
                setSeatSelectorOpen(false);
                // Refresh available concerts
                fetchConcerts();
            }, 3000);

        } catch (error) {
            console.error("Error minting ticket:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch concerts function
    const fetchConcerts = async () => {
        try {
            setLoadingConcerts(true);
            setError('');

            // Always include static concerts
            let availableConcerts = [...staticConcerts];

            // If wallet is connected, fetch blockchain concerts
            if (wallet.connected) {
                try {
                    const program = getProgram(wallet);

                    // Fetch actual concerts from blockchain
                    const concertAccounts = await program.account.concert.all();

                    if (concertAccounts.length > 0) {
                        const fetchedConcerts = concertAccounts.map(concert => ({
                            id: concert.publicKey.toString(),
                            name: concert.account.name,
                            venue: concert.account.venue,
                            date: concert.account.date,
                            available: concert.account.totalTickets - concert.account.ticketsSold,
                            total: concert.account.totalTickets,
                            creator: concert.account.authority.toString(),
                            isBlockchain: true
                        }));

                        // Filter out concerts with no available tickets and add to our list
                        const availableBlockchainConcerts = fetchedConcerts.filter(c => c.available > 0);
                        availableConcerts = [...availableBlockchainConcerts, ...availableConcerts];
                    }
                } catch (err) {
                    console.error("Error fetching blockchain concerts:", err);
                    // Continue with static concerts only
                }
            }

            // Filter out concerts with no available tickets
            availableConcerts = availableConcerts.filter(c => c.available > 0);

            setConcerts(availableConcerts);

            // If we have a concertId parameter and it exists in our list, select it
            if (concertId) {
                const selected = availableConcerts.find(c => c.id === concertId);
                if (selected) {
                    setSelectedConcert(selected);
                } else {
                    setError("Konser yang dipilih tidak tersedia atau tidak ada.");
                }
            }
        } catch (error) {
            console.error("Error fetching concerts:", error);
            setError("Gagal mengambil data konser");
        } finally {
            setLoadingConcerts(false);
        }
    };

    // Ambil daftar konser untuk dropdown
    useEffect(() => {
        fetchConcerts();

        // Setup interval untuk auto-refresh daftar konser setiap menit
        const intervalId = setInterval(() => {
            console.log("Auto-refreshing concerts list...");
            fetchConcerts();
        }, 60000); // 60 detik

        // Cleanup interval saat unmount
        return () => clearInterval(intervalId);
    }, [wallet.connected]);

    // Update selected concert when concert ID changes
    useEffect(() => {
        if (concert && concerts.length > 0) {
            const selected = concerts.find(c => c.id === concert);
            setSelectedConcert(selected || null);

            // Reset seat selection when concert changes
            setSeatNumber('');
            setSeatSelectorOpen(false);
        } else {
            setSelectedConcert(null);
        }
    }, [concert, concerts]);

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
                    <div className="bg-gray-900 rounded-xl p-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
                            Mint <GradientText text="Tiket Konser" />
                        </h1>

                        {!wallet.connected && concerts.length === 0 ? (
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
                                        {loadingConcerts ? (
                                            <div className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-400 flex items-center justify-center h-12">
                                                <LoadingSpinner />
                                                <span className="ml-2">Memuat daftar konser...</span>
                                            </div>
                                        ) : (
                                            <select
                                                value={concert}
                                                onChange={(e) => setConcert(e.target.value)}
                                                required
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                            >
                                                <option value="">-- Pilih konser --</option>
                                                {/* Group concerts by type */}
                                                <optgroup label="Konser Blockchain">
                                                    {concerts
                                                        .filter(c => c.isBlockchain)
                                                        .map(c => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.name} - {c.venue} ({c.available}/{c.total} tiket)
                                                            </option>
                                                        ))}
                                                </optgroup>
                                                <optgroup label="Konser Admin">
                                                    {concerts
                                                        .filter(c => !c.isBlockchain)
                                                        .map(c => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.name} - {c.venue} ({c.available}/{c.total} tiket) [Admin]
                                                            </option>
                                                        ))}
                                                </optgroup>
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {/* Show selected concert details */}
                                {selectedConcert && (
                                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-white font-semibold">{selectedConcert.name}</h3>
                                            {selectedConcert.id.startsWith('static-') && (
                                                <span className="bg-purple-600 text-white text-xs py-1 px-2 rounded-full">
                                                    Dibuat Admin
                                                </span>
                                            )}
                                            {selectedConcert.isBlockchain && (
                                                <span className="bg-blue-600 text-white text-xs py-1 px-2 rounded-full">
                                                    Blockchain
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-400 block mb-1">Venue:</span>
                                                <p className="text-white">{selectedConcert.venue}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 block mb-1">Tanggal:</span>
                                                <p className="text-white">{selectedConcert.date}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <span className="text-gray-400 block mb-1">Tiket Tersedia:</span>
                                            <div className="flex items-center">
                                                <span className="text-white mr-2">{selectedConcert.available} dari {selectedConcert.total}</span>
                                                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-purple-500"
                                                        style={{ width: `${(selectedConcert.available / selectedConcert.total) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        Tipe Tiket
                                    </label>
                                    <div className="grid grid-cols-3 gap-4">
                                        {['Regular', 'VIP', 'Backstage'].map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => {
                                                    setTicketType(type);
                                                    setSeatNumber(''); // Reset seat selection when ticket type changes
                                                }}
                                                className={`py-3 px-4 rounded-lg border transition duration-300 ${ticketType === type
                                                    ? 'bg-purple-600 border-purple-500 text-white'
                                                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-500'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Seat Selection Button */}
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

                                    {!seatSelectorOpen ? (
                                        <button
                                            type="button"
                                            onClick={() => setSeatSelectorOpen(true)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white hover:border-purple-500 focus:outline-none focus:border-purple-500 flex items-center justify-between"
                                        >
                                            <span>
                                                {seatNumber ? `Kursi: ${seatNumber}` : 'Klik untuk memilih kursi'}
                                            </span>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    ) : (
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


                                            {/* Integrated SeatSelector component with updated props */}
                                            <SeatSelector
                                                ticketType={ticketType}
                                                concertId={concert}
                                                selectedConcert={selectedConcert}
                                                onSeatSelected={handleSeatSelected}
                                                mintedSeats={mintedSeats}
                                                refreshTrigger={refreshTrigger}
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
                                            {selectedConcert && selectedConcert.id.startsWith('static-')
                                                ? `Tiket admin berhasil dibuat! [${ticketType} - Kursi ${seatNumber}]`
                                                : `Tiket berhasil dibuat! [${ticketType} - Kursi ${seatNumber}]`}
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || loadingConcerts || !concert || !seatNumber}
                                    className={`w-full bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 rounded-lg group ${(loading || loadingConcerts || !concert || !seatNumber) ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-purple-500/20'
                                        }`}
                                >
                                    <div className="bg-gray-900 rounded-md py-3 px-6 text-white font-medium group-hover:bg-gray-900/80 transition duration-300">
                                        {loading ? (
                                            <span className="flex items-center justify-center">
                                                <LoadingSpinner />
                                                <span className="ml-2">Membuat Tiket...</span>
                                            </span>
                                        ) : (
                                            'Mint Tiket'
                                        )}
                                    </div>
                                </button>

                                {!seatNumber && concert && (
                                    <div className="mt-2 text-center">
                                        <p className="text-amber-400 text-sm">
                                            Anda harus memilih kursi terlebih dahulu
                                        </p>
                                    </div>
                                )}

                                {/* Wallet connection reminder */}
                                {selectedConcert && !selectedConcert.id.startsWith('static-') && !wallet.connected && (
                                    <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4 mt-4">
                                        <p className="text-blue-400 text-sm flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            Silakan hubungkan wallet Anda untuk membuat tiket blockchain.
                                        </p>
                                        <div className="mt-2 flex justify-center">
                                            <WalletMultiButton className="!bg-gradient-to-br !from-blue-600 !to-indigo-600 hover:!shadow-lg hover:!shadow-blue-500/20 transition duration-300 !text-sm !py-2" />
                                        </div>
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

                {/* Information Cards */}
                <div className="mt-12 grid md:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gray-800/50 rounded-lg p-6"
                    >
                        <div className="w-10 h-10 bg-purple-900/50 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="text-white font-semibold mb-2">Minting Aman</h3>
                        <p className="text-gray-400 text-sm">Tiket Anda dibuat sebagai NFT di blockchain Solana menjamin keasliannya.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gray-800/50 rounded-lg p-6"
                    >
                        <div className="w-10 h-10 bg-purple-900/50 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="text-white font-semibold mb-2">Transfer Instan</h3>
                        <p className="text-gray-400 text-sm">Transfer atau jual tiket Anda secara instan dengan biaya minimal.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gray-800/50 rounded-lg p-6"
                    >
                        <div className="w-10 h-10 bg-purple-900/50 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="text-white font-semibold mb-2">Beragam Tipe</h3>
                        <p className="text-gray-400 text-sm">Pilih dari tingkat akses Regular, VIP, dan Backstage.</p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default MintTicket;