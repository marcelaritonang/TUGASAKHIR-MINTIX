//ini merupakan file formats.js yang berisi fungsi untuk menangani format tanggal dan sol
// src/utils/formats.js
export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

export const formatSOL = (amount) => {
    return parseFloat(amount).toFixed(2);
};