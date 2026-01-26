import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { IProduct } from './Product';

export interface ICartItem {
    _id: Types.ObjectId;
    product: Types.ObjectId | IProduct;
    variantId: Types.ObjectId | null;
    quantity: number;
    priceAtAdd: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICartMethods {
    calculateTotal(): {
        items: any[];
        subtotal: number;
        itemCount: number;
    };
    addItem(productId: Types.ObjectId, quantity: number, variantId: Types.ObjectId | null, price: number): Promise<ICart>;
    updateItemQuantity(itemId: string | Types.ObjectId, quantity: number): Promise<ICart>;
    removeItem(itemId: string | Types.ObjectId): Promise<ICart>;
    clear(): Promise<ICart>;
}

export interface ICart extends Document, ICartMethods {
    user: Types.ObjectId;
    items: Types.DocumentArray<ICartItem & Document>;
    itemCount: number;
    createdAt: Date;
    updatedAt: Date;
}

interface ICartModel extends Model<ICart> {
    getOrCreate(userId: string | Types.ObjectId): Promise<ICart>;
}

const cartItemSchema = new Schema<ICartItem>({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    variantId: {
        type: Schema.Types.ObjectId,
        default: null,
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1'],
        default: 1,
    },
    priceAtAdd: {
        type: Number,
    },
}, { _id: true, timestamps: true });

const cartSchema = new Schema<ICart, ICartModel>({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    items: [cartItemSchema],
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

cartSchema.index({ updatedAt: -1 });

// Virtuals
cartSchema.virtual('itemCount').get(function (this: ICart) {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Instance methods
cartSchema.methods.calculateTotal = function (this: ICart) {
    let subtotal = 0;
    const itemsWithPrices: any[] = [];

    for (const item of this.items) {
        if (!item.product) continue;

        const product = item.product as any; // Cast as any for simplicity in calculation
        let itemPrice = product.price;
        let variant = null;

        if (item.variantId && product.variants) {
            variant = product.variants.find(
                (v: any) => v._id.toString() === item.variantId?.toString()
            );
            if (variant) {
                itemPrice = variant.price;
            }
        }

        const itemTotal = itemPrice * item.quantity;
        subtotal += itemTotal;

        itemsWithPrices.push({
            ...(item as any).toObject(),
            variant,
            currentPrice: itemPrice,
            itemTotal,
            priceChanged: item.priceAtAdd !== itemPrice,
        });
    }

    return {
        items: itemsWithPrices,
        subtotal,
        itemCount: this.itemCount,
    };
};

cartSchema.methods.addItem = async function (this: ICart, productId: Types.ObjectId, quantity: number, variantId: Types.ObjectId | null, price: number) {
    const existingIndex = this.items.findIndex((item: any) => {
        if (!item.product.equals(productId)) return false;
        const existingVarId = item.variantId ? item.variantId.toString() : null;
        const newVarId = variantId ? variantId.toString() : null;
        return existingVarId === newVarId;
    });

    if (existingIndex > -1) {
        this.items[existingIndex].quantity += quantity;
    } else {
        this.items.push({
            product: productId,
            variantId,
            quantity,
            priceAtAdd: price,
        } as any);
    }

    await this.save();
    return this;
};

cartSchema.methods.updateItemQuantity = async function (this: ICart, itemId: string | Types.ObjectId, quantity: number) {
    const item = (this.items as any).id(itemId);
    if (!item) {
        throw new Error('Item not found in cart');
    }

    if (quantity <= 0) {
        item.deleteOne();
    } else {
        item.quantity = quantity;
    }

    await this.save();
    return this;
};

cartSchema.methods.removeItem = async function (this: ICart, itemId: string | Types.ObjectId) {
    const item = (this.items as any).id(itemId);
    if (item) {
        item.deleteOne();
        await this.save();
    }
    return this;
};

cartSchema.methods.clear = async function (this: ICart) {
    this.items = [] as any;
    await this.save();
    return this;
};

// Statics
cartSchema.statics.getOrCreate = async function (userId: string | Types.ObjectId) {
    let cart = await this.findOne({ user: userId }).populate({
        path: 'items.product',
        select: 'name slug price comparePrice images stock variants isActive',
    });

    if (!cart) {
        cart = await this.create({ user: userId, items: [] });
    }

    return cart;
};

const Cart = mongoose.model<ICart, ICartModel>('Cart', cartSchema);

export default Cart;
