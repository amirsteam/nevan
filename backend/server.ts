/**
 * Server Entry Point
 * Starts the Express server with Socket.IO and connects to MongoDB
 */
import dotenv from 'dotenv';
dotenv.config();

import { initMonitoring, captureError, flushMonitoring } from './utils/monitoring';
initMonitoring();

import http from 'http';
import os from 'os';
import app from './app';
import connectDB from './config/db';
import { initializeSocket } from './config/socket';
import { expireUnpaidOrders } from './services/orderService';

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);
    captureError(err);
    flushMonitoring().finally(() => process.exit(1));
});

// Connect to database
connectDB();

// Create HTTP server (required for Socket.IO)
const httpServer = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

// Start server
const PORT = process.env.PORT || 5000;
// LAN addresses, so real mobile devices on the same network know where to connect
const getLanAddresses = (): string[] =>
    Object.values(os.networkInterfaces())
        .flat()
        .filter((iface): iface is os.NetworkInterfaceInfo => !!iface && iface.family === 'IPv4' && !iface.internal)
        .map((iface) => iface.address);

httpServer.listen(PORT, () => {
    const lanUrls = getLanAddresses().map((ip) => `http://${ip}:${PORT}/api/v1`);
    console.log(`
🚀 BivanHandicraft API Server
   Environment: ${process.env.NODE_ENV || 'development'}
   Local:       http://localhost:${PORT}/api/v1
${lanUrls.map((url) => `   Network:     ${url}`).join("\n")}
   Socket.IO:   /chat namespace enabled
`);
});

// Cancel eSewa/Khalti orders left unpaid past the payment window so their stock
// returns to the shop (abandoned or failed online checkouts)
const PAYMENT_WINDOW_MINUTES = parseInt(process.env.ORDER_PAYMENT_TIMEOUT_MINUTES || '30', 10);
const expireAbandonedOrders = () =>
    expireUnpaidOrders(PAYMENT_WINDOW_MINUTES)
        .then((count) => {
            if (count > 0) console.log(`🧹 Cancelled ${count} unpaid online order(s)`);
        })
        .catch((err) => {
            console.error('Failed to expire unpaid orders:', err);
            captureError(err);
        });
setInterval(expireAbandonedOrders, 5 * 60 * 1000).unref();
setTimeout(expireAbandonedOrders, 30 * 1000).unref();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: any) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    captureError(err);
    httpServer.close(() => {
        flushMonitoring().finally(() => process.exit(1));
    });
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    httpServer.close(() => {
        console.log('💥 Process terminated!');
    });
});
