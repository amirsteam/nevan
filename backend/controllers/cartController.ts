/**
 * Cart Controller
 * Handles HTTP requests for shopping cart
 */
import { Request, Response } from 'express';
import * as cartService from '../services/cartService';
import asyncHandler from '../utils/asyncHandler';

/**
 * @desc    Get user's cart
 * @route   GET /api/v1/cart
 * @access  Private
 */
const getCart = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) {
        const cart = await cartService.getCart((req.user as any)._id);
    
        res.status(200).json({
            status: 'success',
            data: { cart },
        });
    }
});

/**
 * @desc    Add item to cart
 * @route   POST /api/v1/cart/items
 * @access  Private
 */
const addToCart = asyncHandler(async (req: Request, res: Response) => {
    const { productId, quantity, variantId } = req.body;
    if (req.user) {
        const cart = await cartService.addToCart(
            (req.user as any)._id,
            productId,
            quantity,
            variantId
        );
    
        res.status(200).json({
            status: 'success',
            message: 'Item added to cart',
            data: { cart },
        });
    }
});

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/v1/cart/items/:itemId
 * @access  Private
 */
const updateCartItem = asyncHandler(async (req: Request, res: Response) => {
    const { quantity } = req.body;
    if (req.user) {
        const cart = await cartService.updateCartItem(
            (req.user as any)._id,
            req.params.itemId,
            quantity
        );
    
        res.status(200).json({
            status: 'success',
            message: 'Cart updated',
            data: { cart },
        });
    }
});

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/v1/cart/items/:itemId
 * @access  Private
 */
const removeFromCart = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) {
        const cart = await cartService.removeFromCart(
            (req.user as any)._id,
            req.params.itemId
        );
    
        res.status(200).json({
            status: 'success',
            message: 'Item removed from cart',
            data: { cart },
        });
    }
});

/**
 * @desc    Clear cart
 * @route   DELETE /api/v1/cart
 * @access  Private
 */
const clearCart = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) {
        const cart = await cartService.clearCart((req.user as any)._id);
    
        res.status(200).json({
            status: 'success',
            message: 'Cart cleared',
            data: { cart },
        });
    }
});

export {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
};
