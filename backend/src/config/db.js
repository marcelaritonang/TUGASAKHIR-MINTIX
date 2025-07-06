const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        // Simple connection string priority
        const mongoURI = process.env.DATABASE_URL ||
            process.env.MONGO_URI ||
            'mongodb://localhost:27017/concert_nft_tickets';

        console.log(`Connecting to MongoDB...`);

        // SIMPLE connection options only
        const conn = await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;

    } catch (error) {
        console.error(`MongoDB Error: ${error.message}`);

        // Simple error handling - no retry loops
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
        return null;
    }
};

module.exports = connectDB;