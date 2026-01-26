import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPaymentMethods {
    markComplete(transactionId: string, rawResponse?: any): Promise<IPayment>;
    markFailed(reason: string, rawResponse?: any): Promise<IPayment>;
    processRefund(amount?: number, reason?: string): Promise<IPayment>;
}

export interface IPayment extends Document, IPaymentMethods {
    order: Types.ObjectId;
    user: Types.ObjectId;
    gateway: 'cod' | 'esewa' | 'khalti' | 'stripe';
    amount: number;
    currency: 'NPR' | 'USD';
    status: 'initiated' | 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
    gatewayResponse: {
        transactionId?: string;
        referenceId?: string;
        rawResponse?: any;
    };
    metadata?: any;
    initiatedAt: Date;
    completedAt?: Date;
    failedAt?: Date;
    failureReason?: string;
    refundedAt?: Date;
    refundAmount?: number;
    refundReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface IPaymentModel extends Model<IPayment> {
    findByOrder(orderId: string | Types.ObjectId): Promise<IPayment | null>;
    getStats(startDate?: Date, endDate?: Date): Promise<any[]>;
}

const paymentSchema = new Schema<IPayment, IPaymentModel>({
    order: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    gateway: {
        type: String,
        enum: ['cod', 'esewa', 'khalti', 'stripe'],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    currency: {
        type: String,
        default: 'NPR',
        enum: ['NPR', 'USD'],
    },
    status: {
        type: String,
        enum: ['initiated', 'pending', 'completed', 'failed', 'refunded', 'cancelled'],
        default: 'initiated',
    },
    gatewayResponse: {
        transactionId: String,
        referenceId: String,
        rawResponse: Schema.Types.Mixed,
    },
    metadata: Schema.Types.Mixed,
    initiatedAt: {
        type: Date,
        default: Date.now,
    },
    completedAt: Date,
    failedAt: Date,
    failureReason: String,
    refundedAt: Date,
    refundAmount: Number,
    refundReason: String,
}, {
    timestamps: true,
});

// Indexes
paymentSchema.index({ order: 1 });
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ gateway: 1 });
paymentSchema.index({ 'gatewayResponse.transactionId': 1 });

// Instance methods
paymentSchema.methods.markComplete = async function (this: IPayment, transactionId: string, rawResponse: any = {}) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.gatewayResponse.transactionId = transactionId;
    this.gatewayResponse.rawResponse = rawResponse;
    await this.save();
    return this;
};

paymentSchema.methods.markFailed = async function (this: IPayment, reason: string, rawResponse: any = {}) {
    this.status = 'failed';
    this.failedAt = new Date();
    this.failureReason = reason;
    this.gatewayResponse.rawResponse = rawResponse;
    await this.save();
    return this;
};

paymentSchema.methods.processRefund = async function (this: IPayment, amount?: number, reason?: string) {
    this.status = 'refunded';
    this.refundedAt = new Date();
    this.refundAmount = amount || this.amount;
    this.refundReason = reason;
    await this.save();
    return this;
};

// Statics
paymentSchema.statics.findByOrder = function (orderId: string | Types.ObjectId) {
    return this.findOne({ order: orderId }).sort({ createdAt: -1 });
};

paymentSchema.statics.getStats = async function (startDate?: Date, endDate?: Date) {
    const match: any = { status: 'completed' };

    if (startDate || endDate) {
        match.completedAt = {};
        if (startDate) match.completedAt.$gte = startDate;
        if (endDate) match.completedAt.$lte = endDate;
    }

    const stats = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$gateway',
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 },
            },
        },
    ]);

    return stats;
};

const Payment = mongoose.model<IPayment, IPaymentModel>('Payment', paymentSchema);

export default Payment;
