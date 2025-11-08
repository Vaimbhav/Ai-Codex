import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-code-assistant';

export const connectDB = async (): Promise<void> => {
    try {
        // Debug: Log the MongoDB URI being used
        logger.info(`Attempting to connect to MongoDB: ${MONGODB_URI.substring(0, 20)}...`);

        // Different options for local vs Atlas
        const isAtlas = MONGODB_URI.includes('mongodb+srv://');
        logger.info(`Connection type: ${isAtlas ? 'Atlas (mongodb+srv)' : 'Local'}`);

        const options: any = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            // Additional options for MongoDB Atlas
            ...(isAtlas && {
                retryWrites: true,
                w: 'majority',
                readPreference: 'primary' as const,
                ssl: true,
            }),
        };

        await mongoose.connect(MONGODB_URI, options);

        logger.info(`MongoDB connected successfully (${isAtlas ? 'Atlas' : 'Local'})`);
        logger.info(`Database: ${mongoose.connection.name}`);

        // Handle connection events
        mongoose.connection.on('error', (error) => {
            logger.error('MongoDB connection error:', error);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

    } catch (error) {
        logger.error('MongoDB connection failed:', error);
        throw error;
    }
};

export const disconnectDB = async (): Promise<void> => {
    try {
        await mongoose.connection.close();
        logger.info('MongoDB disconnected');
    } catch (error) {
        logger.error('Error disconnecting from MongoDB:', error);
        throw error;
    }
};
