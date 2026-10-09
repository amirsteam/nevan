/**
 * eSewa Gateway
 * Implementation of IPaymentGateway for eSewa (Nepal)
 */
import IPaymentGateway, { PaymentInitiateResult, PaymentVerifyResult, PaymentCallbackResult, UserData } from './IPaymentGateway';
import { IOrder } from '../../models/Order';
import crypto from 'crypto';
import axios from 'axios';

const GATEWAY_TIMEOUT_MS = 15000;

class ESewaGateway implements IPaymentGateway {
    name: string = 'esewa';
    private isProduction: boolean;
    private baseUrl: string;
    private paymentUrl: string;
    private verifyUrl: string;
    private merchantCode: string;
    private secretKey: string;

    constructor() {
        // eSewa endpoints
        this.isProduction = process.env.NODE_ENV === 'production';
        this.baseUrl = this.isProduction
            ? 'https://esewa.com.np'
            : 'https://rc-epay.esewa.com.np'; // Sandbox/RC (Release Candidate)

        this.paymentUrl = `${this.baseUrl}/api/epay/main/v2/form`;
        this.verifyUrl = `${this.baseUrl}/api/epay/transaction/status/`;

        // Merchant credentials from environment
        this.merchantCode = process.env.ESEWA_MERCHANT_CODE || '';
        this.secretKey = process.env.ESEWA_SECRET_KEY || '';
    }

    /**
     * Generate HMAC signature for eSewa
     */
    private generateSignature(message: string): string {
        const hmac = crypto.createHmac('sha256', this.secretKey);
        hmac.update(message);
        return hmac.digest('base64');
    }

    /**
     * Parse an eSewa amount ("1,000.0", 1000, "1000") into a number
     */
    private parseAmount(value: unknown): number {
        return Number(String(value ?? '').replace(/,/g, ''));
    }

    private signatureMatches(signature: unknown, expected: string): boolean {
        if (typeof signature !== 'string') return false;
        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        return a.length === b.length && crypto.timingSafeEqual(a, b);
    }

    /**
     * Ask eSewa's status API about a transaction. Only COMPLETE is a payment; eSewa
     * still processing (PENDING, AMBIGUOUS), an unknown status or eSewa being
     * unreachable is 'pending' — never 'failed', so a payment that did go through
     * isn't written off while it can't be confirmed.
     */
    private async lookup(transactionUuid: string, totalAmount: unknown, transactionCode?: string): Promise<PaymentVerifyResult> {
        let data: any;
        try {
            const response = await axios.get(this.verifyUrl, {
                params: {
                    product_code: this.merchantCode,
                    total_amount: totalAmount,
                    transaction_uuid: transactionUuid,
                },
                timeout: GATEWAY_TIMEOUT_MS,
            });
            data = response.data;
        } catch (error: any) {
            console.error('eSewa status API error:', error.message);
            return {
                verified: false,
                status: 'pending',
                referenceId: transactionUuid,
                message: 'We could not reach eSewa to confirm the payment yet',
                error: error.message,
                rawResponse: null,
            };
        }

        const status = String(data?.status || '').toUpperCase();
        if (status === 'COMPLETE') {
            return {
                verified: true,
                status: 'completed',
                transactionId: transactionCode || data.ref_id || transactionUuid,
                referenceId: transactionUuid,
                // Prefer the amount eSewa's status API reports; eSewa may format amounts as "1,000.0"
                amount: this.parseAmount(data.total_amount ?? totalAmount),
                rawResponse: data,
            };
        }
        if (status === 'NOT_FOUND' || status === 'CANCELED') {
            return {
                verified: false,
                status: 'failed',
                referenceId: transactionUuid,
                message: status === 'CANCELED' ? 'Payment was cancelled' : 'Payment was not completed',
                rawResponse: data,
            };
        }
        if (status === 'FULL_REFUND' || status === 'PARTIAL_REFUND') {
            return {
                verified: false,
                status: 'refunded',
                referenceId: transactionUuid,
                message: 'Payment was refunded',
                rawResponse: data,
            };
        }
        return {
            verified: false,
            status: 'pending',
            referenceId: transactionUuid,
            message: 'eSewa is still confirming this payment',
            rawResponse: data,
        };
    }

    /**
     * Initiate eSewa payment
     */
    async initiate(order: IOrder, userData: UserData): Promise<PaymentInitiateResult> {
        try {
            const amount = order.pricing.total;
            const taxAmount = order.pricing.tax || 0;
            const productServiceCharge = 0;
            const productDeliveryCharge = order.pricing.shippingCost || 0;
            const totalAmount = amount;

            // Create unique transaction UUID (use _ as delimiter since order numbers may contain -)
            const transactionUuid = `${order.orderNumber}_${Date.now()}`;

            // Signature message format: total_amount,transaction_uuid,product_code
            const signatureMessage = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${this.merchantCode}`;
            const signature = this.generateSignature(signatureMessage);

            // Success and failure callback URLs
            const successUrl = `${process.env.BACKEND_URL}/api/v1/payments/esewa/success`;
            // Order id in the path (not the query: eSewa appends its own query string)
            const failureUrl = `${process.env.BACKEND_URL}/api/v1/payments/esewa/failure/${order._id}`;

            // Form data for eSewa
            const formData = {
                amount: amount - taxAmount - productServiceCharge - productDeliveryCharge,
                tax_amount: taxAmount,
                product_service_charge: productServiceCharge,
                product_delivery_charge: productDeliveryCharge,
                total_amount: totalAmount,
                transaction_uuid: transactionUuid,
                product_code: this.merchantCode,
                success_url: successUrl,
                failure_url: failureUrl,
                signed_field_names: 'total_amount,transaction_uuid,product_code',
                signature: signature,
            };

            return {
                success: true,
                transactionId: transactionUuid,
                status: 'initiated',
                requiresRedirect: true,
                redirectUrl: this.paymentUrl,
                formData: formData, // Form data to POST to eSewa
                method: 'POST',
                message: 'Redirecting to eSewa...',
            };
        } catch (error: any) {
            console.error('eSewa initiate error:', error);
            return {
                success: false,
                transactionId: '',
                status: 'failed',
                requiresRedirect: false,
                message: 'Failed to initiate eSewa payment',
                error: error.message,
            };
        }
    }

    /**
     * Verify eSewa payment using transaction lookup API
     */
    async verify(transactionId: string, callbackData: any): Promise<PaymentVerifyResult> {
        // eSewa returns encoded data in the callback
        const data = callbackData?.data;

        if (!data || typeof data !== 'string') {
            return {
                verified: false,
                status: 'failed',
                message: 'No callback data received',
                rawResponse: null,
            };
        }

        let decodedData: any;
        try {
            decodedData = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
        } catch {
            return {
                verified: false,
                status: 'failed',
                message: 'Invalid callback data',
                rawResponse: null,
            };
        }

        const {
            transaction_code,
            status,
            total_amount,
            transaction_uuid,
            product_code,
            signed_field_names,
            signature,
        } = decodedData || {};

        // Verify signature
        const signatureMessage = `transaction_code=${transaction_code},status=${status},total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code},signed_field_names=${signed_field_names}`;
        const expectedSignature = this.generateSignature(signatureMessage);

        if (!this.signatureMatches(signature, expectedSignature)) {
            console.error('eSewa signature mismatch');
            return {
                verified: false,
                status: 'failed',
                message: 'Invalid signature',
                rawResponse: decodedData,
            };
        }

        // The signed callback isn't enough on its own: confirm with eSewa's status API
        return this.lookup(String(transaction_uuid), total_amount, transaction_code);
    }

    async checkStatus(referenceId: string, amount: number): Promise<PaymentVerifyResult> {
        return this.lookup(referenceId, amount);
    }

    /**
     * Handle eSewa callback: find the order. Verification happens in verify().
     */
    async handleCallback(data: any): Promise<PaymentCallbackResult> {
        try {
            // Decode the response data
            const decodedData = JSON.parse(Buffer.from(data.data, 'base64').toString('utf-8'));

            const orderId = decodedData.transaction_uuid.split('_')[0]; // Extract order number
            const status = String(decodedData.status || '').toUpperCase();

            if (status === 'COMPLETE' || status === 'PENDING' || status === 'AMBIGUOUS') {
                return {
                    success: status === 'COMPLETE',
                    orderId,
                    transactionId: decodedData.transaction_code,
                    status: status === 'COMPLETE' ? 'completed' : 'pending',
                    amount: this.parseAmount(decodedData.total_amount),
                    rawResponse: decodedData
                };
            }

            return {
                success: false,
                orderId,
                status: 'failed',
                message: `Payment failed with status: ${decodedData.status}`,
                rawResponse: decodedData
            };
        } catch (error: any) {
            console.error('eSewa callback error:', error);
            return {
                success: false,
                orderId: '',
                status: 'failed',
                message: 'Failed to process callback',
                error: error.message,
            };
        }
    }

    /**
     * Refund eSewa payment
     */
    async refund(transactionId: string, amount: number): Promise<{ success: boolean; message: string; transactionId?: string; amount?: number }> {
        // eSewa doesn't provide a direct refund API for most merchants
        // Refunds are processed through the eSewa merchant portal
        return {
            success: false,
            message: 'eSewa refunds must be processed through the merchant portal',
            transactionId,
            amount,
        };
    }

    getName(): string {
        return this.name;
    }
}

export default ESewaGateway;
