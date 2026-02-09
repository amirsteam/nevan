/**
 * Product Routes
 * Public routes for product browsing
 */
import express from 'express';
import * as productController from '../controllers/productController';
import { paginationValidator, mongoIdValidator } from '../middleware/validate';
import reviewRoutes from './reviewRoutes';

const router = express.Router();

// Nested review routes: /api/v1/products/:productId/reviews
router.use('/:productId/reviews', reviewRoutes);

// Public routes
router.get('/', paginationValidator, productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/:slug', productController.getProduct);

export default router;
