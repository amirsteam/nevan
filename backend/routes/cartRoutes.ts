/**
 * Cart Routes
 * Protected routes for cart operations
 */
import express from 'express';
import * as cartController from '../controllers/cartController';
import { protect } from '../middleware/auth';
import { addToCartValidator, updateCartItemValidator } from '../middleware/validate';

const router = express.Router();

// All cart routes require authentication
router.use(protect);

router.get('/', cartController.getCart);
router.post('/items', addToCartValidator, cartController.addToCart);
router.put('/items/:itemId', updateCartItemValidator, cartController.updateCartItem);
router.delete('/items/:itemId', cartController.removeFromCart);
router.delete('/', cartController.clearCart);

export default router;
