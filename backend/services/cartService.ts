/**
 * Cart Service
 * Handles shopping cart business logic
 */
import Cart, { ICart } from '../models/Cart';
import Product from '../models/Product';
import AppError from '../utils/AppError';

interface CartResult {
    items: any[];
    subtotal: number;
    itemCount: number;
}

/**
 * Get user's cart with populated products
 */
const getCart = async (userId: string): Promise<ICart> => {
    const cart = await (Cart as any).getOrCreate(userId);
    return cart.calculateTotal();
};

/**
 * Add item to cart
 */
const addToCart = async (
    userId: string,
    productId: string,
    quantity: number = 1,
    variantId: string | null = null
): Promise<ICart> => {
    // Verify product exists and is active
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
        throw new AppError('Product not found', 404);
    }

    let price: number;
    let variant: any = null;

    // If product has variants, variantId is required
    if ((product as any).variants && (product as any).variants.length > 0) {
        if (!variantId) {
            throw new AppError('Please select a variant (size/color)', 400);
        }
        
        variant = (product as any).variants.id(variantId);
        if (!variant) {
            throw new AppError('Selected variant not found', 400);
        }

        // Check variant stock
        if (variant.stock < quantity) {
            throw new AppError(`Only ${variant.stock} items available for ${variant.size} - ${variant.color}`, 400);
        }

        price = variant.price;
    } else {
        // No variants - use base price and stock
        if ((product as any).stock < quantity) {
            throw new AppError('Insufficient stock', 400);
        }
        price = (product as any).price;
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
        cart = new Cart({ user: userId, items: [] });
    }

    await (cart as any).addItem(productId, quantity, variantId, price);

    // Return populated cart
    await cart.populate({
        path: 'items.product',
        select: 'name slug price comparePrice images stock variants isActive',
    });

    return (cart as any).calculateTotal();
};

/**
 * Update cart item quantity
 */
const updateCartItem = async (
    userId: string,
    itemId: string,
    quantity: number
): Promise<ICart> => {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
        throw new AppError('Cart not found', 404);
    }

    const item = (cart as any).items.id(itemId);
    if (!item) {
        throw new AppError('Item not found in cart', 404);
    }

    // Check stock availability
    const product = await Product.findById(item.product);
    if (!product || !(product as any).isActive) {
        // Remove inactive product from cart
        await (cart as any).removeItem(itemId);
        throw new AppError('Product is no longer available', 400);
    }

    // Check stock based on variantId
    if (item.variantId) {
        const variant = (product as any).variants.id(item.variantId);
        if (!variant) {
            throw new AppError('Variant no longer available', 400);
        }
        if (variant.stock < quantity) {
            throw new AppError(`Only ${variant.stock} items available for ${variant.size} - ${variant.color}`, 400);
        }
    } else if ((product as any).stock < quantity) {
        throw new AppError(`Only ${(product as any).stock} items available`, 400);
    }

    await (cart as any).updateItemQuantity(itemId, quantity);

    await cart.populate({
        path: 'items.product',
        select: 'name slug price comparePrice images stock variants isActive',
    });

    return (cart as any).calculateTotal();
};

/**
 * Remove item from cart
 */
const removeFromCart = async (userId: string, itemId: string): Promise<ICart> => {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
        throw new AppError('Cart not found', 404);
    }

    await (cart as any).removeItem(itemId);

    await cart.populate({
        path: 'items.product',
        select: 'name slug price comparePrice images stock variants isActive',
    });

    return (cart as any).calculateTotal();
};

/**
 * Clear cart
 */
const clearCart = async (userId: string): Promise<CartResult> => {
    const cart = await Cart.findOne({ user: userId });
    if (cart) {
        await (cart as any).clear();
    }
    return { items: [], subtotal: 0, itemCount: 0 };
};

export {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
};
