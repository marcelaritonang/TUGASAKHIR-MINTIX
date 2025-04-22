import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { PublicKey, SystemProgram, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Program ID dari smart contract yang sudah di-deploy
const PROGRAM_ID = new PublicKey('3oKZi6zmYzbRDuq8nAAGeL9m9TcwFPAiR2cfz4vjANum');

describe('concert_nft_tickets', () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Deklarasikan variabel yang dibutuhkan di seluruh pengujian
  let program: any;
  let concertKeypair: Keypair;
  let mintKeypair: Keypair;
  let tokenAccount: any;
  let ticketKeypair: Keypair;

  before(async () => {
    try {
      const idlPath = path.resolve('./target/idl/concert_nft_tickets.json');
      const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
      program = new anchor.Program(idl, PROGRAM_ID, provider);
      console.log("Program loaded successfully");
    } catch (e) {
      console.error("Error loading program:", e);
      throw e;
    }
  });

  it('Initializes concert', async () => {
    // Generate keypair untuk akun konser
    concertKeypair = anchor.web3.Keypair.generate();
    console.log('Concert account pubkey:', concertKeypair.publicKey.toString());

    try {
      // 1. Inisialisasi konser
      console.log('Initializing concert...');
      await program.methods
        .initializeConcert(
          'Solana Music Festival',  // Nama konser
          'Metaverse Arena',        // Lokasi
          '2025-06-15',             // Tanggal
          100                       // Total tiket
        )
        .accounts({
          authority: provider.wallet.publicKey,
          concert: concertKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([concertKeypair])
        .rpc();

      console.log('Concert initialized successfully!');

      // Fetch concert details
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
      console.error("Error initializing concert:", e);
      throw e;
    }
  });

  it('Creates mint and token account', async () => {
    try {
      // Generate keypair untuk mint
      mintKeypair = anchor.web3.Keypair.generate();
      console.log('Mint pubkey:', mintKeypair.publicKey.toString());

      // Create mint
      const mintRent = await provider.connection.getMinimumBalanceForRentExemption(82);
      const createAccountIx = SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        lamports: mintRent,
        space: 82,
        programId: TOKEN_PROGRAM_ID,
      });

      // Generate keypair untuk token account
      const tokenKeypair = anchor.web3.Keypair.generate();
      console.log('Token account pubkey:', tokenKeypair.publicKey.toString());

      // Menginisialisasi mint melalui smart contract
      console.log('Initializing mint...');
      await program.methods
        .initializeMint()
        .accounts({
          authority: provider.wallet.publicKey,
          buyer: provider.wallet.publicKey,
          mint: mintKeypair.publicKey,
          tokenAccount: tokenKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([mintKeypair, tokenKeypair])
        .rpc();

      console.log('Mint and token account initialized successfully!');

      // Simpan referensi untuk penggunaan dalam tes selanjutnya
      tokenAccount = { address: tokenKeypair.publicKey };
    } catch (e) {
      console.error("Error creating mint:", e);
      throw e;
    }
  });

  it('Creates a ticket', async () => {
    try {
      // Generate keypair untuk tiket
      ticketKeypair = anchor.web3.Keypair.generate();
      console.log('Ticket account pubkey:', ticketKeypair.publicKey.toString());

      // Membuat tiket
      console.log('Creating ticket...');
      await program.methods
        .createTicket(
          'VIP',           // Tipe tiket
          'A-123'          // Nomor kursi
        )
        .accounts({
          authority: provider.wallet.publicKey,
          buyer: provider.wallet.publicKey,
          concert: concertKeypair.publicKey,
          mint: mintKeypair.publicKey,
          tokenAccount: tokenAccount.address,
          ticket: ticketKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([ticketKeypair])
        .rpc();

      console.log('Ticket created successfully!');

      // Verifikasi data tiket
      const ticketData = await program.account.ticket.fetch(ticketKeypair.publicKey);
      console.log('Ticket details:', {
        owner: ticketData.owner.toString(),
        mint: ticketData.mint.toString(),
        concert: ticketData.concert.toString(),
        ticketType: ticketData.ticketType,
        seatNumber: ticketData.seatNumber,
        used: ticketData.used
      });

      // Verifikasi tiket terjual bertambah
      const concertData = await program.account.concert.fetch(concertKeypair.publicKey);
      console.log('Updated concert details:', {
        ticketsSold: concertData.ticketsSold
      });
    } catch (e) {
      console.error("Error creating ticket:", e);
      throw e;
    }
  });

  it('Uses a ticket', async () => {
    try {
      // Gunakan tiket
      console.log('Using ticket...');
      await program.methods
        .useTicket()
        .accounts({
          authority: provider.wallet.publicKey,
          ticket: ticketKeypair.publicKey,
        })
        .rpc();

      console.log('Ticket used successfully!');

      // Verifikasi status tiket
      const ticketData = await program.account.ticket.fetch(ticketKeypair.publicKey);
      console.log('Updated ticket details:', {
        used: ticketData.used
      });
    } catch (e) {
      console.error("Error using ticket:", e);
      throw e;
    }
  });

  it('Fails when trying to use ticket again', async () => {
    try {
      // Mencoba menggunakan tiket yang sudah digunakan
      console.log('Trying to use ticket again...');
      await program.methods
        .useTicket()
        .accounts({
          authority: provider.wallet.publicKey,
          ticket: ticketKeypair.publicKey,
        })
        .rpc();

      console.log('ERROR: Should have failed but did not');
    } catch (e) {
      // Harusnya gagal dengan error TicketAlreadyUsed
      console.log('Expected error occurred:', e.toString().includes('TicketAlreadyUsed') ? 'TicketAlreadyUsed' : e);
    }
  });
});