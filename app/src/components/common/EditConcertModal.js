import React, { useState, useEffect } from 'react';

const EditConcertModal = ({ isOpen, concert, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        venue: '',
        date: '',
        description: '',
        category: '',
        sections: []
    });

    // Update form when concert changes
    useEffect(() => {
        if (concert) {
            // Format date for datetime-local input
            let formattedDate = '';
            if (concert.date) {
                const date = new Date(concert.date);
                formattedDate = date.toISOString().slice(0, 16);
            }

            setFormData({
                name: concert.name || '',
                venue: concert.venue || '',
                date: formattedDate,
                description: concert.description || '',
                category: concert.category || '',
                sections: concert.sections || []
            });
        }
    }, [concert]);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    // Handle section input changes
    const handleSectionChange = (index, field, value) => {
        const updatedSections = [...formData.sections];
        updatedSections[index] = {
            ...updatedSections[index],
            [field]: field === 'name' ? value : Number(value)
        };

        setFormData({
            ...formData,
            sections: updatedSections
        });
    };

    // Submit form
    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate form
        if (!formData.name || !formData.venue || !formData.date) {
            alert('Please fill in all required fields');
            return;
        }

        // Create updated concert object
        const updatedConcert = {
            ...concert,
            name: formData.name,
            venue: formData.venue,
            date: new Date(formData.date).toISOString(),
            description: formData.description,
            category: formData.category,
            sections: formData.sections
        };

        onSave(updatedConcert);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Edit Concert</h2>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Left column */}
                        <div>
                            <div className="mb-4">
                                <label className="block text-white text-sm font-bold mb-2" htmlFor="name">
                                    Concert Name *
                                </label>
                                <input
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    id="name"
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-white text-sm font-bold mb-2" htmlFor="venue">
                                    Venue *
                                </label>
                                <input
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    id="venue"
                                    type="text"
                                    name="venue"
                                    value={formData.venue}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-white text-sm font-bold mb-2" htmlFor="date">
                                    Event Date and Time *
                                </label>
                                <input
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    id="date"
                                    type="datetime-local"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Right column */}
                        <div>
                            <div className="mb-4">
                                <label className="block text-white text-sm font-bold mb-2" htmlFor="category">
                                    Category
                                </label>
                                <select
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    id="category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Select Category</option>
                                    <option value="rock">Rock</option>
                                    <option value="pop">Pop</option>
                                    <option value="jazz">Jazz</option>
                                    <option value="classical">Classical</option>
                                    <option value="electronic">Electronic</option>
                                    <option value="hiphop">Hip Hop</option>
                                    <option value="country">Country</option>
                                    <option value="festival">Festival</option>
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-white text-sm font-bold mb-2" htmlFor="description">
                                    Description
                                </label>
                                <textarea
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    id="description"
                                    name="description"
                                    rows="5"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Ticket Sections */}
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-white mb-4">Ticket Sections</h3>

                        {formData.sections.map((section, index) => (
                            <div key={index} className="p-4 bg-gray-700 rounded-lg mb-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-white text-sm font-bold mb-2">
                                            Section Name
                                        </label>
                                        <input
                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            type="text"
                                            value={section.name}
                                            onChange={(e) => handleSectionChange(index, 'name', e.target.value)}
                                            disabled={section.ticketsSold > 0}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-white text-sm font-bold mb-2">
                                            Price (SOL)
                                        </label>
                                        <input
                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={section.price}
                                            onChange={(e) => handleSectionChange(index, 'price', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-white text-sm font-bold mb-2">
                                            Total Seats
                                        </label>
                                        <input
                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            type="number"
                                            min={section.totalSeats - section.availableSeats}
                                            value={section.totalSeats}
                                            onChange={(e) => handleSectionChange(index, 'totalSeats', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
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