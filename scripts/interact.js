const anchor = require('@project-serum/anchor');
const { PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Load IDL dari file
const idlPath = path.resolve('./target/idl/concert_nft_tickets.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

// Program ID dari program yang sudah di-deploy
const PROGRAM_ID = new PublicKey('3oKZi6zmYzbRDuq8nAAGeL9m9TcwFPAiR2cfz4vjANum');

async function main() {
    // Konfigurasi provider untuk testnet
    const connection = new anchor.web3.Connection('https://api.testnet.solana.com', 'confirmed');

    // Load wallet dari file
    const walletKeyfile = JSON.parse(fs.readFileSync(
        path.resolve(process.env.HOME, '.config/solana/id.json')
    ));
    const walletKeypair = Keypair.fromSecretKey(new Uint8Array(walletKeyfile));

    const wallet = new anchor.Wallet(walletKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });

    // Load program
    const program = new anchor.Program(idl, PROGRAM_ID, provider);
    console.log("Program loaded successfully");

    // Generate keypair untuk akun konser
    const concertKeypair = anchor.web3.Keypair.generate();
    console.log('Concert account pubkey:', concertKeypair.publicKey.toString());

    try {
        // Inisialisasi konser
        console.log('Initializing concert...');
        await program.methods
            .initializeConcert(
                'My Concert',       // Nama konser
                'Venue Name',       // Lokasi
                '2025-10-15',       // Tanggal
                1000               // Total tiket
            )
            .accounts({
                authority: wallet.publicKey,
                concert: concertKeypair.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([concertKeypair])
            .rpc();

        console.log('Concert initialized successfully!');

        // Fetch dan tampilkan data konser
        const concertData = await program.account.concert.fetch(concertKeypair.publicKey);
        console.log('Concert details:', {
            authority: concertData.authority.toString(),
            name: concertData.name,
            venue: concertData.venue,
            date: concertData.date,
            totalTickets: concertData.totalTickets,
            ticketsSold: concertData.ticketsSold
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

main().then(
    () => process.exit(0),
    (err) => {
        console.error(err);
        process.exit(1);
    }
);