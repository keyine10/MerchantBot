import mongoose from 'mongoose';
import logger from './logger';

const mongoUri = process.env.MONGO_URI;

export async function connectToDatabase() {
    try {
        const connectionString = mongoUri;
        if (!connectionString) {
            throw new Error('MongoDB URI is not defined');
        }
        await mongoose.connect(connectionString);
        logger.log('Connected to MongoDB');
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        process.exit(1);
    }
}