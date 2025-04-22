import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { getProgram } from '../utils/anchor';

const VerifyTicket = () => {
    const [ticketAddress, setTicketAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [ticketInfo, setTicketInfo] = useState(null);
    const [error, setError] = useState('');
    const wallet = useWallet();

    const handleFetchTicket = async () => {
        if (!wallet.connected || !ticketAddress) return;

        setLoading(true);
        setError('');
        setTicketInfo(null);

        try {
            const program = getProgram(wallet);

            // Try to fetch the ticket info
            const ticketData = await program.account.ticket.fetch(new PublicKey(ticketAddress));
            setTicketInfo(ticketData);

            // Fetch concert data to show concert name
            try {
                const concertData = await program.account.concert.fetch(ticketData.concert);
                setTicketInfo(prev => ({
                    ...prev,
                    concertName: concertData.name,
                    concertVenue: concertData.venue,
                    concertDate: concertData.date
                }));
            } catch (e) {
                console.error("Error fetching concert data:", e);
            }

        } catch (error) {
            console.error("Error fetching ticket:", error);
            setError("Invalid ticket address or ticket does not exist.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyTicket = async (e) => {
        e.preventDefault();
        if (!wallet.connected || !ticketAddress || !ticketInfo) return;

        // If ticket is already used, show message
        if (ticketInfo.used) {
            alert("This ticket has already been used!");
            return;
        }

        setLoading(true);
        try {
            const program = getProgram(wallet);

            // Use the ticket
            const tx = await program.methods
                .useTicket()
                .accounts({
                    authority: wallet.publicKey,
                    ticket: new PublicKey(ticketAddress),
                })
                .rpc();

            console.log("Transaction signature:", tx);
            alert(`Ticket verified successfully!`);

            // Update the ticket info to show it's used
            setTicketInfo(prev => ({ ...prev, used: true }));
        } catch (error) {
            console.error("Error verifying ticket:", error);
            alert(`Error verifying ticket: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="verify-ticket">
            <h2>Verify Ticket</h2>
            {!wallet.connected ? (
                <div>
                    <p>Connect your wallet to verify a ticket</p>
                    <WalletMultiButton />
                </div>
            ) : (
                <>
                    <div className="ticket-search">
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <input
                                type="text"
                                value={ticketAddress}
                                onChange={(e) => setTicketAddress(e.target.value)}
                                placeholder="Enter ticket address"
                                style={{ flex: 1 }}
                            />
                            <button
                                onClick={handleFetchTicket}
                                disabled={loading || !ticketAddress}
                                style={{ flex: 0 }}
                            >
                                {loading ? 'Loading...' : 'Fetch Ticket'}
                            </button>
                        </div>

                        {error && <p style={{ color: 'red' }}>{error}</p>}
                    </div>

                    {ticketInfo && (
                        <div className="ticket-info">
                            <h3>Ticket Information</h3>
                            {ticketInfo.concertName && (
                                <>
                                    <p><strong>Concert:</strong> {ticketInfo.concertName}</p>
                                    <p><strong>Venue:</strong> {ticketInfo.concertVenue}</p>
                                    <p><strong>Date:</strong> {ticketInfo.concertDate}</p>
                                </>
                            )}
                            <p><strong>Ticket Type:</strong> {ticketInfo.ticketType}</p>
                            <p><strong>Seat:</strong> {ticketInfo.seatNumber}</p>
                            <p><strong>Owner:</strong> {ticketInfo.owner.toString()}</p>
                            <p><strong>Status:</strong> <span style={{
                                color: ticketInfo.used ? 'red' : 'green',
                                fontWeight: 'bold'
                            }}>
                                {ticketInfo.used ? 'Used' : 'Valid'}
                            </span></p>

                            {!ticketInfo.used && (
                                <button
                                    onClick={handleVerifyTicket}
                                    disabled={loading}
                                    style={{ marginTop: '15px' }}
                                >
                                    {loading ? 'Verifying...' : 'Verify & Use Ticket'}
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default VerifyTicket;