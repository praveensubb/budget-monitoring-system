import mongoose from 'mongoose';
import { env } from './environment';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.mongoUri);
    logger.info(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error) {
    logger.error('MongoDB connection failed', error);
    process.exit(1);
  }
}
