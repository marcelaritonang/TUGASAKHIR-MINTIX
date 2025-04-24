import React, { useState, useEffect } from 'react';

const SeatSelector = ({ ticketType, concertId, onSeatSelected, selectedConcert, mintedSeats = [], refreshTrigger = 0 }) => {
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedRow, setSelectedRow] = useState('');
    const [selectedSeat, setSelectedSeat] = useState('');
    const [sections, setSections] = useState([]);
    const [rows, setRows] = useState([]);
    const [seats, setSeats] = useState([]);
    const [availabilityMap, setAvailabilityMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [totalSeats, setTotalSeats] = useState(0);
    const [error, setError] = useState('');

    // Debug log saat komponen dimount
    useEffect(() => {
        console.log("[SeatSelector] Component mounted");
        console.log("[SeatSelector] Initial mintedSeats:", mintedSeats);
    }, []);

    // Inisialisasi peta dari setiap section ke baris dan kursi yang tersedia
    const initializeAvailabilityMap = (totalSeats, sections) => {
        const seatMap = {};
        let remainingSeats = totalSeats;

        // Jika tidak ada kursi tersedia, return peta kosong
        if (totalSeats <= 0) {
            return seatMap;
        }

        // Buat daftar section yang akan digunakan
        const sectionsToUse = sections.slice(0, Math.min(sections.length, 3));

        // Distribusikan kursi ke setiap section
        const seatsPerSection = Math.max(1, Math.ceil(totalSeats / sectionsToUse.length));

        sectionsToUse.forEach((section, index) => {
            // Berapa kursi untuk section ini?
            const seatsForThisSection = Math.min(remainingSeats, seatsPerSection);
            if (seatsForThisSection <= 0) return;

            // Berapa baris untuk section ini? (maksimal 3 baris per section)
            const rows = Math.min(3, Math.ceil(seatsForThisSection / 5));
            const seatsPerRow = Math.ceil(seatsForThisSection / rows);

            let seatsLeft = seatsForThisSection;

            // Buat baris dan kursi
            for (let row = 1; row <= rows; row++) {
                const rowKey = `${section}-${row}`;
                seatMap[rowKey] = {};

                // Berapa kursi untuk baris ini?
                const seatsForThisRow = Math.min(seatsLeft, seatsPerRow);

                // Buat kursi
                for (let seat = 1; seat <= seatsForThisRow; seat++) {
                    seatMap[rowKey][seat.toString()] = true;
                }

                seatsLeft -= seatsForThisRow;
                if (seatsLeft <= 0) break;
            }

            remainingSeats -= seatsForThisSection;
        });

        return seatMap;
    };

    // Konfigurasi sections, rows, dan seats berdasarkan jenis tiket dan konser terpilih
    useEffect(() => {
        if (!ticketType || !selectedConcert) return;

        setLoading(true);
        setError('');

        // Reset selections when ticket type changes
        setSelectedSection('');
        setSelectedRow('');
        setSelectedSeat('');

        // Define sections based on ticket type
        let sectionsForType = [];
        switch (ticketType) {
            case 'Regular':
                sectionsForType = ['C', 'D', 'E'];
                break;
            case 'VIP':
                sectionsForType = ['A', 'B'];
                break;
            case 'Backstage':
                sectionsForType = ['BACKSTAGE'];
                break;
            default:
                sectionsForType = [];
        }

        setSections(sectionsForType);

        // Khusus untuk jumlah kecil, atur sesuai kebutuhan
        let seatsToShow = 0;
        const availableTickets = selectedConcert.available;

        // Pendekatan khusus untuk tiket tersedia rendah (< 10)
        if (availableTickets < 10) {
            // Untuk tiket <= 3, beri pembagian 1 tiket per jenis
            if (availableTickets <= 3) {
                switch (ticketType) {
                    case 'Regular':
                        // Untuk jumlah tiket <= 3, berikan prioritas ke Regular
                        if (availableTickets === 1) {
                            seatsToShow = 1;  // Regular mendapat 1 tiket jika hanya 1 tersedia
                        } else if (availableTickets === 2) {
                            seatsToShow = 1;  // Regular mendapat 1 tiket jika 2 tersedia (VIP 1)
                        } else if (availableTickets === 3) {
                            seatsToShow = 1;  // Regular, VIP, Backstage masing-masing 1
                        }
                        break;
                    case 'VIP':
                        // VIP hanya mendapat tiket jika tersedia 2 atau lebih
                        if (availableTickets >= 2) {
                            seatsToShow = 1;
                        } else {
                            seatsToShow = 0;
                        }
                        break;
                    case 'Backstage':
                        // Backstage hanya mendapat tiket jika tersedia 3
                        if (availableTickets >= 3) {
                            seatsToShow = 1;
                        } else {
                            seatsToShow = 0;
                        }
                        break;
                    default:
                        seatsToShow = 0;
                }
            }
            // Untuk tiket 4-9, beri pembagian proporsional
            else {
                switch (ticketType) {
                    case 'Regular':
                        // Regular mendapat setengah dari yang tersedia (dibulatkan ke bawah untuk memastikan tidak melebihi)
                        seatsToShow = Math.floor(availableTickets * 0.5);
                        break;
                    case 'VIP':
                        // VIP mendapat sepertiga dari yang tersedia
                        seatsToShow = Math.floor(availableTickets * 0.33);
                        break;
                    case 'Backstage':
                        // Backstage mendapat sisanya
                        const regularSeats = Math.floor(availableTickets * 0.5);
                        const vipSeats = Math.floor(availableTickets * 0.33);
                        seatsToShow = availableTickets - regularSeats - vipSeats;
                        break;
                    default:
                        seatsToShow = 0;
                }
            }
        }
        // Pendekatan untuk tiket >= 10
        else {
            switch (ticketType) {
                case 'Regular':
                    // Gunakan pendekatan persentase dengan pembagian eksak
                    seatsToShow = Math.floor(availableTickets * 0.5);
                    break;
                case 'VIP':
                    seatsToShow = Math.floor(availableTickets * 0.33);
                    break;
                case 'Backstage':
                    // Ambil sisanya untuk memastikan jumlah kursi persis sama dengan total
                    const regularSeats = Math.floor(availableTickets * 0.5);
                    const vipSeats = Math.floor(availableTickets * 0.33);
                    seatsToShow = availableTickets - regularSeats - vipSeats;
                    break;
                default:
                    seatsToShow = 0;
            }
        }

        // Log untuk debugging
        console.log(`[SeatSelector] Tipe: ${ticketType}, Available: ${availableTickets}, Kursi: ${seatsToShow}`);

        setTotalSeats(seatsToShow);

        // Buat peta kursi yang tersedia menggunakan metode sederhana
        // yang memastikan semua kursi dibuat dengan benar
        const seatMap = initializeAvailabilityMap(seatsToShow, sectionsForType);

        // Log untuk debugging
        console.log("[SeatSelector] Initial seat map:", seatMap);

        // Tandai kursi yang sudah dimint sebagai tidak tersedia
        if (mintedSeats && mintedSeats.length > 0) {
            mintedSeats.forEach(mintedSeat => {
                try {
                    const [section, row, seat] = mintedSeat.split('-');
                    const rowKey = `${section}-${row}`;
                    if (seatMap[rowKey] && seatMap[rowKey][seat] !== undefined) {
                        seatMap[rowKey][seat] = false;
                        console.log(`[SeatSelector] Marked initial minted seat ${mintedSeat} as unavailable`);
                    }
                } catch (err) {
                    console.error("[SeatSelector] Error marking minted seat:", err);
                }
            });
        }

        setAvailabilityMap(seatMap);
        setLoading(false);
    }, [ticketType, concertId, selectedConcert]);

    // Process mintedSeats when component mounts or when refreshTrigger changes
    useEffect(() => {
        if (refreshTrigger > 0 && Object.keys(availabilityMap).length > 0 && mintedSeats && mintedSeats.length > 0) {
            console.log("[SeatSelector] Processing refreshTrigger:", refreshTrigger);
            console.log("[SeatSelector] Current mintedSeats:", mintedSeats);

            // Buat salinan peta yang ada
            const updatedMap = JSON.parse(JSON.stringify(availabilityMap));

            // Tandai kursi yang sudah dimint
            mintedSeats.forEach(mintedSeat => {
                try {
                    const [section, row, seat] = mintedSeat.split('-');
                    const rowKey = `${section}-${row}`;

                    if (updatedMap[rowKey] && updatedMap[rowKey][seat] !== undefined) {
                        updatedMap[rowKey][seat] = false;
                        console.log(`[SeatSelector] Marked refreshed seat ${mintedSeat} as unavailable`);
                    }
                } catch (err) {
                    console.error(`[SeatSelector] Error processing minted seat: ${mintedSeat}`, err);
                }
            });

            setAvailabilityMap(updatedMap);

            // Reset seat selection if the currently selected seat has been minted
            if (selectedSection && selectedRow && selectedSeat) {
                const currentSelection = `${selectedSection}-${selectedRow}-${selectedSeat}`;
                if (mintedSeats.includes(currentSelection)) {
                    setSelectedSeat('');
                    onSeatSelected('');
                }
            }
        }
    }, [refreshTrigger, mintedSeats]);

    // Efek untuk memproses mintedSeats saat pertama kali komponen mount
    useEffect(() => {
        // Trigger display update with current mintedSeats
        if (mintedSeats && mintedSeats.length > 0 && availabilityMap && Object.keys(availabilityMap).length > 0) {
            console.log("[SeatSelector] Processing initial minted seats");

            // Create a deep copy of the seat map
            const updatedMap = JSON.parse(JSON.stringify(availabilityMap));

            // Mark all minted seats as unavailable
            mintedSeats.forEach(mintedSeat => {
                try {
                    const [section, row, seat] = mintedSeat.split('-');
                    const rowKey = `${section}-${row}`;

                    if (updatedMap[rowKey] && updatedMap[rowKey][seat] !== undefined) {
                        updatedMap[rowKey][seat] = false;
                        console.log(`[SeatSelector] Marked initial seat ${mintedSeat} as unavailable`);
                    }
                } catch (err) {
                    console.error(`[SeatSelector] Error processing initial minted seat: ${mintedSeat}`, err);
                }
            });

            setAvailabilityMap(updatedMap);
        }
    }, []);

    // When section changes, update available rows
    useEffect(() => {
        if (!selectedSection) {
            setRows([]);
            return;
        }

        // Dapatkan semua baris yang ada di section ini
        const rowsInSection = [];
        Object.keys(availabilityMap).forEach(key => {
            // Format key adalah "SECTION-ROW"
            const [section, row] = key.split('-');
            if (section === selectedSection) {
                // Masukkan semua baris, tidak hanya yang memiliki kursi tersedia
                if (!rowsInSection.includes(row)) {
                    rowsInSection.push(row);
                }
            }
        });

        console.log(`[SeatSelector] Rows in section ${selectedSection}:`, rowsInSection);
        setRows(rowsInSection.sort((a, b) => parseInt(a) - parseInt(b))); // Urutkan secara numerik
        setSelectedRow('');
        setSelectedSeat('');
    }, [selectedSection, availabilityMap]);

    // When row changes, update available seats
    useEffect(() => {
        if (!selectedSection || !selectedRow) {
            setSeats([]);
            return;
        }

        const rowKey = `${selectedSection}-${selectedRow}`;
        if (!availabilityMap[rowKey]) {
            setSeats([]);
            return;
        }

        // Ambil SEMUA nomor kursi yang ada dari availability map (termasuk yang tidak tersedia)
        // Ini memastikan semua kursi ditampilkan, baik yang tersedia maupun yang sudah dimint
        const allSeats = Object.keys(availabilityMap[rowKey])
            .sort((a, b) => parseInt(a) - parseInt(b)); // Urutkan secara numerik

        console.log(`[SeatSelector] Row ${rowKey} seats:`, allSeats);
        console.log(`[SeatSelector] Row ${rowKey} availability:`, availabilityMap[rowKey]);

        setSeats(allSeats);
        setSelectedSeat('');
    }, [selectedSection, selectedRow, availabilityMap]);

    // When all three are selected, call the parent's callback
    useEffect(() => {
        if (selectedSection && selectedRow && selectedSeat) {
            const fullSeatNumber = `${selectedSection}-${selectedRow}-${selectedSeat}`;
            onSeatSelected(fullSeatNumber);
        } else {
            onSeatSelected('');
        }
    }, [selectedSection, selectedRow, selectedSeat, onSeatSelected]);

    // Efek untuk memeriksa apakah kursi tersedia
    const isSeatAvailable = (section, row, seat) => {
        const rowKey = `${section}-${row}`;
        const seatKey = `${section}-${row}-${seat}`;

        // Cek di availabilityMap
        const isAvailableInMap = availabilityMap[rowKey] &&
            availabilityMap[rowKey][seat] !== undefined &&
            availabilityMap[rowKey][seat] === true;

        // Cek di mintedSeats
        const isNotMinted = !(mintedSeats && mintedSeats.includes(seatKey));

        return isAvailableInMap && isNotMinted;
    };

    // Fungsi untuk memeriksa apakah kursi sudah dimint
    const isSeatMinted = (section, row, seat) => {
        const seatId = `${section}-${row}-${seat}`;
        return mintedSeats && mintedSeats.includes(seatId);
    };

    return (
        <div className="space-y-4">
            <div className="mb-2 text-center">
                <p className="text-white text-sm">
                    Kursi tersedia untuk tiket {ticketType}: <span className="font-bold">{totalSeats}</span>
                </p>
                {mintedSeats && mintedSeats.length > 0 && (
                    <p className="text-amber-400 text-sm mt-1">
                        Kursi telah dimint: <span className="font-bold">{mintedSeats.length}</span>
                    </p>
                )}
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 mb-3">
                    <p className="text-red-500 text-sm">{error}</p>
                </div>
            )}

            {totalSeats > 0 ? (
                <>
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                            Pilih Section
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {sections.map(section => {
                                // Hitung total kursi tersedia di section ini
                                const availableInSection = Object.keys(availabilityMap)
                                    .filter(key => key.startsWith(`${section}-`))
                                    .reduce((count, key) => {
                                        return count + Object.values(availabilityMap[key])
                                            .filter(available => available).length;
                                    }, 0);

                                return (
                                    <button
                                        key={section}
                                        type="button"
                                        onClick={() => setSelectedSection(section)}
                                        className={`py-2 px-4 rounded-lg border text-center transition duration-300 ${selectedSection === section
                                            ? 'bg-purple-600 border-purple-500 text-white'
                                            : availableInSection === 0
                                                ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-red-500'
                                                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-500'
                                            }`}
                                    >
                                        {section} ({availableInSection})
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {selectedSection && (
                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Pilih Baris
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {rows.length > 0 ? (
                                    rows.map(row => {
                                        // Hitung kursi tersedia di baris ini
                                        const rowKey = `${selectedSection}-${row}`;
                                        const seatsInRow = availabilityMap[rowKey] || {};
                                        const availableInRow = Object.values(seatsInRow).filter(available => available).length;
                                        const totalInRow = Object.keys(seatsInRow).length;

                                        return (
                                            <button
                                                key={row}
                                                type="button"
                                                onClick={() => setSelectedRow(row)}
                                                className={`py-2 px-3 rounded-lg border text-center transition duration-300 ${selectedRow === row
                                                    ? 'bg-purple-600 border-purple-500 text-white'
                                                    : availableInRow === 0
                                                        ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-red-500'
                                                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-500'
                                                    }`}
                                            >
                                                {row} ({availableInRow}/{totalInRow})
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-5 text-center text-amber-400 py-3">
                                        Tidak ada baris tersedia di section ini
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {selectedSection && selectedRow && (
                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Pilih Kursi
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {seats.length > 0 ? (
                                    Object.keys(availabilityMap[`${selectedSection}-${selectedRow}`] || {}).map(seat => {
                                        const seatKey = `${selectedSection}-${selectedRow}-${seat}`;
                                        // Periksa dua kondisi: status kursi di availabilityMap dan apakah ada di mintedSeats
                                        const isAvailable = isSeatAvailable(selectedSection, selectedRow, seat);
                                        const isMinted = isSeatMinted(selectedSection, selectedRow, seat);

                                        // Kursi tidak tersedia jika statusnya false di availabilityMap atau ada di mintedSeats
                                        const isDisabled = !isAvailable || isMinted;

                                        // Debug log
                                        console.log(`Seat ${seatKey}: available=${isAvailable}, minted=${isMinted}, disabled=${isDisabled}`);

                                        return (
                                            <button
                                                key={seat}
                                                type="button"
                                                disabled={isDisabled}
                                                onClick={() => {
                                                    console.log(`Selected seat: ${selectedSection}-${selectedRow}-${seat}`);
                                                    console.log(`Is available in map: ${availabilityMap[`${selectedSection}-${selectedRow}`][seat]}`);
                                                    console.log(`Is not in mintedSeats: ${!mintedSeats.includes(`${selectedSection}-${selectedRow}-${seat}`)}`);
                                                    setSelectedSeat(seat);
                                                }}
                                                className={`py-2 px-3 rounded-lg border text-center transition duration-300 
                                                ${isDisabled
                                                        ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
                                                        : selectedSeat === seat
                                                            ? 'bg-purple-600 border-purple-500 text-white'
                                                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-500'
                                                    }`}
                                            >
                                                {seat}
                                                {isDisabled && (
                                                    <span className="block text-xs mt-1">Sold</span>
                                                )}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-5 text-center text-amber-400 py-3">
                                        Tidak ada kursi tersedia di baris ini
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-amber-400">
                        Tidak ada kursi tersedia untuk tipe tiket ini.
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                        Coba pilih tipe tiket lain atau konser lainnya.
                    </p>
                </div>
            )}

            {loading && (
                <div className="flex justify-center py-4">
                    <svg className="animate-spin h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}

            {selectedSection && selectedRow && selectedSeat && (
                <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/50">
                    <p className="text-white text-sm text-center">
                        Kursi yang dipilih: <span className="font-bold">{selectedSection}-{selectedRow}-{selectedSeat}</span>
                    </p>
                </div>
            )}

            {/* Information about minted seats */}
            {mintedSeats && mintedSeats.length > 0 && (
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
                    <p className="text-gray-300 text-sm">
                        <span className="text-gray-400">■</span> Kursi yang sudah dimint (warna abu-abu)
                    </p>
                </div>
            )}
        </div>
    );
};

export default SeatSelector;