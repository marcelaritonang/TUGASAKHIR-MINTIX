// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import NavBar component
import NavBar from './components/common/NavBar';
import Footer from './components/common/Footer';

// Import page components
import HomePage from './pages/HomePage';
import ConcertList from './components/ConcertList';
import CreateConcert from './components/CreateConcert';
import MintTicket from './components/MintTicket';
import VerifyTicket from './components/VerifyTicket';
import MyTickets from './components/MyTickets';

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
          <Router>
            <div className="app-container min-h-screen flex flex-col bg-gray-900">
              <NavBar />
              <main className="flex-grow">
                <Routes>
                  {/* HomePage harus menampilkan komponen home Anda */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/collections" element={<ConcertList />} />
                  <Route path="/explore" element={<ConcertList />} />
                  <Route path="/create-concert" element={<CreateConcert />} />
                  <Route path="/mint-ticket" element={<MintTicket />} />
                  <Route path="/verify-ticket" element={<VerifyTicket />} />
                  <Route path="/my-tickets" element={<MyTickets />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;