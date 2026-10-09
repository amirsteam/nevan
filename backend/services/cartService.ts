/**
 * Cart Service
 * Handles shopping cart business logic
 */
import Cart, { ICart } from "../models/Cart";
import Product from "../models/Product";
import AppError from "../utils/AppError";
import { getLiveCampaign } from "./campaignService";
import { priceFor } from "../utils/campaignPricing";

/** Live campaign pricing for cart totals (null when no sale is running) */
const livePricing = async () => (await getLiveCampaign())?.pricing ?? null;

interface CartResult {
  items: any[];
  subtotal: number;
  savings: number;
  itemCount: number;
}

/**
 * Get user's cart with populated products
 */
const getCart = async (userId: string): Promise<ICart> => {
  const cart = await (Cart as any).getOrCreate(userId);
  return cart.calculateTotal(await livePricing());
};

/**
 * Add item to cart
 */
const addToCart = async (
  userId: string,
  productId: string,
  quantity: number = 1,
  variantId: string | null = null,
): Promise<ICart> => {
  // Verify product exists and is active - only fetch needed fields
  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  }).select("name price stock variants isActive category");
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  let price: number;
  let variant: any = null;

  // Get or create cart
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
  }

  // Adding to a line already in the cart: the combined quantity must be in stock
  const inCart =
    (cart as any).items.find(
      (item: any) =>
        String(item.product) === String(productId) &&
        String(item.variantId ?? "") === String(variantId ?? ""),
    )?.quantity ?? 0;
  const wanted = inCart + quantity;
  const alreadyNote = inCart > 0 ? ` (you already have ${inCart} in your cart)` : "";

  // If product has variants, variantId is required
  if ((product as any).variants && (product as any).variants.length > 0) {
    if (!variantId) {
      throw new AppError("Please select a variant (size/color)", 400);
    }

    variant = (product as any).variants.id(variantId);
    if (!variant) {
      throw new AppError("Selected variant not found", 400);
    }

    // Check variant stock
    if (variant.stock < wanted) {
      throw new AppError(
        `Only ${variant.stock} items available for ${variant.size} - ${variant.color}${alreadyNote}`,
        400,
      );
    }

    price = variant.price;
  } else {
    // No variants - use base price and stock
    if ((product as any).stock < wanted) {
      throw new AppError(
        inCart > 0 ? `Only ${(product as any).stock} items available${alreadyNote}` : "Insufficient stock",
        400,
      );
    }
    price = (product as any).price;
  }

  // Remember the price shown when adding (the sale price during a campaign), so
  // the cart only flags a change when the price really changes later
  price = priceFor(product as any, variant, await livePricing()).price;
  await (cart as any).addItem(productId, quantity, variantId, price);

  // Return populated cart
  await cart.populate({
    path: "items.product",
    select: "name slug price comparePrice images stock variants isActive category",
  });

  return (cart as any).calculateTotal(await livePricing());
};

/**
 * Update cart item quantity
 */
const updateCartItem = async (
  userId: string,
  itemId: string,
  quantity: number,
): Promise<ICart> => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new AppError("Cart not found", 404);
  }

  const item = (cart as any).items.id(itemId);
  if (!item) {
    throw new AppError("Item not found in cart", 404);
  }

  // Check stock availability
  const product = await Product.findById(item.product);
  if (!product || !(product as any).isActive) {
    // Remove inactive product from cart
    await (cart as any).removeItem(itemId);
    throw new AppError("Product is no longer available", 400);
  }

  // Check stock based on variantId
  if (item.variantId) {
    const variant = (product as any).variants.id(item.variantId);
    if (!variant) {
      throw new AppError("Variant no longer available", 400);
    }
    if (variant.stock < quantity) {
      throw new AppError(
        `Only ${variant.stock} items available for ${variant.size} - ${variant.color}`,
        400,
      );
    }
  } else if ((product as any).stock < quantity) {
    throw new AppError(`Only ${(product as any).stock} items available`, 400);
  }

  await (cart as any).updateItemQuantity(itemId, quantity);

  await cart.populate({
    path: "items.product",
    select: "name slug price comparePrice images stock variants isActive category",
  });

  return (cart as any).calculateTotal(await livePricing());
};

/**
 * Remove item from cart
 */
const removeFromCart = async (
  userId: string,
  itemId: string,
): Promise<ICart> => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new AppError("Cart not found", 404);
  }

  await (cart as any).removeItem(itemId);

  await cart.populate({
    path: "items.product",
    select: "name slug price comparePrice images stock variants isActive category",
  });

  return (cart as any).calculateTotal(await livePricing());
};

/**
 * Clear cart
 */
const clearCart = async (userId: string): Promise<CartResult> => {
  const cart = await Cart.findOne({ user: userId });
  if (cart) {
    await (cart as any).clear();
  }
  return { items: [], subtotal: 0, savings: 0, itemCount: 0 };
};

export { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
