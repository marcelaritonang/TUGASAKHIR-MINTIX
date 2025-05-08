// src/components/SeatSelector.js
import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import LoadingSpinner from './common/LoadingSpinner';
import ApiService from '../services/ApiService';
import blockchainService from '../services/blockchain';

const SeatSelector = ({ ticketType, concertId, selectedConcert, onSeatSelected, mintedSeats = [], refreshTrigger, ticketPrice = 0.01 }) => {
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [availableSeats, setAvailableSeats] = useState([]);
    const [selectedSeat, setSelectedSeat] = useState('');
    const [rows, setRows] = useState(0);
    const [columns, setColumns] = useState(0);
    const [solanaBalance, setSolanaBalance] = useState(0);
    const [exactMintedSeats, setExactMintedSeats] = useState([]);
    const [sectionAvailableSeats, setSectionAvailableSeats] = useState(0);
    const [sectionTotalSeats, setSectionTotalSeats] = useState(0);
    const [refreshInterval, setRefreshInterval] = useState(null);

    // Ref untuk mencegah multiple API calls
    const loadingRef = useRef(false);
    const lastRefreshRef = useRef(Date.now());

    // Debug log
    useEffect(() => {
        console.log("SeatSelector Props:", {
            ticketType,
            concertId,
            mintedSeats: mintedSeats?.length || 0,
            refreshTrigger
        });
    }, [ticketType, concertId, mintedSeats, refreshTrigger]);

    // Set up polling untuk refresh minted seats secara otomatis
    useEffect(() => {
        // Bersihkan interval yang ada jika ada
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }

        // Hanya set up polling jika ada concertId dan ticketType
        if (concertId && ticketType) {
            // Set interval untuk refresh data setiap 10 detik
            const interval = setInterval(() => {
                const now = Date.now();
                // Hindari refresh terlalu sering (minimal 8 detik sejak refresh terakhir)
                if (now - lastRefreshRef.current >= 8000 && !loadingRef.current) {
                    console.log("Auto-refreshing minted seats...");
                    refreshMintedSeats();
                }
            }, 10000);

            setRefreshInterval(interval);
        }

        // Cleanup saat komponen unmount
        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [concertId, ticketType]);

    // Fungsi untuk refresh minted seats
    const refreshMintedSeats = async () => {
        if (!concertId || loadingRef.current) return;

        loadingRef.current = true;
        lastRefreshRef.current = Date.now();

        try {
            const result = await ApiService.getMintedSeats(concertId);
            if (result && result.seats) {
                // Filter berdasarkan ticket type
                const filtered = result.seats.filter(seat => {
                    return seat.startsWith(`${ticketType}-`);
                });

                // Periksa apakah ada perubahan
                const currentSeats = new Set(exactMintedSeats);
                const newSeats = new Set(filtered);
                let hasChanges = false;

                // Periksa jika jumlah kursi berbeda
                if (currentSeats.size !== newSeats.size) {
                    hasChanges = true;
                } else {
                    // Periksa perbedaan kursi
                    for (const seat of newSeats) {
                        if (!currentSeats.has(seat)) {
                            hasChanges = true;
                            break;
                        }
                    }
                }

                // Update hanya jika ada perubahan
                if (hasChanges) {
                    console.log(`Minted seats berubah: ${exactMintedSeats.length} → ${filtered.length}`);
                    setExactMintedSeats(filtered);
                    // Regenerate seats
                    generateSeats(filtered);
                }
            }
        } catch (err) {
            console.error("Error refreshing minted seats:", err);
        } finally {
            loadingRef.current = false;
        }
    };

    // Filter minted seats untuk tipe tiket tertentu
    useEffect(() => {
        if (Array.isArray(mintedSeats) && ticketType) {
            // Filter untuk mendapatkan hanya kursi yang sesuai dengan tipe tiket saat ini
            const filtered = mintedSeats.filter(seat => {
                // Format seat biasanya: "TypeTiket-KodeKursi" (e.g., "VIP-A12")
                return seat.startsWith(`${ticketType}-`);
            });

            console.log(`Kursi terfilter untuk ${ticketType}:`, filtered);
            setExactMintedSeats(filtered);

            // Jika selectedConcert tersedia, perbarui jumlah kursi tersedia
            if (selectedConcert) {
                const section = selectedConcert.sections.find(s => s.name === ticketType);
                if (section) {
                    // Setel jumlah kursi tersedia berdasarkan total kursi dikurangi jumlah kursi yang terjual
                    const availableCount = Math.max(0, section.totalSeats - filtered.length);
                    setSectionAvailableSeats(availableCount);
                    setSectionTotalSeats(section.totalSeats);

                    // Penting: Perbarui section.availableSeats di prop selectedConcert
                    // dengan cara panggil callback untuk melakukan update
                    if (section.availableSeats !== availableCount) {
                        console.log(`Memperbarui jumlah kursi yang tersedia untuk ${ticketType}: ${availableCount}/${section.totalSeats}`);
                        // Kirim data perubahan melalui onSeatSelected dengan parameter khusus
                        onSeatSelected(null, {
                            updateAvailability: true,
                            ticketType: ticketType,
                            availableSeats: availableCount,
                            totalSeats: section.totalSeats
                        });
                    }
                }
            }
        } else {
            setExactMintedSeats([]);
        }
    }, [mintedSeats, ticketType, selectedConcert]);

    // Mengambil saldo Solana wallet
    useEffect(() => {
        const fetchSolanaBalance = async () => {
            if (wallet && wallet.publicKey) {
                try {
                    // Gunakan blockchainService untuk mendapatkan saldo
                    const balance = await blockchainService.getSolanaBalance(wallet.publicKey);
                    setSolanaBalance(balance);
                    console.log(`Saldo Solana: ${balance} SOL`);
                } catch (err) {
                    console.error("Error fetching Solana balance:", err);
                }
            }
        };

        fetchSolanaBalance();
    }, [wallet, wallet.publicKey]);

    // Menghasilkan layout kursi saat komponen dimuat atau saat properti berubah
    useEffect(() => {
        if (!ticketType || !selectedConcert) {
            setAvailableSeats([]);
            return;
        }

        generateSeats();
    }, [ticketType, selectedConcert, exactMintedSeats, refreshTrigger]);

    // Fungsi untuk menghasilkan layout kursi berdasarkan jumlah total kursi dan kursi yang sudah di-mint
    const generateSeats = (mintedSeatsArray = null) => {
        setLoading(true);
        setError('');

        try {
            // Temukan seksi tiket yang dipilih
            const section = selectedConcert.sections.find(s => s.name === ticketType);

            if (!section) {
                throw new Error(`Tipe tiket ${ticketType} tidak ditemukan`);
            }

            // Gunakan parameter mintedSeatsArray jika disediakan, jika tidak gunakan state exactMintedSeats
            const seatsToCheck = mintedSeatsArray || exactMintedSeats;

            console.log(`Generating seats for ${ticketType}:`, {
                availableSeats: section.availableSeats,
                totalSeats: section.totalSeats,
                exactMintedSeats: seatsToCheck.length
            });

            // Calculate correct available seats
            const realAvailableSeats = section.totalSeats - seatsToCheck.length;
            setSectionAvailableSeats(realAvailableSeats);
            setSectionTotalSeats(section.totalSeats);

            // Tentukan layout kursi (jumlah baris dan kolom)
            const totalSeats = section.totalSeats;
            const aspectRatio = 2; // Rasio lebar:tinggi

            // Hitung jumlah baris dan kolom
            let cols = Math.ceil(Math.sqrt(totalSeats * aspectRatio));
            let rows = Math.ceil(totalSeats / cols);

            // Pastikan jumlah kursi mencukupi
            if (rows * cols < totalSeats) {
                cols += 1;
            }

            setRows(rows);
            setColumns(cols);

            // Buat array kursi dengan kode yang sesuai
            const allSeats = [];
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const seatNumber = row * cols + col + 1;
                    if (seatNumber <= totalSeats) {
                        // Format: VIP-A12
                        const rowLabel = String.fromCharCode(65 + Math.floor(row / 10)); // A, B, C, ...
                        const seatCode = `${ticketType}-${rowLabel}${seatNumber}`;

                        // Cek apakah kursi sudah terjual dengan pencocokan yang tepat
                        const isMinted = seatsToCheck.includes(seatCode);

                        allSeats.push({
                            code: seatCode,
                            row,
                            col,
                            isMinted
                        });
                    }
                }
            }

            console.log(`Generated ${allSeats.length} seats, ${allSeats.filter(s => s.isMinted).length} already minted`);
            setAvailableSeats(allSeats);

            // Jika seat yang dipilih sudah terjual, reset pilihan
            if (selectedSeat && allSeats.find(s => s.code === selectedSeat)?.isMinted) {
                setSelectedSeat('');
                onSeatSelected('');
            }
        } catch (err) {
            console.error("Error membuat layout kursi:", err);
            setError(err.message || "Gagal membuat layout kursi");
        } finally {
            setLoading(false);
        }
    };

    // Handler untuk pemilihan kursi
    const handleSeatClick = (seat) => {
        if (seat.isMinted) {
            console.log(`Kursi ${seat.code} sudah terjual dan tidak dapat dipilih`);
            return; // Jangan lakukan apa-apa jika kursi sudah di-mint
        }

        // Periksa saldo Solana
        if (solanaBalance < ticketPrice) {
            setError(`Saldo Solana tidak mencukupi. Diperlukan: ${ticketPrice} SOL, Saldo Anda: ${solanaBalance.toFixed(4)} SOL`);
            return;
        }

        console.log(`Selecting seat: ${seat.code}`);
        setSelectedSeat(seat.code);
        onSeatSelected(seat.code);
    };

    // Handler refresh manual
    const handleRefresh = async () => {
        if (loadingRef.current) return;

        console.log("Manual refreshing minted seats...");
        setLoading(true);
        await refreshMintedSeats();
        setLoading(false);
    };

    // Render loading state
    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <LoadingSpinner />
                <span className="ml-2 text-gray-300">Memuat layout kursi...</span>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
                <p className="text-red-500 text-sm">{error}</p>
            </div>
        );
    }

    // Render jika tidak ada konser atau tipe tiket yang dipilih
    if (!ticketType || !selectedConcert) {
        return (
            <div className="text-center py-4">
                <p className="text-gray-400">Silakan pilih konser dan tipe tiket terlebih dahulu</p>
            </div>
        );
    }

    // Render jika tidak ada kursi yang tersedia
    if (availableSeats.length === 0) {
        return (
            <div className="text-center py-4">
                <p className="text-gray-400">Tidak ada kursi tersedia untuk kategori ini</p>
            </div>
        );
    }

    // Get price from section
    const section = selectedConcert.sections.find(s => s.name === ticketType);
    const price = section ? section.price : 0;

    // Kelompokkan kursi berdasarkan baris untuk tampilan lebih baik
    const seatsByRow = [];
    for (let r = 0; r < rows; r++) {
        seatsByRow.push(availableSeats.filter(seat => seat.row === r));
    }

    return (
        <div className="seat-selector">
            {/* Informasi Harga dan Saldo */}
            <div className="bg-gray-800/50 p-3 rounded-lg mb-4 border border-purple-900/30">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 text-sm">Harga Tiket:</span>
                    <span className="text-purple-400 font-medium">{price} SOL</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 text-sm">Saldo Wallet:</span>
                    <span className={`${solanaBalance < price ? 'text-red-400' : 'text-green-400'} font-medium`}>
                        {solanaBalance.toFixed(4)} SOL
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                        <span className="text-gray-300 text-sm">Kursi Tersedia:</span>
                        <button
                            onClick={handleRefresh}
                            className="text-xs bg-gray-700 hover:bg-gray-600 p-1 rounded"
                            title="Refresh kursi tersedia"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                    <span className="text-purple-400 font-medium">
                        {sectionAvailableSeats}/{sectionTotalSeats}
                    </span>
                </div>
                {solanaBalance < price && (
                    <div className="mt-2 text-xs text-red-400">
                        Saldo tidak mencukupi untuk membeli tiket ini
                    </div>
                )}
            </div>

            {/* Stage */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-2 mb-4 rounded-lg">
                <span className="text-sm font-medium">PANGGUNG</span>
            </div>

            {/* Seat Legend */}
            <div className="flex justify-center mb-4 space-x-6">
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-700 rounded-sm mr-2"></div>
                    <span className="text-gray-400 text-xs">Tersedia</span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-purple-600 rounded-sm mr-2"></div>
                    <span className="text-gray-400 text-xs">Dipilih</span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500/50 rounded-sm mr-2"></div>
                    <span className="text-gray-400 text-xs">Terjual</span>
                </div>
            </div>

            {/* Seats Grid */}
            <div className="overflow-auto max-h-60 my-2 pb-2 px-1">
                {seatsByRow.map((rowSeats, rowIndex) => (
                    <div
                        key={`row-${rowIndex}`}
                        className="grid gap-1 mx-auto mb-1"
                        style={{
                            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                            maxWidth: `${columns * 28}px`
                        }}
                    >
                        {rowSeats.map(seat => (
                            <div
                                key={seat.code}
                                onClick={() => handleSeatClick(seat)}
                                className={`
                                    w-6 h-6 flex items-center justify-center rounded-sm text-xs
                                    transition-all duration-200 
                                    ${seat.isMinted
                                        ? 'bg-red-500/50 text-gray-200 cursor-not-allowed'
                                        : selectedSeat === seat.code
                                            ? 'bg-purple-600 text-white cursor-pointer transform hover:scale-110'
                                            : 'bg-gray-700 text-gray-300 cursor-pointer hover:bg-gray-600'
                                    }
                                `}
                                title={`${seat.code} ${seat.isMinted ? '(Sudah Terjual)' : ''}`}
                            >
                                {seat.col + 1}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Row Labels */}
            <div className="grid grid-cols-3 gap-2 text-center mt-4">
                {Array.from({ length: Math.min(rows, 9) }).map((_, index) => (
                    <div key={index} className="text-xs text-gray-400">
                        Baris {String.fromCharCode(65 + index)}
                    </div>
                ))}
            </div>

            {/* Selected Seat Info */}
            {selectedSeat && (
                <div className="mt-4 text-center">
                    <button
                        onClick={() => onSeatSelected(selectedSeat)}
                        className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md text-sm transition-colors"
                        disabled={solanaBalance < price}
                    >
                        Pilih Kursi {selectedSeat}
                    </button>
                </div>
            )}

            {/* Auto-refresh notification */}
            <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">Tampilan kursi disegarkan otomatis setiap 10 detik</p>
            </div>
        </div>
    );
};

export default SeatSelector;