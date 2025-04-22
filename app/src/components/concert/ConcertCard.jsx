// src/components/concert/ConcertCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatSOL } from '../../utils/formats';

const ConcertCard = ({ concert }) => {
    const {
        id,
        name,
        artist,
        date,
        venue,
        ticketPrice,
        ticketsAvailable,
        ticketsSold,
        imageUrl,
    } = concert;

    // Menghitung persentase tiket yang terjual
    const soldPercentage = (ticketsSold / (ticketsAvailable + ticketsSold)) * 100;

    return (
        <Link
            to={`/concert/${id}`}
            className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
            {/* Image Container with Gradient Overlay */}
            <div className="relative h-48 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10" />
                <img
                    src={imageUrl || `/api/placeholder/400/320`}
                    alt={name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* Badges */}
                <div className="absolute top-3 left-3 z-20">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-600 text-white">
                        NFT Ticket
                    </span>
                </div>

                {/* Artist name overlay */}
                <div className="absolute bottom-3 left-3 z-20">
                    <h3 className="text-xl font-bold text-white">{artist}</h3>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4">
                <div className="flex justify-between items-start">
                    <h2 className="text-lg font-bold text-gray-800 group-hover:text-purple-600 transition-colors duration-200">
                        {name}
                    </h2>
                    <div className="flex items-center space-x-1 text-amber-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="font-medium text-sm">Hot</span>
                    </div>
                </div>

                {/* Venue and Date */}
                <div className="mt-2 space-y-1">
                    <div className="flex items-center text-gray-600 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {venue}
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(date)}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{ticketsSold} sold</span>
                        <span>{ticketsAvailable} available</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-purple-600 to-pink-500 h-2 rounded-full"
                            style={{ width: `${soldPercentage}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <div>
                    <p className="text-xs text-gray-500">Price</p>
                    <p className="text-lg font-bold text-gray-800">{formatSOL(ticketPrice)} SOL</p>
                </div>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-full transition-colors duration-200">
                    Buy Ticket
                </button>
            </div>
        </Link>
    );
};

export default ConcertCard;