/**
 * Payment Service
 * High-level service for payment processing
 * Uses PaymentFactory to handle different payment gateways
 */
import mongoose from 'mongoose';
import PaymentFactory from './PaymentFactory';
import Payment, { IPayment } from '../../models/Payment';
import Order, { IOrder } from '../../models/Order';
import Cart from '../../models/Cart';
import AppError from '../../utils/AppError';
import { claimPayment, expireUnpaidOrders, flagDuplicatePayment } from '../orderService';
import { PaymentVerifyResult, UserData } from './IPaymentGateway';

interface PaymentMethod {
    id: string;
    name: string;
    description: string;
    icon: string;
    enabled: boolean;
}

const ONLINE_GATEWAYS = ['esewa', 'khalti'];
const GATEWAY_NAMES: Record<string, string> = { esewa: 'eSewa', khalti: 'Khalti' };

// Attempts younger than this are left to the shopper's own redirect
const RECONCILE_MIN_AGE_MS = 2 * 60 * 1000;
// A "not paid" answer is final only once the shopper can't still be paying
const ATTEMPT_SETTLE_MS = 60 * 60 * 1000;
// Stop asking the gateway about an attempt after this long
const ATTEMPT_MAX_OPEN_MS = 24 * 60 * 60 * 1000;

/** Where an order's payment stands after asking the gateway */
type ReconcileState = 'paid' | 'processing' | 'unpaid';

// Gateways use their live endpoints only in production (sandbox otherwise)
const usesLiveGateways = (): boolean => process.env.NODE_ENV === 'production';

/**
 * Open gateway attempts: sent to eSewa/Khalti and not settled yet — and made by
 * this environment: a development server sharing the database must not ask the
 * eSewa sandbox about real payments (it would report them as not found).
 */
const openAttempts = () => ({
    status: { $in: ['initiated', 'pending'] },
    'gatewayResponse.referenceId': { $nin: [null, ''] },
    'metadata.live': { $ne: !usesLiveGateways() },
});

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
     * Initiate (or retry) payment for an order
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
            return this.alreadyPaid(order);
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

        // COD orders get their payment record when they are placed; older app
        // versions still call this right after placing one
        if (order.payment.method === 'cod') {
            const existing = await Payment.findOne({ order: order._id, gateway: 'cod' });
            if (existing) {
                return {
                    success: true,
                    transactionId: existing.gatewayResponse?.referenceId,
                    status: 'pending',
                    requiresRedirect: false,
                    message: 'Pay cash on delivery',
                    paymentId: existing._id,
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                };
            }
        } else {
            // Retry: an earlier attempt may have gone through without the shopper
            // coming back to the site. Never let them pay twice.
            const state = await this.reconcileOrder(order);
            if (state === 'paid') {
                return this.alreadyPaid(order);
            }
            if (state === 'processing') {
                throw new AppError(
                    `Your last payment is still being confirmed by ${GATEWAY_NAMES[order.payment.method]}. ` +
                        "Please wait a few minutes and check your order before paying again.",
                    409,
                );
            }
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
            // Which gateway endpoints (live or sandbox) know about this attempt
            metadata: { live: usesLiveGateways() },
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

    private alreadyPaid(order: IOrder) {
        return {
            success: false,
            alreadyPaid: true,
            requiresRedirect: false,
            status: 'completed',
            message: 'This order is already paid',
            orderId: order._id,
            orderNumber: order.orderNumber,
        };
    }

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

        const respond = (outcome: { success: boolean; status: string; message?: string }) => ({
            ...outcome,
            orderId: order._id,
            orderNumber: order.orderNumber,
        });

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
            // A paid order stays paid whatever arrives for it
            if (order.payment.status === 'paid') {
                return respond({ success: true, status: 'completed', message: 'Order is already paid' });
            }
            return respond({
                success: false,
                status: 'failed',
                message: result.verified
                    ? 'Payment does not match this order'
                    : result.message || 'Payment verification failed',
            });
        }

        // Idempotent: this payment was already applied (e.g. the success page reloaded)
        if (payment.status === 'completed' && order.payment.status === 'paid') {
            return respond({ success: true, status: 'completed', message: 'Order is already paid' });
        }

        if (!result.verified) {
            // Not a payment (yet). The attempt stays open: reconciliation asks the
            // gateway again later, in case it was only slow to confirm.
            return respond({
                success: false,
                status: result.status === 'pending' ? 'pending' : 'failed',
                message: result.message || 'Payment verification failed',
            });
        }

        return respond(await this.applyVerifiedPayment(order, payment, result));
    }

    /**
     * Record a payment the gateway confirmed: check the amount, mark the attempt
     * complete and the order paid (exactly once, see orderService.claimPayment),
     * and take the purchased lines out of the cart. Used by the gateway redirect,
     * the verify route and reconciliation alike.
     */
    private async applyVerifiedPayment(
        order: IOrder,
        payment: IPayment,
        result: PaymentVerifyResult,
    ): Promise<{ success: boolean; status: string; message?: string }> {
        if (!this.amountsMatch(result.amount, order.pricing.total)) {
            const message = `Paid amount (${result.amount}) does not match order total (${order.pricing.total})`;
            console.warn(`⚠️ ${message} for order ${order.orderNumber}`);
            await payment.markFailed(message, result.rawResponse);
            return { success: false, status: 'failed', message };
        }

        // payment was found by reference, so a reference is always set here
        const transactionId = result.transactionId || (payment.gatewayResponse.referenceId as string);
        await payment.markComplete(transactionId, result.rawResponse);

        const { outcome, order: updated } = await claimPayment(order._id as any, transactionId);

        if (outcome === 'already_paid') {
            if (updated && updated.payment.transactionId !== transactionId) {
                payment.metadata = { ...(payment.metadata || {}), duplicate: true };
                await payment.save();
                await flagDuplicatePayment(updated, transactionId);
                return {
                    success: true,
                    status: 'duplicate',
                    message: 'This order had already been paid. We received a second payment and will refund it.',
                };
            }
            return { success: true, status: 'completed', message: 'Order is already paid' };
        }

        if (outcome === 'refund_required') {
            return {
                success: false,
                status: 'refund_required',
                message:
                    'We received your payment, but this order had already been cancelled and the items are no longer available. We will refund you.',
            };
        }

        // Remove the purchased lines from the cart; anything added since stays
        await this.removeOrderedItemsFromCart(order);
        return { success: true, status: 'completed' };
    }

    /**
     * Ask the gateway about one open attempt and act on the answer.
     * 'paid': money arrived (applied to the order); 'processing': the gateway is
     * still working on it or can't be reached; 'unpaid': no payment.
     */
    private async reconcilePayment(payment: IPayment): Promise<ReconcileState> {
        const reference = payment.gatewayResponse?.referenceId;
        if (!reference) return 'unpaid';

        const result = await PaymentFactory.getGateway(payment.gateway).checkStatus(reference, payment.amount);
        const age = Date.now() - new Date(payment.initiatedAt).getTime();

        if (result.verified) {
            const order = await Order.findById(payment.order);
            if (!order) return 'unpaid';
            const outcome = await this.applyVerifiedPayment(order, payment, result);
            if (outcome.status !== 'failed') {
                console.log(`💳 Confirmed ${payment.gateway} payment for order ${order.orderNumber} with the gateway`);
                return 'paid';
            }
            return 'unpaid';
        }

        if (result.status === 'pending') {
            if (age < ATTEMPT_MAX_OPEN_MS) return 'processing';
            await payment.markFailed('No confirmation from the gateway within 24 hours', result.rawResponse);
            return 'unpaid';
        }

        // Not paid. Settle it only once the shopper can't still be on the gateway's page.
        if (age >= ATTEMPT_SETTLE_MS) {
            await payment.markFailed(result.message || 'Payment was not completed', result.rawResponse);
        }
        return 'unpaid';
    }

    /**
     * Check an order's open gateway attempts (the shopper may have paid without
     * coming back). `checked` collects the attempts asked about.
     */
    async reconcileOrder(order: IOrder, checked?: Set<string>): Promise<ReconcileState> {
        if (order.payment.status === 'paid') return 'paid';
        if (!ONLINE_GATEWAYS.includes(order.payment.method)) return 'unpaid';

        const attempts = await Payment.find({ order: order._id, gateway: order.payment.method, ...openAttempts() })
            .sort({ initiatedAt: -1 });

        let processing = false;
        for (const attempt of attempts) {
            checked?.add(String(attempt._id));
            const state = await this.reconcilePayment(attempt);
            if (state === 'paid') return 'paid';
            if (state === 'processing') processing = true;
        }
        return processing ? 'processing' : 'unpaid';
    }

    /**
     * Payment upkeep, run every few minutes from server.ts:
     *  1. cancel online orders left unpaid past the payment window — after asking
     *     the gateway, so an order paid without the redirect is kept (and marked
     *     paid), and one the gateway is still processing waits (up to 24 hours);
     *  2. ask the gateways about every other open attempt, including those of
     *     cancelled orders, so late money reopens the order or flags a refund.
     */
    async settleOnlinePayments(windowMinutes: number): Promise<{ expired: number; paid: number }> {
        const checked = new Set<string>();

        const expired = await expireUnpaidOrders(windowMinutes, async (order) => {
            // Paid through the other kind of server (live vs sandbox): only it can ask the gateway
            if (await Payment.exists({ order: order._id, 'metadata.live': !usesLiveGateways() })) return true;
            const state = await this.reconcileOrder(order, checked);
            if (state === 'paid') return true;
            return state === 'processing' && Date.now() - order.createdAt.getTime() < ATTEMPT_MAX_OPEN_MS;
        });

        const open = await Payment.find({
            gateway: { $in: ONLINE_GATEWAYS },
            ...openAttempts(),
            initiatedAt: { $lt: new Date(Date.now() - RECONCILE_MIN_AGE_MS) },
        })
            .sort({ initiatedAt: 1 })
            .limit(100);

        let paid = 0;
        for (const payment of open) {
            if (checked.has(String(payment._id))) continue;
            try {
                if ((await this.reconcilePayment(payment)) === 'paid') paid++;
            } catch (error) {
                console.error(`Could not reconcile payment ${payment._id}:`, error);
            }
        }

        return { expired, paid };
    }

    /**
     * The shopper's "did my payment go through?" — asks the gateway about the
     * order's open attempts, then reports where the order stands.
     */
    async checkOrderPayment(orderId: string, userId: string): Promise<any> {
        const order = await Order.findOne({ _id: orderId, user: userId });
        if (!order) {
            throw new AppError('Order not found', 404);
        }

        const state = await this.reconcileOrder(order);
        const current = (await Order.findById(order._id)) || order;

        return {
            orderId: current._id,
            orderNumber: current.orderNumber,
            status: current.status,
            paymentStatus: current.payment.status,
            // The gateway is still confirming a payment: the shopper shouldn't pay again
            processing: state === 'processing',
        };
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

        if (result.orderId && (result.success || result.status === 'pending')) {
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
        // Conditional, so a cancelled order can't be marked paid
        const order = await Order.findOneAndUpdate(
            { _id: orderId, 'payment.method': 'cod', status: { $ne: 'cancelled' } },
            { $set: { 'payment.status': 'paid', 'payment.paidAt': new Date() } },
            { new: true },
        );
        if (!order) {
            const existing = await Order.findById(orderId).select('payment status');
            if (!existing) {
                throw new AppError('Order not found', 404);
            }
            throw new AppError(
                existing.payment.method !== 'cod'
                    ? 'Order is not Cash on Delivery'
                    : 'A cancelled order cannot be marked as paid',
                400,
            );
        }

        // Update payment record if exists
        const payment = await Payment.findOne({ order: orderId, gateway: 'cod' });
        if (payment && payment.status !== 'completed') {
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
