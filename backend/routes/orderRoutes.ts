/**
 * Order Routes
 * Protected routes for order management
 */
import express from 'express';
import * as orderController from '../controllers/orderController';
import { protect } from '../middleware/auth';
import { createOrderValidator, paginationValidator, mongoIdValidator } from '../middleware/validate';

const router = express.Router();

// All order routes require authentication
router.use(protect);

router.post('/', createOrderValidator, orderController.createOrder);
router.get('/', paginationValidator, orderController.getMyOrders);
router.get('/:id', mongoIdValidator('id'), orderController.getOrder);
router.post('/:id/cancel', mongoIdValidator('id'), orderController.cancelOrder);

export default router;
