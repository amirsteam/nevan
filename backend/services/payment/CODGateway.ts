/**
 * COD (Cash on Delivery) Gateway
 * Implementation of IPaymentGateway for Cash on Delivery
 * 
 * COD is always "successful" at initiation since payment
 * is collected on delivery. Payment is marked complete
 * when order is delivered.
 */
import IPaymentGateway, { PaymentInitiateResult, PaymentVerifyResult, PaymentCallbackResult, UserData } from './IPaymentGateway';
import { IOrder } from '../../models/Order';

class CODGateway implements IPaymentGateway {
    name: string = 'cod';

    /**
     * Initiate COD payment
     * COD is always successful at initiation
     */
    async initiate(order: IOrder, userData: UserData): Promise<PaymentInitiateResult> {
        // Generate a reference ID for tracking
        const transactionId = `COD-${order.orderNumber}-${Date.now()}`;

        return {
            success: true,
            transactionId,
            status: 'pending', // Will be 'completed' when delivered
            message: 'Pay cash on delivery',
            requiresRedirect: false,
            // COD doesn't need redirect URL
        };
    }

    /**
     * Verify COD payment
     * COD verification is manual (delivery agent marks it)
     */
    async verify(transactionId: string, callbackData: any): Promise<PaymentVerifyResult> {
        // For COD, verification is done manually
        // This would be called when delivery agent confirms payment
        return {
            verified: true,
            status: 'pending', // Still pending until delivery
            transactionId,
            rawResponse: { method: 'cod', manual: true },
        };
    }

    /**
     * Handle callback
     * COD doesn't have external callbacks
     */
    async handleCallback(data: any): Promise<PaymentCallbackResult> {
        return {
            success: true,
            orderId: data.orderId,
            transactionId: data.transactionId,
            status: 'pending',
        };
    }

    /**
     * Mark COD as collected (called on delivery)
     */
    async markCollected(orderId: string, collectedAmount: number): Promise<any> {
        return {
            success: true,
            status: 'completed',
            message: `NPR ${collectedAmount} collected on delivery`,
        };
    }

    /**
     * Refund for COD
     * Not applicable - no payment was made
     */
    async refund(transactionId: string, amount: number): Promise<{ success: boolean; message: string }> {
        return {
            success: false,
            message: 'Refund not applicable for COD orders',
        };
    }

    getName(): string {
        return this.name;
    }
}

export default CODGateway;
