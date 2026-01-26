/**
 * Validation Middleware
 * Uses express-validator for request validation
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { validationResult, body, param, query, ValidationChain } from 'express-validator';
import AppError from '../utils/AppError';

interface ValidationError {
    field: string;
    message: string;
}

/**
 * Handle validation errors
 * Middleware to check for validation errors and return them
 */
const handleValidationErrors: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages: ValidationError[] = errors.array().map((err: any) => ({
            field: err.path,
            message: err.msg,
        }));

        res.status(400).json({
            status: 'fail',
            message: 'Validation failed',
            errors: errorMessages,
        });
        return;
    }

    next();
};

// =============== AUTH VALIDATORS ===============

const registerValidator: (ValidationChain | RequestHandler)[] = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone')
        .optional({ checkFalsy: true } as any)
        .matches(/^(\+?977)?[0-9]{10}$/).withMessage('Please provide a valid Nepali phone number'),
    handleValidationErrors,
];

const loginValidator: (ValidationChain | RequestHandler)[] = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required'),
    handleValidationErrors,
];

// =============== PRODUCT VALIDATORS ===============

const createProductValidator: (ValidationChain | RequestHandler)[] = [
    body('name')
        .trim()
        .notEmpty().withMessage('Product name is required')
        .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('description')
        .trim()
        .notEmpty().withMessage('Description is required')
        .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
    body('price')
        .notEmpty().withMessage('Price is required')
        .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('comparePrice')
        .optional()
        .isFloat({ min: 0 }).withMessage('Compare price must be a positive number'),
    body('category')
        .notEmpty().withMessage('Category is required')
        .isMongoId().withMessage('Invalid category ID'),
    body('stock')
        .optional()
        .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('sku')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('SKU cannot exceed 50 characters'),
    handleValidationErrors,
];

const updateProductValidator: (ValidationChain | RequestHandler)[] = [
    body('name')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('price')
        .optional()
        .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category')
        .optional()
        .isMongoId().withMessage('Invalid category ID'),
    handleValidationErrors,
];

// =============== CATEGORY VALIDATORS ===============

const createCategoryValidator: (ValidationChain | RequestHandler)[] = [
    body('name')
        .trim()
        .notEmpty().withMessage('Category name is required')
        .isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    body('parent')
        .optional({ nullable: true } as any)
        .isMongoId().withMessage('Invalid parent category ID'),
    handleValidationErrors,
];

// =============== ORDER VALIDATORS ===============

const createOrderValidator: (ValidationChain | RequestHandler)[] = [
    body('shippingAddress')
        .notEmpty().withMessage('Shipping address is required'),
    body('shippingAddress.name')
        .trim()
        .notEmpty().withMessage('Recipient name is required'),
    body('shippingAddress.phone')
        .notEmpty().withMessage('Phone number is required')
        .matches(/^(\+?977)?[0-9]{10}$/).withMessage('Please provide a valid Nepali phone number'),
    body('shippingAddress.street')
        .trim()
        .notEmpty().withMessage('Street address is required'),
    body('shippingAddress.city')
        .trim()
        .notEmpty().withMessage('City is required'),
    body('shippingAddress.district')
        .trim()
        .notEmpty().withMessage('District is required'),
    body('shippingAddress.province')
        .isInt({ min: 1, max: 7 }).withMessage('Province must be between 1 and 7'),
    body('paymentMethod')
        .notEmpty().withMessage('Payment method is required')
        .isIn(['cod', 'esewa', 'khalti']).withMessage('Invalid payment method'),
    handleValidationErrors,
];

// =============== CART VALIDATORS ===============

const addToCartValidator: (ValidationChain | RequestHandler)[] = [
    body('productId')
        .notEmpty().withMessage('Product ID is required')
        .isMongoId().withMessage('Invalid product ID'),
    body('quantity')
        .optional()
        .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('selectedVariants')
        .optional()
        .isArray().withMessage('Selected variants must be an array'),
    handleValidationErrors,
];

const updateCartItemValidator: (ValidationChain | RequestHandler)[] = [
    body('quantity')
        .notEmpty().withMessage('Quantity is required')
        .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    handleValidationErrors,
];

// =============== REVIEW VALIDATORS ===============

const createReviewValidator: (ValidationChain | RequestHandler)[] = [
    body('rating')
        .notEmpty().withMessage('Rating is required')
        .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('title')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
    body('comment')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),
    handleValidationErrors,
];

// =============== COMMON VALIDATORS ===============

const mongoIdValidator = (paramName: string = 'id'): (ValidationChain | RequestHandler)[] => [
    param(paramName).isMongoId().withMessage(`Invalid ${paramName}`),
    handleValidationErrors,
];

const paginationValidator: (ValidationChain | RequestHandler)[] = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    handleValidationErrors,
];

export {
    handleValidationErrors,
    registerValidator,
    loginValidator,
    createProductValidator,
    updateProductValidator,
    createCategoryValidator,
    createOrderValidator,
    addToCartValidator,
    updateCartItemValidator,
    createReviewValidator,
    mongoIdValidator,
    paginationValidator,
};
