// src/utils/ticketValidator.js

/**
 * Validasi tiket berdasarkan beberapa kondisi
 * @param {Object} ticket - Data tiket
 * @param {Object} analytics - Data analitik blockchain (opsional)
 * @param {Object} concertDetail - Detail konser (opsional)
 * @returns {boolean} - true jika tiket valid, false jika tidak
 */
export const isTicketValid = (ticket, analytics = null, concertDetail = null) => {
    // Kondisi 1: Jika tiket memiliki tanda transaksi blockchain, anggap valid meskipun konser tidak ada
    if (ticket.transactionSignature || ticket.mintSignature) {
        return true;
    }

    // Kondisi 2: Jika tiket ditandai memiliki konser yang hilang tapi memiliki transaksi
    if (ticket.hasMissingConcert && (ticket.transactionSignature || ticket.mintSignature)) {
        return true;
    }

    // Kondisi 3: Jika koncertId ada sebagai objek (berhasil di-populated), berarti konser masih ada
    if (ticket.concertId && typeof ticket.concertId === 'object') {
        return true;
    }

    // Kondisi 4: Jika analytics melaporkan tiket valid dari blockchain
    if (analytics && analytics.isValid) {
        return true;
    }

    // Jika semua kondisi di atas tidak terpenuhi, tiket tidak valid
    return false;
};

/**
 * Mendapatkan status tiket untuk tampilan
 * @param {Object} ticket - Objek tiket
 * @param {Object} analytics - Analitik blockchain (opsional)
 * @param {Object} concertDetail - Detail konser (opsional)
 * @returns {String} - Status tiket (valid, invalid, used)
 */
export const getTicketStatus = (ticket, analytics = null, concertDetail = null) => {
    if (ticket.status === 'used') {
        return 'used';
    }

    return isTicketValid(ticket, analytics, concertDetail) ? 'valid' : 'invalid';
};

export default {
    isTicketValid,
    getTicketStatus
};