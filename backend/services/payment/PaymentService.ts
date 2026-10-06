/**
 * Payment Service
 * High-level service for payment processing
 * Uses PaymentFactory to handle different payment gateways
 */
import mongoose from 'mongoose';
import PaymentFactory from './PaymentFactory';
import Payment, { IPayment } from '../../models/Payment';
import Order from '../../models/Order';
import Cart from '../../models/Cart';
import AppError from '../../utils/AppError';
import { reserveOrderStock } from '../orderService';
import { UserData } from './IPaymentGateway';

interface PaymentMethod {
    id: string;
    name: string;
    description: string;
    icon: string;
    enabled: boolean;
}

class PaymentService {
    /**
     * Get available payment methods
     */
    getAvailableMethods(): PaymentMethod[] {
        return [
            {
                id: 'cod',
                name: 'Cash on Delivery',
                description: 'Pay when you receive your order',
                icon: 'cash',
                enabled: true,
            },
            {
                id: 'esewa',
                name: 'eSewa',
                description: 'Pay with eSewa digital wallet',
                icon: 'esewa',
                enabled: !!process.env.ESEWA_MERCHANT_CODE,
            },
            {
                id: 'khalti',
                name: 'Khalti',
                description: 'Pay with Khalti digital wallet',
                icon: 'khalti',
                enabled: !!process.env.KHALTI_SECRET_KEY,
            },
        ].filter(method => method.enabled);
    }

    /**
     * Initiate payment for an order
     */
    async initiatePayment(orderId: string, gatewayName: string, userData: UserData, userId?: string): Promise<any> {
        // Get order
        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404);
        }

        if (userId && order.user.toString() !== userId.toString()) {
            throw new AppError('Order not found', 404);
        }

        // Check if order can be paid
        if (order.payment.status === 'paid') {
            throw new AppError('Order is already paid', 400);
        }
        if (order.status !== 'pending') {
            throw new AppError(
                order.status === 'cancelled'
                    ? 'This order was cancelled because payment was not completed. Please place a new order.'
                    : 'This order can no longer be paid online',
                400,
            );
        }
        if (String(gatewayName).toLowerCase() !== order.payment.method) {
            throw new AppError(`This order was placed with ${order.payment.method.toUpperCase()}`, 400);
        }

        // Get gateway
        const gateway = PaymentFactory.getGateway(gatewayName);

        // Create payment record
        const payment = await Payment.create({
            order: order._id,
            user: order.user,
            gateway: gatewayName,
            amount: order.pricing.total,
            status: 'initiated',
        });

        // Initiate payment with gateway
        const result = await gateway.initiate(order, userData);

        // Update payment record
        if (result.success) {
            // referenceId keeps the gateway's initiation id (eSewa transaction_uuid / Khalti pidx);
            // markComplete later overwrites transactionId with the gateway's final transaction code.
            payment.gatewayResponse.transactionId = result.transactionId;
            payment.gatewayResponse.referenceId = result.transactionId;
            payment.status = 'pending';
        } else {
            payment.status = 'failed';
            (payment as any).failureReason = result.message;
        }
        await payment.save();

        return {
            ...result,
            paymentId: payment._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
        };
    }

    /**
     * Verify payment after gateway callback
     */
    /**
     * Verify payment after gateway callback.
     *
     * The callback data comes from the client (query string or request body), so a
     * gateway-verified payment is only accepted when it is bound to THIS order:
     *  - the gateway reference (eSewa transaction_uuid / Khalti pidx) must match a
     *    Payment record initiated for this order, and
     *  - the verified amount must equal the order total.
     * When userId is given (authenticated /verify route) the order must also belong to that user.
     */
    async verifyPayment(orderId: string, gatewayName: string, callbackData: any, userId?: string): Promise<any> {
        if (!orderId || typeof orderId !== 'string') {
            throw new AppError('Order ID is required', 400);
        }

        // Get order
        let query: any;
        if (mongoose.Types.ObjectId.isValid(orderId)) {
            query = { $or: [{ _id: orderId }, { orderNumber: orderId }] };
        } else {
            query = { orderNumber: orderId };
        }

        const order = await Order.findOne(query);

        if (!order || (userId && order.user.toString() !== userId.toString())) {
            throw new AppError('Order not found', 404);
        }

        // Idempotent: a paid order stays paid; never re-process a callback for it
        if (order.payment.status === 'paid') {
            return {
                success: true,
                orderId: order._id,
                orderNumber: order.orderNumber,
                status: 'completed',
                message: 'Order is already paid',
            };
        }

        // Ask the gateway whether the payment in the callback data really completed
        const gateway = PaymentFactory.getGateway(gatewayName);
        const result = await gateway.verify('', callbackData || {});

        // Bind the verified payment to a payment attempt that was initiated for this order
        const reference = result.referenceId;
        const payment = reference
            ? await Payment.findOne({
                order: order._id,
                gateway: gatewayName,
                $or: [
                    { 'gatewayResponse.referenceId': reference },
                    { 'gatewayResponse.transactionId': reference },
                ],
            })
            : null;

        if (!payment) {
            if (result.verified) {
                console.warn(
                    `⚠️ Rejected ${gatewayName} payment ${reference} that does not belong to order ${order.orderNumber}`,
                );
            }
            return {
                success: false,
                orderId: order._id,
                orderNumber: order.orderNumber,
                status: 'failed',
                message: result.verified
                    ? 'Payment does not match this order'
                    : result.message || 'Payment verification failed',
            };
        }

        if (result.verified && !this.amountsMatch(result.amount, order.pricing.total)) {
            const message = `Paid amount (${result.amount}) does not match order total (${order.pricing.total})`;
            console.warn(`⚠️ ${message} for order ${order.orderNumber}`);
            await payment.markFailed(message, result.rawResponse);
            return {
                success: false,
                orderId: order._id,
                orderNumber: order.orderNumber,
                status: 'failed',
                message,
            };
        }

        // Update payment and order based on result
        if (result.verified) {
            // payment was found by reference, so reference is set here
            const transactionId = result.transactionId || (reference as string);
            await payment.markComplete(transactionId, result.rawResponse);

            // Paid after the order was cancelled (payment window expired or the
            // order was replaced): reopen it if the stock is still available,
            // otherwise keep the money on record and flag the order for a refund.
            if (order.status === 'cancelled') {
                const reopened = await this.reopenCancelledOrder(order, transactionId);
                if (!reopened) {
                    return {
                        success: false,
                        orderId: order._id,
                        orderNumber: order.orderNumber,
                        status: 'refund_required',
                        message:
                            'We received your payment, but this order had already been cancelled and the items are no longer available. We will refund you.',
                    };
                }
            } else {
                await (order as any).markPaymentComplete(transactionId);
            }

            // Remove the purchased lines from the cart; anything added since stays
            await this.removeOrderedItemsFromCart(order);
        } else if (result.status !== 'pending') {
            await payment.markFailed(result.message || 'Payment verification failed', result.rawResponse);
        }

        return {
            success: result.verified,
            orderId: order._id,
            orderNumber: order.orderNumber,
            status: result.status,
            message: result.message,
        };
    }

    /**
     * Reopen an order cancelled before its payment arrived. Returns false when the
     * stock is gone; the order is then marked paid-but-cancelled for a manual refund.
     */
    private async reopenCancelledOrder(order: any, transactionId: string): Promise<boolean> {
        try {
            await reserveOrderStock(order);
        } catch {
            order.payment.status = 'paid';
            order.payment.paidAt = new Date();
            order.payment.transactionId = transactionId;
            order.statusHistory.push({
                status: 'cancelled',
                note: 'Payment received after cancellation and items are out of stock - refund required',
                changedAt: new Date(),
            });
            await order.save();
            console.warn(`⚠️ Order ${order.orderNumber} paid after cancellation; refund required`);
            return false;
        }

        order.status = 'pending';
        order.cancelledAt = undefined;
        order.cancellationReason = undefined;
        order.statusHistory.push({
            status: 'pending',
            note: 'Reopened: payment arrived after the order was cancelled',
            changedAt: new Date(),
        });
        await order.markPaymentComplete(transactionId);
        return true;
    }

    /**
     * Remove an order's items from the customer's cart (matched by product + variant)
     */
    private async removeOrderedItemsFromCart(order: any): Promise<void> {
        const lines = order.items.map((item: any) => ({
            product: item.product,
            variantId: item.variantId || null,
        }));
        if (lines.length === 0) return;
        await Cart.updateOne({ user: order.user }, { $pull: { items: { $or: lines } } });
    }

    /**
     * Compare a gateway amount with the order total (rupees, tolerant of float rounding)
     */
    private amountsMatch(paid: number | undefined, expected: number): boolean {
        if (typeof paid !== 'number' || !Number.isFinite(paid)) return false;
        return Math.abs(paid - expected) < 0.01;
    }

    /**
     * Handle gateway callback
     */
    async handleCallback(gatewayName: string, callbackData: any): Promise<any> {
        const gateway = PaymentFactory.getGateway(gatewayName);
        const result = await gateway.handleCallback(callbackData);

        if (result.success && result.orderId) {
            // Verify and update order
            return this.verifyPayment(result.orderId, gatewayName, callbackData);
        }

        // Gateways identify the order by its order number; the storefront links by id
        if (result.orderId && !mongoose.Types.ObjectId.isValid(result.orderId)) {
            const order = await Order.findOne({ orderNumber: result.orderId }).select('_id');
            result.orderId = order ? String(order._id) : '';
        }

        return result;
    }

    /**
     * Get payment by order
     */
    async getPaymentByOrder(orderId: string): Promise<IPayment | null> {
        return (Payment as any).findByOrder(orderId);
    }

    /**
     * Mark COD payment as collected
     */
    async markCODCollected(orderId: string, userId: string): Promise<any> {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404);
        }

        if (order.payment.method !== 'cod') {
            throw new AppError('Order is not Cash on Delivery', 400);
        }

        // Update order payment status
        order.payment.status = 'paid';
        order.payment.paidAt = new Date();
        await order.save();

        // Update payment record if exists
        const payment = await Payment.findOne({ order: orderId, gateway: 'cod' });
        if (payment) {
            await (payment as any).markComplete(`COD-${order.orderNumber}`, { collectedBy: userId });
        }

        return {
            success: true,
            message: 'COD payment marked as collected',
            orderId: order._id,
        };
    }
}

export default new PaymentService();
