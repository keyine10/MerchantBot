import mongoose from 'mongoose';

const mongoUri = process.env.MONGO_URI;

export async function connectToDatabase() {
    try {
        const connectionString = mongoUri;
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