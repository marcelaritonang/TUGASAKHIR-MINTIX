// src/utils/mockDataHelper.js
import { v4 as uuidv4 } from 'uuid'; // Pastikan uuid sudah diinstal

// Fungsi untuk mendapatkan konser yang sedang pending
export const getPendingConcerts = () => {
    try {
        // Ambil data konser dari localStorage
        const concertsData = localStorage.getItem('pendingConcerts');

        // Cek terlebih dahulu data konser dari CreateConcert.js
        console.log("Raw pendingConcerts:", concertsData);

        // Jika tidak ada data, kembalikan array kosong
        if (!concertsData) {
            console.log("No pending concerts found, returning empty array");
            return [];
        }

        // Parse JSON data
        const pendingConcerts = JSON.parse(concertsData);

        // Log untuk debugging
        console.log(`Found ${pendingConcerts.length} pending concerts in localStorage`);

        return pendingConcerts;
    } catch (error) {
        console.error("Error in getPendingConcerts:", error);
        return []; // Kembalikan array kosong jika terjadi error
    }
};

// Fungsi untuk mendapatkan konser yang sudah diapprove
export const getApprovedConcerts = () => {
    try {
        const concertsData = localStorage.getItem('approvedConcerts');
        if (!concertsData) {
            return [];
        }
        return JSON.parse(concertsData);
    } catch (error) {
        console.error("Error in getApprovedConcerts:", error);
        return [];
    }
};

// Fungsi untuk mendapatkan konser yang ditolak
export const getRejectedConcerts = () => {
    try {
        const concertsData = localStorage.getItem('rejectedConcerts');
        if (!concertsData) {
            return [];
        }
        return JSON.parse(concertsData);
    } catch (error) {
        console.error("Error in getRejectedConcerts:", error);
        return [];
    }
};

// Fungsi untuk menyimpan konser pending
export const savePendingConcerts = (concerts) => {
    try {
        localStorage.setItem('pendingConcerts', JSON.stringify(concerts));
        console.log(`Saved ${concerts.length} pending concerts to localStorage`);
    } catch (error) {
        console.error("Error saving pending concerts:", error);
        throw error;
    }
};

// Fungsi untuk menyimpan konser yang sudah diapprove
export const saveApprovedConcerts = (concerts) => {
    try {
        localStorage.setItem('approvedConcerts', JSON.stringify(concerts));
    } catch (error) {
        console.error("Error saving approved concerts:", error);
        throw error;
    }
};

// Fungsi untuk menyimpan konser yang ditolak
export const saveRejectedConcerts = (concerts) => {
    try {
        localStorage.setItem('rejectedConcerts', JSON.stringify(concerts));
    } catch (error) {
        console.error("Error saving rejected concerts:", error);
        throw error;
    }
};

// Fungsi untuk menambahkan log approval
export const addApprovalLog = (logEntry) => {
    try {
        const logs = JSON.parse(localStorage.getItem('approvalLogs') || '[]');
        logs.push(logEntry);
        localStorage.setItem('approvalLogs', JSON.stringify(logs));
    } catch (error) {
        console.error("Error adding approval log:", error);
        throw error;
    }
};

// Fungsi untuk mendapatkan log approval
export const getApprovalLogs = () => {
    try {
        return JSON.parse(localStorage.getItem('approvalLogs') || '[]');
    } catch (error) {
        console.error("Error getting approval logs:", error);
        return [];
    }
};

// Fungsi untuk membuat konser test
export const createTestConcert = (creatorWallet, status = 'pending') => {
    const id = 'test-' + Date.now();
    const venues = ['Istora Senayan', 'Gelora Bung Karno', 'ICE BSD', 'Lapangan D Senayan', 'Jakarta Convention Center'];
    const concertNames = ['Rock Festival', 'Jazz Night', 'EDM Extravaganza', 'Classical Symphony', 'K-Pop Concert'];

    // Generate data konser acak
    const testConcert = {
        id: id,
        name: concertNames[Math.floor(Math.random() * concertNames.length)],
        venue: venues[Math.floor(Math.random() * venues.length)],
        date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Random future date
        description: 'This is a test concert created for admin approval testing.',
        creator: creatorWallet,
        createdAt: new Date().toISOString(),
        status: status,
        sections: [
            {
                name: 'VIP',
                price: Math.round(Math.random() * 5 * 100) / 100, // Random price 0-5 SOL
                totalSeats: Math.floor(Math.random() * 50) + 10, // Random 10-60 seats
                availableSeats: Math.floor(Math.random() * 50) + 10 // Random 10-60 seats
            },
            {
                name: 'Regular',
                price: Math.round(Math.random() * 2 * 100) / 100, // Random price 0-2 SOL
                totalSeats: Math.floor(Math.random() * 100) + 50, // Random 50-150 seats
                availableSeats: Math.floor(Math.random() * 100) + 50 // Random 50-150 seats
            }
        ]
    };

    // Simpan konser baru ke localStorage
    const pendingConcerts = getPendingConcerts();
    pendingConcerts.push(testConcert);
    savePendingConcerts(pendingConcerts);

    console.log(`Created test concert: ${testConcert.name}`);
    return testConcert;
};

// Fungsi untuk membersihkan data localStorage (untuk testing/development)
export const clearAllMockData = () => {
    localStorage.removeItem('pendingConcerts');
    localStorage.removeItem('approvedConcerts');
    localStorage.removeItem('rejectedConcerts');
    localStorage.removeItem('approvalLogs');
    console.log("All mock concert data cleared from localStorage");
};

// Fungsi untuk mengimpor contoh konser dari CreateConcert.js
export const importUserConcerts = () => {
    try {
        // Ini berfungsi untuk memastikan bahwa data dari CreateConcert.js terlihat di AdminConcertApproval.jsx
        // Cek apakah ada data konser dari user
        const pendingConcertsStr = localStorage.getItem('pendingConcerts');

        if (!pendingConcertsStr || pendingConcertsStr === '[]') {
            console.log("No pending concerts found. Creating sample concert...");

            // Buat contoh konser
            const sampleConcert = {
                id: 'user-' + Date.now(),
                name: 'User Created Concert',
                venue: 'User Venue',
                date: '2025-08-15',
                description: 'This is a sample concert from a regular user.',
                creator: "9RkKuiJXJF2hzhZ46SaSNjR5CKNNAGUvFT6KMQs9coTh",
                createdAt: new Date().toISOString(),
                status: 'pending',
                sections: [
                    {
                        name: 'Backstage',
                        price: 3,
                        totalSeats: 20,
                        availableSeats: 20
                    },
                    {
                        name: 'VIP',
                        price: 1.5,
                        totalSeats: 100,
                        availableSeats: 100
                    },
                    {
                        name: 'Regular',
                        price: 0.5,
                        totalSeats: 300,
                        availableSeats: 300
                    }
                ]
            };

            // Simpan konser ke localStorage
            savePendingConcerts([sampleConcert]);
            console.log("Sample user concert created successfully");
            return true;
        }

        console.log("Existing concerts found, no need to create sample");
        return false;
    } catch (error) {
        console.error("Error importing user concerts:", error);
        return false;
    }
};  