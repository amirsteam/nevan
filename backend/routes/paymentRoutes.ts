/**
 * Payment Routes
 * Routes for payment operations
 */
import express from 'express';
import * as paymentController from '../controllers/paymentController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public routes (for gateway callbacks)
router.get('/methods', paymentController.getPaymentMethods);
router.get('/esewa/success', paymentController.esewaSuccess);
router.get('/esewa/failure', paymentController.esewaFailure);
router.get('/khalti/callback', paymentController.khaltiCallback);

// Protected routes
router.post('/initiate', protect, paymentController.initiatePayment);
router.post('/verify', protect, paymentController.verifyPayment);

export default router;
