/**
 * Payment Gateway Factory
 * Creates and manages payment gateway instances
 */
import IPaymentGateway from './IPaymentGateway';
import CODGateway from './CODGateway';
import ESewaGateway from './ESewaGateway';
import KhaltiGateway from './KhaltiGateway';

class PaymentFactory {
    private gateways: Record<string, new () => IPaymentGateway>;
    private instances: Record<string, IPaymentGateway>;

    constructor() {
        // Registry of available gateways
        this.gateways = {
            cod: CODGateway,
            esewa: ESewaGateway,
            khalti: KhaltiGateway,
            // Add more gateways here:
            // stripe: StripeGateway,
            // paypal: PayPalGateway,
        };

        // Cache for gateway instances (singleton per gateway)
        this.instances = {};
    }

    /**
     * Get a payment gateway instance
     */
    getGateway(gatewayName: string): IPaymentGateway {
        const name = gatewayName.toLowerCase();

        if (!this.gateways[name]) {
            throw new Error(`Payment gateway '${name}' is not supported`);
        }

        // Return cached instance or create new one
        if (!this.instances[name]) {
            const GatewayClass = this.gateways[name];
            this.instances[name] = new GatewayClass();
        }

        return this.instances[name];
    }

    /**
     * Get list of available gateways
     */
    getAvailableGateways(): string[] {
        return Object.keys(this.gateways);
    }

    /**
     * Check if a gateway is supported
     */
    isSupported(gatewayName: string): boolean {
        return Object.prototype.hasOwnProperty.call(this.gateways, gatewayName.toLowerCase());
    }

    /**
     * Register a new gateway
     */
    registerGateway(name: string, GatewayClass: new () => IPaymentGateway): void {
        this.gateways[name.toLowerCase()] = GatewayClass;
    }
}

// Export singleton instance
export default new PaymentFactory();
