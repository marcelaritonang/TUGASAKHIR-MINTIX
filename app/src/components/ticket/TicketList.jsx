// src/components/ticket/TicketList.jsx
import React from 'react';
import TicketCard from './TicketCard';

const TicketList = ({ tickets }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} />
            ))}
        </div>
    );
};

export default TicketList;