import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IReviewMethods {
    markHelpful(userId: string | Types.ObjectId): Promise<IReview>;
}

export interface IReview extends Document, IReviewMethods {
    product: Types.ObjectId;
    user: Types.ObjectId;
    order?: Types.ObjectId;
    rating: number;
    title?: string;
    comment?: string;
    isVerifiedPurchase: boolean;
    isApproved: boolean;
    helpfulCount: number;
    helpfulBy: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

interface IReviewModel extends Model<IReview> {
    calculateAverageRating(productId: Types.ObjectId): Promise<void>;
    getProductReviews(productId: string | Types.ObjectId, options?: any): any;
}

const reviewSchema = new Schema<IReview, IReviewModel>({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    order: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5'],
    },
    title: {
        type: String,
        maxlength: [100, 'Title cannot exceed 100 characters'],
        trim: true,
    },
    comment: {
        type: String,
        maxlength: [1000, 'Comment cannot exceed 1000 characters'],
        trim: true,
    },
    isVerifiedPurchase: {
        type: Boolean,
        default: false,
    },
    isApproved: {
        type: Boolean,
        default: false,
    },
    helpfulCount: {
        type: Number,
        default: 0,
    },
    helpfulBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
}, {
    timestamps: true,
});

// Indexes
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, isApproved: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ createdAt: -1 });

// Statics
reviewSchema.statics.calculateAverageRating = async function (productId: Types.ObjectId) {
    const stats = await this.aggregate([
        { $match: { product: productId, isApproved: true } },
        {
            $group: {
                _id: '$product',
                avgRating: { $avg: '$rating' },
                numRatings: { $sum: 1 },
            },
        },
    ]);

    const Product = mongoose.model('Product');

    if (stats.length > 0) {
        await Product.findByIdAndUpdate(productId, {
            'ratings.average': Math.round(stats[0].avgRating * 10) / 10,
            'ratings.count': stats[0].numRatings,
        });
    } else {
        await Product.findByIdAndUpdate(productId, {
            'ratings.average': 0,
            'ratings.count': 0,
        });
    }
};

reviewSchema.statics.getProductReviews = function (productId: string | Types.ObjectId, options: any = {}) {
    const { limit = 10, page = 1, sort = '-createdAt' } = options;

    return this.find({ product: productId, isApproved: true })
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'name avatar');
};

// Middleware - post save
reviewSchema.post('save', async function (this: IReview) {
    await (this.constructor as IReviewModel).calculateAverageRating(this.product);
});

// Middleware - post delete
reviewSchema.post('deleteOne', { document: true, query: false }, async function (this: IReview) {
    await (this.constructor as IReviewModel).calculateAverageRating(this.product);
});

// Instance methods
reviewSchema.methods.markHelpful = async function (this: IReview, userId: string | Types.ObjectId) {
    const userIdStr = userId.toString();
    const alreadyMarked = this.helpfulBy.some(id => id.toString() === userIdStr);

    if (alreadyMarked) {
        this.helpfulBy = this.helpfulBy.filter(id => id.toString() !== userIdStr) as any;
        this.helpfulCount = Math.max(0, this.helpfulCount - 1);
    } else {
        this.helpfulBy.push(userId as any);
        this.helpfulCount += 1;
    }

    await this.save();
    return this;
};

const Review = mongoose.model<IReview, IReviewModel>('Review', reviewSchema);

export default Review;
