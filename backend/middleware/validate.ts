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
  oneOf,
  ValidationChain,
} from "express-validator";
import AppError from "../utils/AppError";
import { MAX_SIZE_LENGTH, MAX_COLOR_LENGTH, AGE_GROUPS, PRODUCT_GENDERS } from "../utils/constants";
import { FESTIVAL_KEYS, PALETTE_KEYS } from "../utils/festivals";
import { canonicalDistrict, findDistrict, PROVINCE_NAMES } from "../utils/nepal";

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

// One rule for every new password (register, reset, change); the web and mobile forms match it
const passwordRule = (field: string) =>
  body(field)
    .isString()
    .withMessage("Password is required")
    .isLength({ min: 6, max: 128 })
    .withMessage("Password must be 6 to 128 characters")
    .matches(/[a-zA-Z]/)
    .withMessage("Password must contain at least one letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number");

const registerValidator: (ValidationChain | RequestHandler)[] = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  passwordRule("password"),
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
  body("password").isString().notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

const googleAuthValidator: (ValidationChain | RequestHandler)[] = [
  body("idToken")
    .isString()
    .withMessage("Google sign-in token is required")
    .isLength({ min: 1, max: 4096 })
    .withMessage("Google sign-in token is required"),
  handleValidationErrors,
];

// ---------- Two-step login (admins) ----------

const challengeTokenRule = () =>
  body("challengeToken")
    .isString()
    .withMessage("Enter your email and password again")
    .isLength({ min: 1, max: 2048 })
    .withMessage("Enter your email and password again");

const totpCodeRule = (field: string) =>
  body(field)
    .customSanitizer((value) => (typeof value === "string" ? value.replace(/\s+/g, "") : value))
    .matches(/^\d{6}$/)
    .withMessage("Enter the 6-digit code from your authenticator app");

const rememberDeviceRule = () =>
  body("rememberDevice").optional().isBoolean({ strict: true }).withMessage("rememberDevice must be true or false");

/** An authenticator code, or a backup code instead */
const twoFactorVerifyValidator: (ValidationChain | RequestHandler)[] = [
  challengeTokenRule(),
  oneOf(
    [
      totpCodeRule("code"),
      body("backupCode")
        .isString()
        .customSanitizer((value) => (typeof value === "string" ? value.toUpperCase().replace(/[^0-9A-Z]/g, "") : value))
        .isLength({ min: 10, max: 10 }),
    ],
    { message: "Enter the 6-digit code from your app, or a backup code" },
  ),
  rememberDeviceRule(),
  handleValidationErrors,
];

const twoFactorSetupValidator: (ValidationChain | RequestHandler)[] = [challengeTokenRule(), handleValidationErrors];

const twoFactorEnableValidator: (ValidationChain | RequestHandler)[] = [
  challengeTokenRule(),
  totpCodeRule("code"),
  rememberDeviceRule(),
  handleValidationErrors,
];

/** Signed-in admin confirms with a current code */
const twoFactorCodeValidator: (ValidationChain | RequestHandler)[] = [totpCodeRule("code"), handleValidationErrors];

/** Moving to a new phone: the current app's code, then the new app's */
const twoFactorReplaceValidator: (ValidationChain | RequestHandler)[] = [
  oneOf([totpCodeRule("code"), totpCodeRule("newCode")], {
    message: "Enter the 6-digit code from your authenticator app",
  }),
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

const newPasswordRule = () => passwordRule("newPassword");

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
    .withMessage("Variant color is required")
    .isLength({ max: MAX_COLOR_LENGTH })
    .withMessage(`Colour names cannot exceed ${MAX_COLOR_LENGTH} characters`),
  body("variants.*.price")
    .exists({ values: "null" })
    .withMessage("Every size needs a price")
    .isFloat({ gt: 0 })
    .withMessage("Variant prices must be more than 0"),
  body("variants.*.comparePrice")
    .optional({ values: "null" })
    .isFloat({ min: 0 })
    .withMessage("Variant compare price must be a positive number"),
  body("variants.*.stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Variant stock must be a non-negative integer"),
  body("variants.*.sku")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 50 })
    .withMessage("Variant SKU cannot exceed 50 characters"),
  // Option order and colour swatches
  body("sizes").optional().isArray().withMessage("Sizes must be a list"),
  body("sizes.*")
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: MAX_SIZE_LENGTH })
    .withMessage(`Sizes cannot exceed ${MAX_SIZE_LENGTH} characters`),
  body("colors").optional().isArray().withMessage("Colours must be a list"),
  body("colors.*.name")
    .isString()
    .withMessage("Every colour needs a name")
    .trim()
    .notEmpty()
    .withMessage("Every colour needs a name")
    .isLength({ max: MAX_COLOR_LENGTH })
    .withMessage(`Colour names cannot exceed ${MAX_COLOR_LENGTH} characters`),
  body("colors.*.hex")
    .optional({ values: "falsy" })
    .matches(/^#[0-9a-f]{6}$/i)
    .withMessage("Swatch colours look like #c1847b"),
];

/** True when the request creates/keeps variants (then the base price is derived) */
const sendsVariants = (req: { body?: { variants?: unknown } }): boolean =>
  Array.isArray(req.body?.variants) && req.body.variants.length > 0;

// Photo order/colour/alt text for existing photos (edit form)
const imageUpdateRules = (): ValidationChain[] => [
  body("images").optional().isArray().withMessage("Images must be a list"),
  body("images.*._id").isMongoId().withMessage("Invalid photo id"),
  body("images.*.color")
    .optional({ values: "null" })
    .isString()
    .isLength({ max: MAX_COLOR_LENGTH })
    .withMessage("Invalid photo colour"),
  body("images.*.alt")
    .optional({ values: "null" })
    .isString()
    .isLength({ max: 150 })
    .withMessage("Alt text cannot exceed 150 characters"),
  body("images.*.isPrimary").optional().isBoolean().withMessage("isPrimary must be true or false"),
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
  // With variants the price comes from them (cheapest size)
  body("price")
    .if((_value: unknown, { req }: { req: { body?: { variants?: unknown } } }) => !sendsVariants(req))
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ gt: 0 })
    .withMessage("Price must be more than 0"),
  body("price").optional({ values: "null" }).isFloat({ min: 0 }).withMessage("Price must be a positive number"),
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
  ...imageUpdateRules(),
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

/**
 * District of a delivery address: must be in the address's province (which
 * decides the shipping rate) and is stored in its standard spelling, so
 * "kathmandu", "KTM" or "Kathmandu District" all become "Kathmandu".
 */
const districtInProvince = (path: string, provincePath: string): ValidationChain => {
  const provinceOf = (req: unknown): number =>
    Number(provincePath.split(".").reduce<any>((value, key) => value?.[key], (req as Request).body));
  return body(path)
    .trim()
    .notEmpty()
    .withMessage("District is required")
    .bail()
    .isLength({ max: 100 })
    .custom((value, { req }) => {
      const province = provinceOf(req);
      if (canonicalDistrict(province, value)) return true;
      const name = PROVINCE_NAMES[province];
      throw new Error(name ? `"${value}" isn't a district in ${name} Province. Choose one of its districts.` : "Choose a province, then a district");
    })
    .customSanitizer((value, { req }) => canonicalDistrict(provinceOf(req), value) ?? value);
};

/** POST /orders/shipping-quote */
const shippingQuoteValidator: (ValidationChain | RequestHandler)[] = [
  districtInProvince("district", "province"),
  body("province").isInt({ min: 1, max: 7 }).withMessage("Province must be between 1 and 7").toInt(),
  // Free-delivery areas can be a single town
  body("city").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }),
  handleValidationErrors,
];

// =============== ADMIN ORDER / USER ACTIONS ===============

/** POST /admin/orders/:id/refund */
const recordRefundValidator: (ValidationChain | RequestHandler)[] = [
  body("reference").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }).withMessage("Reference can be at most 100 characters"),
  body("note").optional({ values: "falsy" }).isString().trim().isLength({ max: 500 }).withMessage("Note can be at most 500 characters"),
  handleValidationErrors,
];

/** POST /admin/payments/cod-collected */
const codCollectedValidator: (ValidationChain | RequestHandler)[] = [
  body("orderId").isMongoId().withMessage("A valid order id is required"),
  handleValidationErrors,
];

/** PUT /admin/orders/:id/note */
const adminNoteValidator: (ValidationChain | RequestHandler)[] = [
  body("note").optional({ values: "null" }).isString().trim().isLength({ max: 1000 }).withMessage("Note can be at most 1000 characters"),
  handleValidationErrors,
];

/** PUT /admin/categories/:id: only these fields can change */
const updateCategoryValidator: (ValidationChain | RequestHandler)[] = [
  body().custom((value) => {
    const allowed = ["name", "description", "parent", "order", "isActive"];
    const extra = Object.keys(value || {}).filter((key) => !allowed.includes(key));
    if (extra.length) throw new Error(`These fields can't be changed here: ${extra.join(", ")}`);
    return true;
  }),
  body("name").optional().isString().trim().notEmpty().withMessage("Name can't be empty").isLength({ max: 100 }),
  body("description").optional({ values: "null" }).isString().trim().isLength({ max: 500 }),
  body("parent")
    .optional({ values: "falsy" })
    .isMongoId()
    .withMessage("Parent must be a category"),
  body("order").optional().isInt({ min: 0, max: 10000 }).withMessage("Order must be a whole number").toInt(),
  body("isActive").optional().isBoolean().withMessage("isActive must be true or false").toBoolean(),
  handleValidationErrors,
];

/** PUT /admin/users/:id/status */
const userStatusValidator: (ValidationChain | RequestHandler)[] = [
  body("isActive").isBoolean({ strict: true }).withMessage("isActive must be true or false").toBoolean(true),
  handleValidationErrors,
];

/** PUT /admin/users/:id/role */
const userRoleValidator: (ValidationChain | RequestHandler)[] = [
  body("role").isIn(["customer", "admin"]).withMessage("Role must be customer or admin"),
  handleValidationErrors,
];

const MAX_SHIPPING_AMOUNT = 100000;
const MAX_FREE_AREAS = 50;

/** PUT /admin/shipping */
const shippingSettingsValidator: (ValidationChain | RequestHandler)[] = [
  body("freeShippingThreshold")
    .isInt({ min: 0, max: 10_000_000 })
    .withMessage("Free-shipping threshold must be a whole amount of 0 or more")
    .toInt(),
  body("valleyRate")
    .isInt({ min: 0, max: MAX_SHIPPING_AMOUNT })
    .withMessage("Kathmandu Valley rate must be a whole amount of 0 or more")
    .toInt(),
  body("provinceRates")
    .custom((rates) => {
      if (!rates || typeof rates !== "object" || Array.isArray(rates)) throw new Error("Give a rate for each province");
      for (const province of Object.keys(PROVINCE_NAMES)) {
        const rate = rates[province];
        if (!Number.isInteger(Number(rate)) || rate === "" || rate === null || Number(rate) < 0 || Number(rate) > MAX_SHIPPING_AMOUNT) {
          throw new Error(`${PROVINCE_NAMES[Number(province)]} Province needs a whole amount of 0 or more`);
        }
      }
      return true;
    })
    .bail()
    .customSanitizer((rates) =>
      Object.fromEntries(Object.keys(PROVINCE_NAMES).map((province) => [Number(province), Number(rates[province])])),
    ),
  body("freeAreas")
    .isArray({ max: MAX_FREE_AREAS })
    .withMessage(`Up to ${MAX_FREE_AREAS} free-delivery areas`)
    .bail()
    .custom((areas: unknown[]) => {
      const seen = new Set<string>();
      for (const area of areas as { district?: unknown; city?: unknown }[]) {
        const found = findDistrict(String(area?.district ?? ""));
        if (!found) throw new Error(`"${area?.district ?? ""}" isn't a district of Nepal`);
        const city = typeof area.city === "string" ? area.city.trim() : "";
        if (city.length > 100) throw new Error("Town names can be at most 100 characters");
        const key = `${found.district}|${city.toLowerCase()}`;
        if (seen.has(key)) throw new Error(`${found.district}${city ? ` (${city})` : ""} is listed twice`);
        seen.add(key);
      }
      return true;
    })
    .bail()
    .customSanitizer((areas: { district: string; city?: string }[]) =>
      areas.map((area) => {
        const city = typeof area.city === "string" ? area.city.trim() : "";
        return { district: findDistrict(area.district)!.district, ...(city ? { city } : {}) };
      }),
    ),
  handleValidationErrors,
];

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
  districtInProvince("shippingAddress.district", "shippingAddress.province"),
  body("shippingAddress.province")
    .isInt({ min: 1, max: 7 })
    .withMessage("Province must be between 1 and 7")
    // Shipping cost compares the province as a number ("3" would miss the valley rate)
    .toInt(),
  body("paymentMethod")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(["cod", "esewa", "khalti"])
    .withMessage("Invalid payment method"),
  body("customerNotes")
    .optional({ values: "null" })
    .isString()
    .isLength({ max: 500 })
    .withMessage("Order notes can be at most 500 characters"),
  handleValidationErrors,
];

const orderIdBodyValidator: (ValidationChain | RequestHandler)[] = [
  body("orderId").isMongoId().withMessage("Invalid order ID"),
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

// =============== VISITOR ANALYTICS ===============

/** POST /analytics/events: a batch from the storefront tracker (utils/analytics.ts) */
const analyticsEventsValidator: (ValidationChain | RequestHandler)[] = [
  body("visitor").isUUID().withMessage("Invalid visitor id"),
  body("session").isUUID().withMessage("Invalid session id"),
  body("referrer").optional().isString().isLength({ max: 500 }),
  body(["utm.source", "utm.medium", "utm.campaign"]).optional().isString().isLength({ max: 100 }),
  body("clickIds").optional().isArray({ max: 5 }),
  body("clickIds.*").optional().isIn(["fbclid", "igshid", "gclid"]),
  body("events").isArray({ min: 1, max: 25 }).withMessage("Send 1 to 25 events"),
  body("events.*.type").isIn([
    "page_view",
    "product_view",
    "search",
    "add_to_cart",
    "checkout_start",
    "order_placed",
  ]),
  body("events.*.path").optional().isString().isLength({ max: 300 }),
  body("events.*.product").optional().isMongoId(),
  body("events.*.order").optional().isMongoId(),
  body("events.*.query").optional().isString().isLength({ max: 100 }),
  body("events.*.results").optional().isInt({ min: 0, max: 100000 }).toInt(),
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

/**
 * Campaign create/update. Shapes only; date order, discount limits, scope and
 * overlap rules live in campaignService (they depend on other fields/campaigns).
 */
const campaignValidator = (isCreate: boolean): (ValidationChain | RequestHandler)[] => {
  const required = (chain: ValidationChain) => (isCreate ? chain : chain.optional());
  return [
    body("name").optional().trim().isLength({ min: 2, max: 80 }).withMessage("Name must be 2-80 characters"),
    body("festival").optional().isIn(FESTIVAL_KEYS).withMessage("Unknown festival"),
    body("palette").optional().isIn(PALETTE_KEYS).withMessage("Unknown colour palette"),
    body("headline").optional().trim().isLength({ max: 80 }).withMessage("Headline cannot exceed 80 characters"),
    body("subheadline").optional().trim().isLength({ max: 160 }).withMessage("Subheading cannot exceed 160 characters"),
    body("greeting").optional().trim().isLength({ max: 80 }).withMessage("Greeting cannot exceed 80 characters"),
    body("emoji").optional().trim().isLength({ max: 16 }),
    body("ctaLabel").optional().trim().isLength({ max: 30 }).withMessage("Button text cannot exceed 30 characters"),
    body("showPopup").optional().isBoolean().withMessage("showPopup must be true or false").toBoolean(),
    required(body("startsAt").isISO8601().withMessage("Start date is required")),
    required(body("endsAt").isISO8601().withMessage("End date is required")),
    body("status").optional().isIn(["draft", "published"]),
    body("sale.type").optional().isIn(["none", "percent", "fixed"]),
    body("sale.value").optional().isFloat({ min: 0, max: 100000 }).withMessage("Invalid discount"),
    body("sale.scope").optional().isIn(["all", "categories", "products"]),
    body(["sale.categories", "sale.products", "sale.excludeProducts"]).optional().isArray({ max: 500 }),
    body(["sale.categories.*", "sale.products.*", "sale.excludeProducts.*"]).optional().isMongoId(),
    body("notify.pushOnLaunch").optional().isBoolean(),
    handleValidationErrors,
  ];
};

export {
  campaignValidator,
  handleValidationErrors,
  registerValidator,
  loginValidator,
  googleAuthValidator,
  twoFactorVerifyValidator,
  twoFactorSetupValidator,
  twoFactorEnableValidator,
  twoFactorCodeValidator,
  twoFactorReplaceValidator,
  forgotPasswordValidator,
  verifyResetOtpValidator,
  resetPasswordValidator,
  changePasswordValidator,
  createProductValidator,
  updateProductValidator,
  createCategoryValidator,
  createOrderValidator,
  shippingQuoteValidator,
  shippingSettingsValidator,
  recordRefundValidator,
  codCollectedValidator,
  userStatusValidator,
  userRoleValidator,
  adminNoteValidator,
  updateCategoryValidator,
  addToCartValidator,
  updateCartItemValidator,
  createReviewValidator,
  contactValidator,
  subscribeValidator,
  analyticsEventsValidator,
  updateProfileValidator,
  createAddressValidator,
  updateAddressValidator,
  mongoIdValidator,
  orderIdBodyValidator,
  paginationValidator,
};
