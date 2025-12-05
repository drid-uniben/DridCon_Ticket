import mongoose from 'mongoose';
import logger from '../utils/logger';

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

const connectDB = async (): Promise<void> => {
  let retries = MAX_RETRIES;

  while (retries > 0) {
    try {
      await mongoose.connect(process.env.MONGODB_URI as string, {
        serverSelectionTimeoutMS: 5000,
      });
      logger.info(`MongoDB Connected: ${mongoose.connection.host}`);
      return;
    } catch (error: any) {
      logger.error(`MongoDB connection failed. Retries left: ${retries - 1}. Error: ${error.message}`);
      retries -= 1;
      if (retries === 0) {
        logger.error('All retries exhausted. Exiting...');
        process.exit(1);
      }
      logger.info(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }
};

export default connectDB;