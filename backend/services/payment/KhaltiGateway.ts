/**
 * Khalti Gateway
 * Implementation of IPaymentGateway for Khalti (Nepal)
 */
import IPaymentGateway, { PaymentInitiateResult, PaymentVerifyResult, PaymentCallbackResult, UserData } from './IPaymentGateway';
import { IOrder } from '../../models/Order';
import axios from 'axios';

class KhaltiGateway implements IPaymentGateway {
    name: string = 'khalti';
    private isProduction: boolean;
    private baseUrl: string;
    private initiateUrl: string;
    private lookupUrl: string;
    private secretKey: string;
    private publicKey: string;

    constructor() {
        // Khalti endpoints
        this.isProduction = process.env.NODE_ENV === 'production';
        this.baseUrl = this.isProduction
            ? 'https://khalti.com/api/v2'
            : 'https://a.khalti.com/api/v2'; // Sandbox

        this.initiateUrl = `${this.baseUrl}/epayment/initiate/`;
        this.lookupUrl = `${this.baseUrl}/epayment/lookup/`;

        // API keys
        this.secretKey = process.env.KHALTI_SECRET_KEY || '';
        this.publicKey = process.env.KHALTI_PUBLIC_KEY || '';
    }

    /**
     * Get authorization header
     */
    private getAuthHeader() {
        return {
            Authorization: `Key ${this.secretKey}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Initiate Khalti payment
     */
    async initiate(order: IOrder, userData: UserData): Promise<PaymentInitiateResult> {
        try {
            // Convert to paisa (Khalti requires amount in paisa)
            const amountInPaisa = Math.round(order.pricing.total * 100);

            const payload = {
                return_url: `${process.env.BACKEND_URL}/api/v1/payments/khalti/callback`,
                website_url: process.env.FRONTEND_URL,
                amount: amountInPaisa,
                purchase_order_id: order.orderNumber,
                purchase_order_name: `Order ${order.orderNumber}`,
                customer_info: {
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone || '',
                },
                // Optional: Add product details
                product_details: (order.items || []).map((item: any) => ({
                    identity: item.product.toString(),
                    name: item.name,
                    total_price: item.subtotal * 100, // In paisa
                    quantity: item.quantity,
                    unit_price: item.price * 100, // In paisa
                })),
            };

            const response = await axios.post(this.initiateUrl, payload, {
                headers: this.getAuthHeader(),
            });

            if (response.data && response.data.payment_url) {
                return {
                    success: true,
                    transactionId: response.data.pidx,
                    status: 'initiated',
                    requiresRedirect: true,
                    redirectUrl: response.data.payment_url,
                    pidx: response.data.pidx,
                    message: 'Redirecting to Khalti...',
                };
            }

            return {
                success: false,
                transactionId: '',
                status: 'failed',
                requiresRedirect: false,
                message: 'Failed to get Khalti payment URL',
                error: JSON.stringify(response.data),
            };
        } catch (error: any) {
            console.error('Khalti initiate error:', error.response?.data || error.message);
            return {
                success: false,
                transactionId: '',
                status: 'failed',
                requiresRedirect: false,
                message: error.response?.data?.detail || 'Failed to initiate Khalti payment',
                error: error.message,
            };
        }
    }

    /**
     * Verify Khalti payment using lookup API
     */
    async verify(transactionId: string, callbackData: any): Promise<PaymentVerifyResult> {
        try {
            const { pidx } = callbackData;

            if (!pidx) {
                return {
                    verified: false,
                    status: 'failed',
                    message: 'No pidx provided for verification',
                    rawResponse: null,
                };
            }

            const response = await axios.post(
                this.lookupUrl,
                { pidx },
                { headers: this.getAuthHeader() }
            );

            const { status, total_amount, transaction_id, fee, refunded } = response.data;

            if (status === 'Completed') {
                return {
                    verified: true,
                    status: 'completed',
                    transactionId: transaction_id,
                    referenceId: pidx,
                    amount: total_amount / 100, // Convert from paisa to rupees
                    fee: fee / 100,
                    rawResponse: response.data,
                };
            }

            if (status === 'Pending') {
                return {
                    verified: false,
                    status: 'pending',
                    message: 'Payment is still pending',
                    rawResponse: response.data,
                };
            }

            if (status === 'Refunded' || refunded) {
                return {
                    verified: false,
                    status: 'refunded',
                    message: 'Payment was refunded',
                    rawResponse: response.data,
                };
            }

            return {
                verified: false,
                status: 'failed',
                message: `Payment status: ${status}`,
                rawResponse: response.data,
            };
        } catch (error: any) {
            console.error('Khalti verify error:', error.response?.data || error.message);
            return {
                verified: false,
                status: 'failed',
                message: 'Verification failed',
                error: error.message,
                rawResponse: error.response?.data,
            };
        }
    }

    /**
     * Handle Khalti callback
     */
    async handleCallback(data: any): Promise<PaymentCallbackResult> {
        try {
            const { pidx, status, purchase_order_id, transaction_id, amount } = data;

            if (status === 'Completed') {
                // Verify the payment
                const verification = await this.verify(transaction_id, { pidx });

                return {
                    success: verification.verified,
                    orderId: purchase_order_id,
                    transactionId: transaction_id || pidx,
                    status: verification.status,
                    amount: amount / 100,
                    rawResponse: data,
                };
            }

            return {
                success: false,
                orderId: purchase_order_id,
                status: status?.toLowerCase() || 'failed',
                message: `Payment ${status}`,
                rawResponse: data,
            };
        } catch (error: any) {
            console.error('Khalti callback error:', error);
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
     * Refund Khalti payment
     */
    async refund(transactionId: string, amount: number): Promise<{ success: boolean; message: string; transactionId?: string; amount?: number }> {
        // Khalti doesn't provide a direct refund API for most merchants
        // Contact Khalti support for refunds
        return {
            success: false,
            message: 'Khalti refunds must be requested through Khalti support',
            transactionId,
            amount,
        };
    }

    getName(): string {
        return this.name;
    }
}

export default KhaltiGateway;
