/**
 * Payment Controller
 * Handles HTTP requests for payments
 */
import { Request, Response } from 'express';
import { PaymentService } from '../services/payment';
import asyncHandler from '../utils/asyncHandler';
import { getFrontendUrl } from '../utils/helpers';

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
        const result = await PaymentService.initiatePayment(
            orderId,
            gateway,
            {
                name: req.user.name,
                email: req.user.email,
                phone: req.user.phone,
            },
            (req.user as any)._id.toString(),
        );
    
        res.status(200).json({
            status: 'success',
            data: result,
        });
    }
});

// `payment`: "pending" (the gateway is still confirming) or "duplicate" (paid twice)
const orderSuccessUrl = (orderId: unknown, payment?: 'pending' | 'duplicate'): string => {
    const params = new URLSearchParams({ orderId: String(orderId ?? '') });
    if (payment) params.set('payment', payment);
    return `${getFrontendUrl()}/order-success?${params.toString()}`;
};

// `status`: "refund_required" when the money arrived but the order couldn't be kept
const orderFailedUrl = (orderId: unknown, message: string, gateway: string, status?: 'refund_required'): string => {
    const params = new URLSearchParams({ gateway, message });
    if (orderId) params.set('orderId', String(orderId));
    if (status) params.set('status', status);
    return `${getFrontendUrl()}/order-failed?${params.toString()}`;
};

/**
 * Gateway return URLs are opened by the shopper's browser, so they must always end
 * in a redirect to the storefront, never in a JSON error page.
 */
const handleGatewayReturn = (gateway: 'esewa' | 'khalti') =>
    asyncHandler(async (req: Request, res: Response) => {
        try {
            const result = await PaymentService.handleCallback(gateway, req.query);
            if (result.success) {
                res.redirect(orderSuccessUrl(result.orderId, result.status === 'duplicate' ? 'duplicate' : undefined));
            } else if (result.status === 'pending' && result.orderId) {
                // Not confirmed yet: never tell the shopper it failed (they'd pay again)
                res.redirect(orderSuccessUrl(result.orderId, 'pending'));
            } else {
                res.redirect(
                    orderFailedUrl(
                        result.orderId,
                        result.message || 'Payment was not completed',
                        gateway,
                        result.status === 'refund_required' ? 'refund_required' : undefined,
                    ),
                );
            }
        } catch (error) {
            console.error(`${gateway} callback error:`, error);
            res.redirect(orderFailedUrl(undefined, 'We could not confirm your payment. If you were charged, please contact us.', gateway));
        }
    });

/**
 * @desc    eSewa success callback
 * @route   GET /api/v1/payments/esewa/success
 * @access  Public
 */
const esewaSuccess = handleGatewayReturn('esewa');

/**
 * @desc    eSewa failure/cancel callback (order id in the path; older links have none)
 * @route   GET /api/v1/payments/esewa/failure/:orderId?
 * @access  Public
 */
const esewaFailure = asyncHandler(async (req: Request, res: Response) => {
    const orderId = typeof req.params.orderId === 'string' && /^[a-f0-9]{24}$/i.test(req.params.orderId)
        ? req.params.orderId
        : undefined;
    res.redirect(orderFailedUrl(orderId, 'Payment was cancelled', 'esewa'));
});

/**
 * @desc    Khalti callback
 * @route   GET /api/v1/payments/khalti/callback
 * @access  Public
 */
const khaltiCallback = handleGatewayReturn('khalti');

/**
 * @desc    Verify payment manually
 * @route   POST /api/v1/payments/verify
 * @access  Private
 */
const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
    const { orderId, gateway, callbackData } = req.body;
    const result = await PaymentService.verifyPayment(
        orderId,
        gateway,
        callbackData,
        (req.user as any)._id.toString(),
    );

    res.status(200).json({
        status: 'success',
        data: result,
    });
});

/**
 * @desc    Ask the gateway whether the order's payment went through
 * @route   POST /api/v1/payments/check-status
 * @access  Private
 */
const checkPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
    const result = await PaymentService.checkOrderPayment(req.body.orderId, (req.user as any)._id.toString());

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
    checkPaymentStatus,
    getPaymentMethods,
    initiatePayment,
    esewaSuccess,
    esewaFailure,
    khaltiCallback,
    verifyPayment,
    markCODCollected,
};
