import mongoose from 'mongoose';
import { mongoUri } from '../config.json';
export async function connectToDatabase() {
    try {
        const mongoEnv = process.env.MONGODB_URI;
        const connectionString = mongoUri || mongoEnv;
        if (!connectionString) {
            throw new Error('MongoDB URI is not defined');
        }
        await mongoose.connect(connectionString);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}