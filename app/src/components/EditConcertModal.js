// src/components/EditConcertModal.js
import React, { useState, useEffect } from 'react';

const EditConcertModal = ({ isOpen, concert, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [venue, setVenue] = useState('');
    const [date, setDate] = useState('');
    const [totalTickets, setTotalTickets] = useState(0);
    const [category, setCategory] = useState('uncategorized');

    // Initialize form when modal opens with concert data
    useEffect(() => {
        if (concert) {
            setName(concert.name || '');
            setVenue(concert.venue || '');
            setDate(concert.date || '');
            setTotalTickets(concert.total || 0);
            setCategory(concert.category || 'uncategorized');
        }
    }, [concert]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        // Prepare updated concert data
        const updatedConcert = {
            ...concert,
            name,
            venue,
            date,
            total: parseInt(totalTickets),
            available: parseInt(totalTickets) - (concert.total - concert.available),
            category
        };

        onSave(updatedConcert);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-purple-700 rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Edit Concert</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-300 mb-2">Concert Name</label>
                        <input
                            type="text"
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-300 mb-2">Venue</label>
                        <input
                            type="text"
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={venue}
                            onChange={(e) => setVenue(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-300 mb-2">Date</label>
                        <input
                            type="text"
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            placeholder="e.g., Apr 25, 2025"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-300 mb-2">Total Tickets</label>
                        <input
                            type="number"
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={totalTickets}
                            onChange={(e) => setTotalTickets(e.target.value)}
                            min="1"
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-300 mb-2">Category</label>
                        <select
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option value="uncategorized">Uncategorized</option>
                            <option value="festival">Festival</option>
                            <option value="rock">Rock</option>
                            <option value="jazz">Jazz</option>
                            <option value="classical">Classical</option>
                            <option value="hiphop">Hip Hop</option>
                            <option value="electronic">Electronic</option>
                            <option value="pop">Pop</option>
                            <option value="country">Country</option>
                        </select>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-2 px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditConcertModal;