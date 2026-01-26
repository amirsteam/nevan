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
    async initiatePayment(orderId: string, gatewayName: string, userData: UserData): Promise<any> {
        // Get order
        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404);
        }

        // Check if order can be paid
        if (order.payment.status === 'paid') {
            throw new AppError('Order is already paid', 400);
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
            (payment as any).gatewayResponse.transactionId = result.transactionId;
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
    async verifyPayment(orderId: string, gatewayName: string, callbackData: any): Promise<any> {
        // Get order
        let query: any;
        if (mongoose.Types.ObjectId.isValid(orderId)) {
            query = { $or: [{ _id: orderId }, { orderNumber: orderId }] };
        } else {
            query = { orderNumber: orderId };
        }

        const order = await Order.findOne(query);

        if (!order) {
            throw new AppError('Order not found', 404);
        }

        // Get payment record
        const payment = await Payment.findOne({
            order: order._id,
            gateway: gatewayName,
        }).sort({ createdAt: -1 });

        if (!payment) {
            // If payment record not found, try to find by transaction ID or create new?
            // Usually should exist from initiation.
            throw new AppError('Payment record not found', 404);
        }

        // Get gateway and verify
        const gateway = PaymentFactory.getGateway(gatewayName);
        const result = await gateway.verify((payment as any).gatewayResponse.transactionId, callbackData);

        // Update payment and order based on result
        if (result.verified) {
            await (payment as any).markComplete(result.transactionId, result.rawResponse);
            await (order as any).markPaymentComplete(result.transactionId);

            // Clear cart after successful online payment
            await Cart.findOneAndUpdate({ user: order.user }, { $set: { items: [] } });
        } else {
            await (payment as any).markFailed(result.message, result.rawResponse);
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
     * Handle gateway callback
     */
    async handleCallback(gatewayName: string, callbackData: any): Promise<any> {
        const gateway = PaymentFactory.getGateway(gatewayName);
        const result = await gateway.handleCallback(callbackData);

        if (result.success && result.orderId) {
            // Verify and update order
            return this.verifyPayment(result.orderId, gatewayName, callbackData);
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
