/**
 * Server Entry Point
 * Starts the Express server and connects to MongoDB
 */
import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import connectDB from './config/db';

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);
    process.exit(1);
});

// Connect to database
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 BivanHandicraft API Server                          ║
║                                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║   Port: ${PORT}                                            ║
║   URL: http://0.0.0.0:${PORT}                            ║
║   API: http://192.168.1.3:${PORT}/api/v1                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: any) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        console.log('💥 Process terminated!');
    });
});
