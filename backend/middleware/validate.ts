/**
 * Validation Middleware
 * Uses express-validator for request validation
 */
import { Request, Response, NextFunction, RequestHandler } from "express";
import {
  validationResult,
  body,
  param,
  query,
  ValidationChain,
} from "express-validator";
import AppError from "../utils/AppError";
import { MAX_SIZE_LENGTH, AGE_GROUPS, PRODUCT_GENDERS } from "../utils/constants";

interface ValidationError {
  field: string;
  message: string;
}

/**
 * Handle validation errors
 * Middleware to check for validation errors and return them
 */
const handleValidationErrors: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages: ValidationError[] = errors.array().map((err: any) => ({
      field: err.path,
      message: err.msg,
    }));

    // Lead with the first problem so clients that only show `message` are still specific
    res.status(400).json({
      status: "fail",
      message: errorMessages[0]?.message || "Validation failed",
      errors: errorMessages,
    });
    return;
  }

  next();
};

// =============== AUTH VALIDATORS ===============

const registerValidator: (ValidationChain | RequestHandler)[] = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 50 })
    .withMessage("Name cannot exceed 50 characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("phone")
    .optional({ checkFalsy: true } as any)
    .matches(/^(\+?977)?[0-9]{10}$/)
    .withMessage("Please provide a valid Nepali phone number"),
  handleValidationErrors,
];

const loginValidator: (ValidationChain | RequestHandler)[] = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

// Email is normalized exactly like register/login so lookups match stored addresses
const resetEmailRule = () =>
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail();

const resetOtpRule = () =>
  body("otp")
    .isString()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Reset code must be 6 digits");

const newPasswordRule = () =>
  body("newPassword")
    .isString()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters");

const forgotPasswordValidator: (ValidationChain | RequestHandler)[] = [
  resetEmailRule(),
  handleValidationErrors,
];

const verifyResetOtpValidator: (ValidationChain | RequestHandler)[] = [
  resetEmailRule(),
  resetOtpRule(),
  handleValidationErrors,
];

const resetPasswordValidator: (ValidationChain | RequestHandler)[] = [
  resetEmailRule(),
  resetOtpRule(),
  newPasswordRule(),
  handleValidationErrors,
];

const changePasswordValidator: (ValidationChain | RequestHandler)[] = [
  body("currentPassword").isString().notEmpty().withMessage("Current password is required"),
  newPasswordRule(),
  handleValidationErrors,
];

// Variant rules shared by create and update. Sizes are free text (built-in
// suggestions or a custom size), so they are only trimmed and length-checked.
const variantRules = (): ValidationChain[] => [
  body("variants")
    .optional()
    .isArray()
    .withMessage("Variants must be an array")
    .custom((variants: { size?: unknown; color?: unknown }[]) => {
      const seen = new Set<string>();
      for (const v of variants) {
        const key = `${String(v?.size ?? "").trim().toLowerCase()}|${String(v?.color ?? "").trim().toLowerCase()}`;
        if (seen.has(key)) {
          throw new Error(`Duplicate variant: ${String(v?.size).trim()} / ${String(v?.color).trim()}`);
        }
        seen.add(key);
      }
      return true;
    }),
  body("variants.*.size")
    .isString()
    .withMessage("Variant size is required")
    .trim()
    .notEmpty()
    .withMessage("Variant size is required")
    .isLength({ max: MAX_SIZE_LENGTH })
    .withMessage(`Variant size cannot exceed ${MAX_SIZE_LENGTH} characters`),
  body("variants.*.color")
    .isString()
    .withMessage("Variant color is required")
    .trim()
    .notEmpty()
    .withMessage("Variant color is required"),
  body("variants.*.price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Variant price must be a positive number"),
  body("variants.*.stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Variant stock must be a non-negative integer"),
  body("variants.*.sku")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 50 })
    .withMessage("Variant SKU cannot exceed 50 characters"),
];

// Age/gender tags used by the storefront filters
const audienceRules = (): ValidationChain[] => [
  body("ageGroups")
    .optional()
    .isArray()
    .withMessage("Age groups must be a list"),
  body("ageGroups.*")
    .isIn([...AGE_GROUPS])
    .withMessage(`Age group must be one of: ${AGE_GROUPS.join(", ")}`),
  body("gender")
    .optional({ values: "falsy" })
    .isIn([...PRODUCT_GENDERS])
    .withMessage("Gender must be boy, girl or unisex"),
];

// =============== PRODUCT VALIDATORS ===============

const createProductValidator: (ValidationChain | RequestHandler)[] = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("comparePrice")
    .optional({ values: "null" })
    .isFloat({ min: 0 })
    .withMessage("Compare price must be a positive number"),
  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isMongoId()
    .withMessage("Invalid category ID"),
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("sku")
    .optional({ values: "null" })
    .trim()
    .isLength({ max: 50 })
    .withMessage("SKU cannot exceed 50 characters"),
  ...variantRules(),
  ...audienceRules(),
  handleValidationErrors,
];

const updateProductValidator: (ValidationChain | RequestHandler)[] = [
  body("name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("category").optional().isMongoId().withMessage("Invalid category ID"),
  body("comparePrice")
    .optional({ values: "null" })
    .isFloat({ min: 0 })
    .withMessage("Compare price must be a positive number"),
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("sku")
    .optional({ values: "null" })
    .trim()
    .isLength({ max: 50 })
    .withMessage("SKU cannot exceed 50 characters"),
  ...variantRules(),
  ...audienceRules(),
  handleValidationErrors,
];

// =============== CATEGORY VALIDATORS ===============

const createCategoryValidator: (ValidationChain | RequestHandler)[] = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ max: 50 })
    .withMessage("Name cannot exceed 50 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
  body("parent")
    .optional({ nullable: true } as any)
    .isMongoId()
    .withMessage("Invalid parent category ID"),
  handleValidationErrors,
];

// =============== ORDER VALIDATORS ===============

const createOrderValidator: (ValidationChain | RequestHandler)[] = [
  body("shippingAddress")
    .notEmpty()
    .withMessage("Shipping address is required"),
  body("shippingAddress.name")
    .trim()
    .notEmpty()
    .withMessage("Recipient name is required"),
  body("shippingAddress.phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^(\+?977)?[0-9]{10}$/)
    .withMessage("Please provide a valid Nepali phone number"),
  body("shippingAddress.street")
    .trim()
    .notEmpty()
    .withMessage("Street address is required"),
  body("shippingAddress.city")
    .trim()
    .notEmpty()
    .withMessage("City is required"),
  body("shippingAddress.district")
    .trim()
    .notEmpty()
    .withMessage("District is required"),
  body("shippingAddress.province")
    .isInt({ min: 1, max: 7 })
    .withMessage("Province must be between 1 and 7"),
  body("paymentMethod")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(["cod", "esewa", "khalti"])
    .withMessage("Invalid payment method"),
  handleValidationErrors,
];

// =============== CART VALIDATORS ===============

const addToCartValidator: (ValidationChain | RequestHandler)[] = [
  body("productId")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid product ID"),
  body("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
  body("selectedVariants")
    .optional()
    .isArray()
    .withMessage("Selected variants must be an array"),
  handleValidationErrors,
];

const updateCartItemValidator: (ValidationChain | RequestHandler)[] = [
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a non-negative integer"),
  handleValidationErrors,
];

// =============== REVIEW VALIDATORS ===============

const createReviewValidator: (ValidationChain | RequestHandler)[] = [
  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("title")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Title cannot exceed 100 characters"),
  body("comment")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Comment cannot exceed 1000 characters"),
  handleValidationErrors,
];

// =============== ACCOUNT VALIDATORS ===============

const NEPALI_PHONE = /^(\+?977)?[0-9]{10}$/;

const updateProfileValidator: (ValidationChain | RequestHandler)[] = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  body("phone")
    .optional({ values: "falsy" })
    .customSanitizer((value) => String(value).replace(/[\s-]/g, ""))
    .matches(NEPALI_PHONE)
    .withMessage("Please provide a valid Nepali phone number"),
  handleValidationErrors,
];

const addressValidator = (partial: boolean): (ValidationChain | RequestHandler)[] => {
  const field = (name: string) => (partial ? body(name).optional() : body(name));
  return [
    body("label").optional({ values: "falsy" }).trim().isLength({ max: 30 }).withMessage("Label cannot exceed 30 characters"),
    field("name").trim().notEmpty().withMessage("Recipient name is required").isLength({ max: 100 }),
    field("phone")
      .customSanitizer((value) => String(value ?? "").replace(/[\s-]/g, ""))
      .matches(NEPALI_PHONE)
      .withMessage("Please provide a valid Nepali phone number"),
    field("street").trim().notEmpty().withMessage("Street address is required").isLength({ max: 200 }),
    field("city").trim().notEmpty().withMessage("City is required").isLength({ max: 100 }),
    field("district").trim().notEmpty().withMessage("District is required").isLength({ max: 100 }),
    field("province").isInt({ min: 1, max: 7 }).withMessage("Province must be between 1 and 7").toInt(),
    body("landmark").optional({ values: "falsy" }).trim().isLength({ max: 200 }),
    body("isDefault").optional().isBoolean().withMessage("isDefault must be true or false").toBoolean(),
    handleValidationErrors,
  ];
};

const createAddressValidator = addressValidator(false);
const updateAddressValidator = addressValidator(true);

// =============== CONTACT / NEWSLETTER VALIDATORS ===============

const contactValidator: (ValidationChain | RequestHandler)[] = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  resetEmailRule(),
  body("phone")
    .optional({ values: "falsy" })
    .trim()
    .matches(/^(\+?977)?[0-9]{7,10}$/)
    .withMessage("Please provide a valid phone number"),
  body("subject")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 150 })
    .withMessage("Subject cannot exceed 150 characters"),
  body("message")
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Message must be between 10 and 2000 characters"),
  handleValidationErrors,
];

const subscribeValidator: (ValidationChain | RequestHandler)[] = [
  resetEmailRule(),
  body("source")
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage("Source cannot exceed 30 characters"),
  handleValidationErrors,
];

// =============== COMMON VALIDATORS ===============

const mongoIdValidator = (
  paramName: string = "id",
): (ValidationChain | RequestHandler)[] => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName}`),
  handleValidationErrors,
];

const paginationValidator: (ValidationChain | RequestHandler)[] = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  handleValidationErrors,
];

export {
  handleValidationErrors,
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  verifyResetOtpValidator,
  resetPasswordValidator,
  changePasswordValidator,
  createProductValidator,
  updateProductValidator,
  createCategoryValidator,
  createOrderValidator,
  addToCartValidator,
  updateCartItemValidator,
  createReviewValidator,
  contactValidator,
  subscribeValidator,
  updateProfileValidator,
  createAddressValidator,
  updateAddressValidator,
  mongoIdValidator,
  paginationValidator,
};
