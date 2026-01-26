/**
 * Product Routes
 * Public routes for product browsing
 */
import express from 'express';
import * as productController from '../controllers/productController';
import { paginationValidator, mongoIdValidator } from '../middleware/validate';

const router = express.Router();

// Public routes
router.get('/', paginationValidator, productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/:slug', productController.getProduct);

export default router;
