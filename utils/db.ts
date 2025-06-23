import mongoose from 'mongoose';
import logger from './logger';

const mongoUri = process.env.MONGO_URI;
const mongoDatabase = process.env.MONGO_DATABASE || 'test';

export async function connectToDatabase() {
    try {
        const connectionString = mongoUri;
        if (!connectionString) {
            throw new Error('MongoDB URI is not defined');
        }
        await mongoose.connect(connectionString, {
            dbName: mongoDatabase
        });
        logger.info(`Connected to MongoDB database: ${mongoDatabase}`);
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        process.exit(1);
    }
}