/**
 * Payment Controller
 * Handles HTTP requests for payments
 */
import { Request, Response } from 'express';
import { PaymentService } from '../services/payment';
import asyncHandler from '../utils/asyncHandler';

/**
 * @desc    Get available payment methods
 * @route   GET /api/v1/payments/methods
 * @access  Public
 */
const getPaymentMethods = asyncHandler(async (req: Request, res: Response) => {
    const methods = PaymentService.getAvailableMethods();

    res.status(200).json({
        status: 'success',
        data: { methods },
    });
});

/**
 * @desc    Initiate payment for an order
 * @route   POST /api/v1/payments/initiate
 * @access  Private
 */
const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
    const { orderId, gateway } = req.body;
    if (req.user) {
        const result = await PaymentService.initiatePayment(orderId, gateway, {
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone,
        });
    
        res.status(200).json({
            status: 'success',
            data: result,
        });
    }
});

/**
 * @desc    eSewa success callback
 * @route   GET /api/v1/payments/esewa/success
 * @access  Public
 */
const esewaSuccess = asyncHandler(async (req: Request, res: Response) => {
    const result = await PaymentService.handleCallback('esewa', req.query);

    if (result.success) {
        // Redirect to frontend success page
        res.redirect(`${process.env.FRONTEND_URL}/order-success?orderId=${result.orderId}`);
    } else {
        res.redirect(`${process.env.FRONTEND_URL}/order-failed?orderId=${result.orderId}&message=${encodeURIComponent(result.message)}`);
    }
});

/**
 * @desc    eSewa failure callback
 * @route   GET /api/v1/payments/esewa/failure
 * @access  Public
 */
const esewaFailure = asyncHandler(async (req: Request, res: Response) => {
    // Redirect to frontend failure page
    res.redirect(`${process.env.FRONTEND_URL}/order-failed?gateway=esewa&message=Payment%20cancelled`);
});

/**
 * @desc    Khalti callback
 * @route   GET /api/v1/payments/khalti/callback
 * @access  Public
 */
const khaltiCallback = asyncHandler(async (req: Request, res: Response) => {
    const result = await PaymentService.handleCallback('khalti', req.query);

    if (result.success) {
        res.redirect(`${process.env.FRONTEND_URL}/order-success?orderId=${result.orderId}`);
    } else {
        res.redirect(`${process.env.FRONTEND_URL}/order-failed?orderId=${result.orderId}&message=${encodeURIComponent(result.message)}`);
    }
});

/**
 * @desc    Verify payment manually
 * @route   POST /api/v1/payments/verify
 * @access  Private
 */
const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
    const { orderId, gateway, callbackData } = req.body;
    const result = await PaymentService.verifyPayment(orderId, gateway, callbackData);

    res.status(200).json({
        status: 'success',
        data: result,
    });
});

/**
 * @desc    Mark COD as collected (Admin)
 * @route   POST /api/v1/admin/payments/cod-collected
 * @access  Private/Admin
 */
const markCODCollected = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.body;
    if (req.user) {
        const result = await PaymentService.markCODCollected(orderId, (req.user as any)._id);
    
        res.status(200).json({
            status: 'success',
            message: result.message,
            data: result,
        });
    }
});

export {
    getPaymentMethods,
    initiatePayment,
    esewaSuccess,
    esewaFailure,
    khaltiCallback,
    verifyPayment,
    markCODCollected,
};
