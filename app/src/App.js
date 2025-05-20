// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import Context Provider
import { ConcertProvider } from './context/ConcertContext';

// Import common components
import NavBar from './components/common/NavBar';
import Footer from './components/common/Footer';

// Import page components
import HomePage from './pages/HomePage';
import ExplorePage from './components/ExplorePage';
import ConcertList from './components/ConcertList';
import CreateConcert from './components/CreateConcert';
import MintTicket from './components/MintTicket';
import VerifyTicket from './components/VerifyTicket';
import MyTickets from './components/MyTickets';
import PendingConcerts from './components/PendingConcerts';
import ConcertDetail from './pages/ConcertDetail'; // Import halaman detail konser
import TicketDetail from './components/TicketDetail';
// Import admin components
import AdminConcertApproval from './components/admin/AdminConcertApproval';
import AdminApprovedConcerts from './components/admin/AdminApprovedConcerts';
import AdminRejectedConcerts from './components/admin/AdminRejectedConcerts';
import AdminSettings from './components/admin/AdminSettings';
import AdminLayout from './components/admin/AdminLayout';
import TicketMarketplace from './components/TicketMarketplace';
// Pastikan AdminLoginModal diimpor jika diperlukan
import AdminLoginModal from './components/admin/AdminLoginModal';

// Import CSS
import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';

function App() {
  // Solana network setup
  const network = WalletAdapterNetwork.Testnet;
  const endpoint = clusterApiUrl(network);
  const wallets = [new PhantomWalletAdapter()];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {/* Tambahkan ConcertProvider di sini */}
          <ConcertProvider>
            <Router>
              <div className="app-container min-h-screen flex flex-col bg-gray-900">
                <NavBar />
                <main className="flex-grow pt-16">
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/collections" element={<ConcertList />} />
                    <Route path="/explore" element={<ExplorePage />} />
                    <Route path="/create-concert" element={<CreateConcert />} />
                    <Route path="/mint-ticket" element={<MintTicket />} />
                    <Route path="/mint-ticket/:concertId" element={<MintTicket />} />
                    <Route path="/verify-ticket" element={<VerifyTicket />} />
                    <Route path="/my-tickets" element={<MyTickets />} />
                    <Route path="/ticket/:ticketId" element={<TicketDetail />} />
                    <Route path="/pending-concerts" element={<PendingConcerts />} />
                    <Route path="/concert/:concertId" element={<ConcertDetail />} /> {/* Tambahkan route untuk ConcertDetail */}
                    <Route path="/marketplace" element={<TicketMarketplace />} />

                    {/* Admin Routes - semua melalui AdminLayout */}
                    <Route path="admin" element={<AdminLayout />}>
                      <Route index element={<AdminConcertApproval />} />
                      <Route path="approval" element={<AdminConcertApproval />} />
                      <Route path="approved" element={<AdminApprovedConcerts />} />
                      <Route path="rejected" element={<AdminRejectedConcerts />} />
                      <Route path="settings" element={<AdminSettings />} />
                    </Route>

                    {/* Fallback route untuk URL yang tidak valid */}
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </Router>
          </ConcertProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;