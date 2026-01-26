/**
 * Routes Index
 * Aggregates all routes and mounts them on the app
 */
import express, { Request, Response } from 'express';
import authRoutes from './authRoutes';
import productRoutes from './productRoutes';
import categoryRoutes from './categoryRoutes';
import cartRoutes from './cartRoutes';
import orderRoutes from './orderRoutes';
import paymentRoutes from './paymentRoutes';
import adminRoutes from './adminRoutes';

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'success',
        message: 'API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});

export default router;
