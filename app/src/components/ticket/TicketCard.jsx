// src/components/ticket/TicketCard.jsx
import React from 'react';
import { formatDate } from '../../utils/formats';

const TicketCard = ({ ticket }) => {
    const {
        id,
        concertName,
        artist,
        venue,
        date,
        seatNumber,
        ticketType,
        price,
        imageUrl
    } = ticket;

    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-transform transform hover:-translate-y-1">
            <div className="relative">
                <img
                    src={imageUrl || 'https://via.placeholder.com/400x200'}
                    alt={concertName}
                    className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                <div className="absolute bottom-3 left-3">
                    <h3 className="text-xl font-bold text-white">{artist}</h3>
                </div>
            </div>

            <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <h2 className="text-lg font-semibold text-white">{concertName}</h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-600 text-white">
                        {ticketType}
                    </span>
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex items-start">
                        <svg className="h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-gray-300">{venue}</span>
                    </div>

                    <div className="flex items-start">
                        <svg className="h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-gray-300">{formatDate(date)}</span>
                    </div>

                    <div className="flex items-start">
                        <svg className="h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                        <span className="text-gray-300">Seat: {seatNumber}</span>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-700 flex justify-between items-center">
                    <span className="text-gray-300">{price} SOL</span>
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
                        View QR
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TicketCard;