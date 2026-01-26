/**
 * eSewa Gateway
 * Implementation of IPaymentGateway for eSewa (Nepal)
 */
import IPaymentGateway, { PaymentInitiateResult, PaymentVerifyResult, PaymentCallbackResult, UserData } from './IPaymentGateway';
import { IOrder } from '../../models/Order';
import crypto from 'crypto';
import axios from 'axios';

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
            const failureUrl = `${process.env.BACKEND_URL}/api/v1/payments/esewa/failure`;

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
        try {
            // eSewa returns encoded data in the callback
            const { data } = callbackData;

            if (!data) {
                return {
                    verified: false,
                    status: 'failed',
                    message: 'No callback data received',
                    rawResponse: null,
                };
            }

            // Decode base64 data from eSewa
            const decodedData = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));

            const {
                transaction_code,
                status,
                total_amount,
                transaction_uuid,
                product_code,
                signed_field_names,
                signature,
            } = decodedData;

            // Verify signature
            const signatureMessage = `transaction_code=${transaction_code},status=${status},total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code},signed_field_names=${signed_field_names}`;
            const expectedSignature = this.generateSignature(signatureMessage);

            if (signature !== expectedSignature) {
                console.error('eSewa signature mismatch');
                return {
                    verified: false,
                    status: 'failed',
                    message: 'Invalid signature',
                    rawResponse: decodedData,
                };
            }

            // Additional verification with eSewa API
            const verifyResponse = await axios.get(this.verifyUrl, {
                params: {
                    product_code: this.merchantCode,
                    total_amount: total_amount,
                    transaction_uuid: transaction_uuid,
                },
            });

            if (verifyResponse.data.status === 'COMPLETE') {
                return {
                    verified: true,
                    status: 'completed',
                    transactionId: transaction_code,
                    referenceId: transaction_uuid,
                    amount: Number(total_amount),
                    rawResponse: verifyResponse.data,
                };
            }

            return {
                verified: false,
                status: 'failed',
                message: `Payment status: ${verifyResponse.data.status}`,
                rawResponse: verifyResponse.data,
            };
        } catch (error: any) {
            console.error('eSewa verify error:', error);
            return {
                verified: false,
                status: 'failed',
                message: 'Verification failed',
                error: error.message,
                rawResponse: null,
            };
        }
    }

    /**
     * Handle eSewa callback
     */
    async handleCallback(data: any): Promise<PaymentCallbackResult> {
        try {
            // Decode the response data
            const decodedData = JSON.parse(Buffer.from(data.data, 'base64').toString('utf-8'));

            const orderId = decodedData.transaction_uuid.split('_')[0]; // Extract order number

            if (decodedData.status === 'COMPLETE') {
                return {
                    success: true,
                    orderId,
                    transactionId: decodedData.transaction_code,
                    status: 'completed',
                    amount: Number(decodedData.total_amount),
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
