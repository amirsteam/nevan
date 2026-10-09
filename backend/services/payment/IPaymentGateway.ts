/**
 * Payment Gateway Interface
 * Interface defining the contract for all payment gateways
 * 
 * All payment gateways must implement these methods.
 * This follows the Strategy Pattern for pluggable payment systems.
 */
import { IOrder } from '../../models/Order';

export interface PaymentInitiateResult {
    success: boolean;
    transactionId: string;
    status: string;
    requiresRedirect: boolean;
    redirectUrl?: string;
    formData?: any;
    method?: string;
    message?: string;
    pidx?: string;
    error?: string;
}

export interface PaymentVerifyResult {
    verified: boolean;
    status: string;
    transactionId?: string;
    referenceId?: string;
    amount?: number;
    fee?: number;
    message?: string;
    rawResponse: any;
    error?: string;
}

export interface PaymentCallbackResult {
    success: boolean;
    orderId: string;
    transactionId?: string;
    status: string;
    amount?: number;
    message?: string;
    rawResponse?: any;
    error?: string;
}

export interface UserData {
    name: string;
    email: string;
    phone?: string;
}

export default interface IPaymentGateway {
    name: string;

    /**
     * Initiate a payment
     */
    initiate(order: IOrder, userData: UserData): Promise<PaymentInitiateResult>;

    /**
     * Verify a payment after gateway callback
     */
    verify(transactionId: string, callbackData: any): Promise<PaymentVerifyResult>;

    /**
     * Ask the gateway what happened to a payment attempt, without any callback data
     * (the shopper may never have come back from the gateway). `referenceId` is the
     * id saved at initiation (eSewa transaction_uuid / Khalti pidx). Returns status
     * 'pending' when the gateway can't say yet or can't be reached.
     */
    checkStatus(referenceId: string, amount: number): Promise<PaymentVerifyResult>;

    /**
     * Handle callback from payment gateway
     */
    handleCallback(data: any): Promise<PaymentCallbackResult>;

    /**
     * Process refund (optional)
     */
    refund(transactionId: string, amount: number): Promise<{ success: boolean; message: string; transactionId?: string; amount?: number }>;

    /**
     * Get gateway name
     */
    getName(): string;
}
