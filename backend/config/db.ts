/**
 * Database Configuration
 * Handles MongoDB connection using Mongoose
 */
import mongoose from 'mongoose';
import ChatRoom from '../models/ChatRoom';

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // ChatRoom's unique "one open room" index changed when guest chat was added;
    // syncIndexes drops the old definition and builds the current ones.
    try {
      await ChatRoom.syncIndexes();
    } catch (indexError) {
      console.error('⚠️ Could not sync chat room indexes:', (indexError as Error).message);
    }

    // Handle connection events
    mongoose.connection.on('error', (err: Error) => {
      console.error(`❌ MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    const err = error as Error;
    console.error(`❌ MongoDB Connection Error: ${err.message}`);
    process.exit(1);
  }
};

export default connectDB;
