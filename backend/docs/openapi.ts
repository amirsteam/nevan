/**
 * OpenAPI 3 description of the REST API, served by Swagger UI at /api/v1/docs.
 * Keep this in sync when adding or changing routes in routes/*.ts.
 */

type Operation = Record<string, unknown>;

const ok = (description = "Success") => ({
  200: { description, content: { "application/json": { schema: { $ref: "#/components/schemas/Envelope" } } } },
});

const errors = {
  400: { $ref: "#/components/responses/BadRequest" },
  401: { $ref: "#/components/responses/Unauthorized" },
};

const json = (schema: Record<string, unknown>, required = true) => ({
  required,
  content: { "application/json": { schema } },
});

const pathParam = (name: string, description = "MongoDB ObjectId") => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type: "string" },
});

const pageParams = [
  { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
  { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
];

const op = (tag: string, summary: string, extra: Operation = {}, auth: "none" | "user" | "admin" = "user") => ({
  tags: [tag],
  summary: auth === "admin" ? `${summary} (admin)` : summary,
  ...(auth === "none" ? { security: [] } : {}),
  responses: { ...ok(), ...errors },
  ...extra,
});

const shippingAddress = {
  type: "object",
  required: ["name", "phone", "street", "city", "district", "province"],
  properties: {
    name: { type: "string" },
    phone: { type: "string", example: "9841234567" },
    street: { type: "string" },
    city: { type: "string" },
    district: { type: "string", example: "Kathmandu" },
    province: { type: "integer", minimum: 1, maximum: 7 },
    postalCode: { type: "string" },
  },
};

const variantSchema = {
  type: "object",
  required: ["size", "color", "price"],
  properties: {
    _id: { type: "string", description: "Existing variant id (update only)" },
    size: {
      type: "string",
      maxLength: 40,
      description: "A built-in size (see GET /admin/products/options) or any custom size",
      example: "3-6 Months",
    },
    color: { type: "string", maxLength: 30, description: "Matched to `colors` case-insensitively" },
    price: { type: "number", exclusiveMinimum: true, minimum: 0 },
    comparePrice: { type: "number", minimum: 0, nullable: true, description: "Ignored unless higher than price" },
    stock: { type: "integer", minimum: 0 },
    sku: { type: "string", maxLength: 50, nullable: true },
    image: {
      type: "string",
      nullable: true,
      readOnly: true,
      description: "Derived: the first photo tagged with this variant's colour (ignored in requests)",
    },
  },
};

const productBody = {
  type: "object",
  required: ["name", "description", "category"],
  description:
    "With variants, `price`/`comparePrice` are derived from the cheapest variant and `stock` is their total; " +
    "`ageGroups` follow the sizes when they're on the age scale. Without variants `price` (> 0) is required.",
  properties: {
    name: { type: "string", maxLength: 100 },
    description: { type: "string", maxLength: 2000 },
    shortDescription: { type: "string", maxLength: 200, nullable: true },
    price: { type: "number", minimum: 0, description: "Required (> 0) for products without variants" },
    comparePrice: { type: "number", minimum: 0, nullable: true },
    category: { type: "string" },
    stock: { type: "integer", minimum: 0, description: "Used when the product has no variants" },
    sku: { type: "string", maxLength: 50, nullable: true },
    isFeatured: { type: "boolean" },
    isActive: { type: "boolean" },
    material: { type: "string" },
    careInstructions: { type: "string" },
    ageRecommendation: { type: "string" },
    ageGroups: {
      type: "array",
      description: "Age bands used by the storefront age filter",
      items: { type: "string", enum: ["0-3 Months", "3-6 Months", "6-12 Months", "1-2 Years", "2-4 Years", "4-6 Years", "6-10 Years"] },
    },
    gender: { type: "string", enum: ["boy", "girl", "unisex"], nullable: true },
    metaTitle: { type: "string" },
    metaDescription: { type: "string" },
    variants: {
      type: "array",
      description: "Size/color combinations must be unique (case-insensitive)",
      items: variantSchema,
    },
    sizes: { type: "array", description: "Size display order (sizes not listed follow in age order)", items: { type: "string" } },
    colors: {
      type: "array",
      description: "Colour display order and swatches",
      items: {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string", maxLength: 30 }, hex: { type: "string", example: "#c1847b" } },
      },
    },
  },
};

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Nevan / BivanHandicraft API",
    version: "1.0.0",
    description:
      "REST API for the storefront, admin panel and mobile app.\n\n" +
      "**Auth:** send `Authorization: Bearer <accessToken>`. Access tokens are short-lived; " +
      "refresh them with `POST /auth/refresh-token`. Browsers receive the refresh token as an " +
      "httpOnly cookie; native apps (no `Origin` header) receive it in the response body and send it back in the body.\n\n" +
      "**Responses** use the envelope `{ status, message?, data, results?, pagination? }`.",
  },
  servers: [{ url: "/api/v1" }],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Auth" },
    { name: "Products" },
    { name: "Categories" },
    { name: "Reviews" },
    { name: "Cart" },
    { name: "Wishlist" },
    { name: "Orders" },
    { name: "Payments" },
    { name: "Notifications" },
    { name: "Chat" },
    { name: "Contact" },
    { name: "Campaigns" },
    { name: "Admin" },
    { name: "System" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Envelope: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["success", "fail", "error"] },
          message: { type: "string" },
          data: { type: "object" },
          results: { type: "integer" },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          currentPage: { type: "integer" },
          itemsPerPage: { type: "integer" },
          totalPages: { type: "integer" },
          totalItems: { type: "integer" },
          hasNextPage: { type: "boolean" },
          hasPrevPage: { type: "boolean" },
        },
      },
      Error: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["fail", "error"] },
          message: { type: "string" },
        },
      },
    },
    responses: {
      BadRequest: {
        description: "Validation error",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      Unauthorized: {
        description: "Missing, invalid or expired access token",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
    },
  },
  paths: {
    "/health": { get: op("System", "Health check", {}, "none") },

    // ---------------- Auth ----------------
    "/auth/register": {
      post: op("Auth", "Register", {
        requestBody: json({
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
            phone: { type: "string" },
          },
        }),
      }, "none"),
    },
    "/auth/login": {
      post: op("Auth", "Log in (failed attempts are rate limited)", {
        requestBody: json({
          type: "object",
          required: ["email", "password"],
          properties: { email: { type: "string", format: "email" }, password: { type: "string" } },
        }),
      }, "none"),
    },
    "/auth/refresh-token": {
      post: op("Auth", "Exchange a refresh token (cookie or body) for a new token pair", {
        requestBody: json({ type: "object", properties: { refreshToken: { type: "string" } } }, false),
      }, "none"),
    },
    "/auth/logout": {
      post: op("Auth", "End this session, or all sessions with allDevices", {
        requestBody: json({
          type: "object",
          properties: { refreshToken: { type: "string" }, allDevices: { type: "boolean" } },
        }, false),
      }, "none"),
    },
    "/auth/forgot-password": {
      post: op("Auth", "Email a 6-digit reset code", {
        requestBody: json({ type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } }),
      }, "none"),
    },
    "/auth/verify-reset-otp": {
      post: op("Auth", "Check a reset code (locked after 5 wrong attempts)", {
        requestBody: json({
          type: "object",
          required: ["email", "otp"],
          properties: { email: { type: "string" }, otp: { type: "string", pattern: "^\\d{6}$" } },
        }),
      }, "none"),
    },
    "/auth/reset-password": {
      post: op("Auth", "Set a new password with a reset code (ends all sessions)", {
        requestBody: json({
          type: "object",
          required: ["email", "otp", "newPassword"],
          properties: {
            email: { type: "string" },
            otp: { type: "string", pattern: "^\\d{6}$" },
            newPassword: { type: "string", minLength: 6 },
          },
        }),
      }, "none"),
    },
    "/auth/me": {
      get: op("Auth", "Current user"),
      put: op("Auth", "Update name and/or phone", {
        requestBody: json({
          type: "object",
          properties: { name: { type: "string", maxLength: 100 }, phone: { type: "string", example: "9841234567" } },
        }),
      }),
    },
    "/auth/addresses": {
      get: op("Auth", "Saved delivery addresses (default first)"),
      post: op("Auth", "Save an address (max 5; the first becomes the default)", {
        requestBody: json({
          ...shippingAddress,
          properties: {
            ...shippingAddress.properties,
            label: { type: "string", maxLength: 30, example: "Home" },
            landmark: { type: "string" },
            isDefault: { type: "boolean" },
          },
        }),
      }),
    },
    "/auth/addresses/{addressId}": {
      put: op("Auth", "Edit an address or make it the default", {
        parameters: [pathParam("addressId")],
        requestBody: json({
          type: "object",
          properties: { ...shippingAddress.properties, label: { type: "string" }, landmark: { type: "string" }, isDefault: { type: "boolean" } },
        }),
      }),
      delete: op("Auth", "Remove an address (another becomes the default)", { parameters: [pathParam("addressId")] }),
    },
    "/auth/change-password": {
      put: op("Auth", "Change password (ends all sessions)", {
        requestBody: json({
          type: "object",
          required: ["currentPassword", "newPassword"],
          properties: { currentPassword: { type: "string" }, newPassword: { type: "string", minLength: 6 } },
        }),
      }),
    },
    "/auth/push-token": {
      post: op("Auth", "Register an Expo push token", {
        requestBody: json({
          type: "object",
          required: ["token", "platform"],
          properties: {
            token: { type: "string", example: "ExponentPushToken[xxx]" },
            platform: { type: "string", enum: ["ios", "android", "web"] },
            deviceName: { type: "string" },
          },
        }),
      }),
      delete: op("Auth", "Remove an Expo push token", {
        requestBody: json({ type: "object", required: ["token"], properties: { token: { type: "string" } } }),
      }),
    },

    // ---------------- Catalog ----------------
    "/products": {
      get: op("Products", "List active products", {
        parameters: [
          ...pageParams,
          { name: "category", in: "query", description: "Category slug or id (includes subcategories)", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "minPrice", in: "query", schema: { type: "number" } },
          { name: "maxPrice", in: "query", schema: { type: "number" } },
          { name: "age", in: "query", description: "Age band (products tagged with it)", schema: { type: "string", enum: ["0-3 Months", "3-6 Months", "6-12 Months", "1-2 Years", "2-4 Years", "4-6 Years", "6-10 Years"] } },
          { name: "gender", in: "query", description: "boy/girl also include unisex products", schema: { type: "string", enum: ["boy", "girl", "unisex"] } },
          { name: "campaign", in: "query", description: "Campaign slug: only the products its sale/collection covers (sale page)", schema: { type: "string" } },
          {
            name: "ids",
            in: "query",
            description: "Comma-separated product ids (max 24; recently viewed). Inactive, deleted and malformed ids are skipped; results follow `sort`, not the id order",
            schema: { type: "string" },
          },
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["-createdAt", "newest", "createdAt", "price", "-price", "-ratings.average", "-soldCount"] },
          },
        ],
      }, "none"),
    },
    "/products/featured": { get: op("Products", "Featured products", {}, "none") },
    // While a campaign is live, product responses (list, featured, detail) carry
    // `sale: { price, originalPrice, percentOff, campaign: { slug, name, endsAt } }`
    // on discounted products and `salePrice` on discounted variants.
    "/products/{slug}": {
      get: op("Products", "Product by slug", { parameters: [pathParam("slug", "Product slug")] }, "none"),
    },
    "/products/{productId}/reviews": {
      get: op("Reviews", "Reviews for a product", { parameters: [pathParam("productId"), ...pageParams] }, "none"),
      post: op("Reviews", "Write a review (one per user and product)", {
        parameters: [pathParam("productId")],
        requestBody: json({
          type: "object",
          required: ["rating"],
          properties: { rating: { type: "integer", minimum: 1, maximum: 5 }, title: { type: "string" }, comment: { type: "string" } },
        }),
      }),
    },
    "/products/{productId}/reviews/{reviewId}": {
      delete: op("Reviews", "Delete own review", { parameters: [pathParam("productId"), pathParam("reviewId")] }),
    },
    "/categories": { get: op("Categories", "Active categories", {}, "none") },
    "/categories/all": { get: op("Categories", "Category tree", {}, "none") },
    "/categories/{slug}": {
      get: op("Categories", "Category by slug", { parameters: [pathParam("slug", "Category slug")] }, "none"),
    },

    // ---------------- Cart & wishlist ----------------
    "/cart": {
      get: op("Cart", "Current cart with live prices"),
      delete: op("Cart", "Empty the cart"),
    },
    "/cart/items": {
      post: op("Cart", "Add an item", {
        requestBody: json({
          type: "object",
          required: ["productId", "quantity"],
          properties: { productId: { type: "string" }, quantity: { type: "integer", minimum: 1 }, variantId: { type: "string" } },
        }),
      }),
    },
    "/cart/items/{itemId}": {
      put: op("Cart", "Change quantity", {
        parameters: [pathParam("itemId")],
        requestBody: json({ type: "object", required: ["quantity"], properties: { quantity: { type: "integer", minimum: 1 } } }),
      }),
      delete: op("Cart", "Remove an item", { parameters: [pathParam("itemId")] }),
    },
    "/wishlist": {
      get: op("Wishlist", "Wishlist products"),
      delete: op("Wishlist", "Clear wishlist"),
    },
    "/wishlist/{productId}": {
      post: op("Wishlist", "Add product", { parameters: [pathParam("productId")] }),
      delete: op("Wishlist", "Remove product", { parameters: [pathParam("productId")] }),
    },
    "/wishlist/{productId}/check": {
      get: op("Wishlist", "Is product in wishlist", { parameters: [pathParam("productId")] }),
    },

    // ---------------- Orders & payments ----------------
    "/orders": {
      post: op("Orders", "Place an order from the cart (prices and stock are checked server-side)", {
        requestBody: json({
          type: "object",
          required: ["shippingAddress", "paymentMethod"],
          properties: {
            shippingAddress,
            paymentMethod: { type: "string", enum: ["cod", "esewa", "khalti"] },
            customerNotes: { type: "string", maxLength: 500 },
          },
        }),
      }),
      get: op("Orders", "My orders", { parameters: [...pageParams, { name: "status", in: "query", schema: { type: "string" } }] }),
    },
    "/orders/{id}": { get: op("Orders", "My order", { parameters: [pathParam("id")] }) },
    "/orders/{id}/cancel": {
      post: op("Orders", "Cancel my order (restores stock)", {
        parameters: [pathParam("id")],
        requestBody: json({ type: "object", properties: { reason: { type: "string" } } }, false),
      }),
    },
    "/payments/methods": { get: op("Payments", "Enabled payment methods", {}, "none") },
    "/payments/initiate": {
      post: op(
        "Payments",
        "Start (or retry) payment for my pending, unpaid order; gateway must match the order's payment method. " +
          "A retry first asks the gateway about earlier attempts: { alreadyPaid: true } if one went through, " +
          "409 while the gateway is still confirming one. COD returns the record made when the order was placed.",
        {
          requestBody: json({
            type: "object",
            required: ["orderId", "gateway"],
            properties: { orderId: { type: "string" }, gateway: { type: "string", enum: ["cod", "esewa", "khalti"] } },
          }),
        },
      ),
    },
    "/payments/check-status": {
      post: op("Payments", "Ask the gateway whether my order's payment went through (marks it paid if so)", {
        requestBody: json({ type: "object", required: ["orderId"], properties: { orderId: { type: "string" } } }),
        responses: {
          200: {
            description:
              "{ orderId, orderNumber, status, paymentStatus, processing } — processing: the gateway is still confirming a payment",
          },
        },
      }),
    },
    "/payments/verify": {
      post: op("Payments", "Verify a gateway payment for my order (must match the initiated transaction and order total)", {
        requestBody: json({
          type: "object",
          required: ["orderId", "gateway", "callbackData"],
          properties: {
            orderId: { type: "string", description: "Order id or order number" },
            gateway: { type: "string", enum: ["esewa", "khalti"] },
            callbackData: {
              type: "object",
              description: "eSewa: { data: <base64 from redirect> }; Khalti: { pidx }",
            },
          },
        }),
      }),
    },
    "/payments/esewa/success": {
      get: op("Payments", "eSewa success redirect target (redirects to the storefront)", {
        parameters: [{ name: "data", in: "query", required: true, schema: { type: "string" } }],
        responses: {
          302: {
            description:
              "Redirect to /order-success (&payment=pending while eSewa is still confirming, &payment=duplicate when paid twice) " +
              "or /order-failed (&status=refund_required when the money arrived for a cancelled order)",
          },
        },
      }, "none"),
    },
    "/payments/esewa/failure": {
      get: op("Payments", "eSewa failure redirect target", { responses: { 302: { description: "Redirect to /order-failed" } } }, "none"),
    },
    "/payments/esewa/failure/{orderId}": {
      get: op("Payments", "eSewa failure/cancel redirect target for an order (redirects to /order-failed?orderId=…)", {
        parameters: [pathParam("orderId")],
        responses: { 302: { description: "Redirect to /order-failed" } },
      }, "none"),
    },
    "/payments/khalti/callback": {
      get: op("Payments", "Khalti return URL (redirects to the storefront)", {
        responses: { 302: { description: "Redirect to /order-success or /order-failed" } },
      }, "none"),
    },

    // ---------------- Notifications & chat ----------------
    "/notifications": { get: op("Notifications", "My notifications", { parameters: pageParams }) },
    "/notifications/unread-count": { get: op("Notifications", "Unread count") },
    "/notifications/read-all": { patch: op("Notifications", "Mark all read") },
    "/notifications/{id}/read": { patch: op("Notifications", "Mark one read", { parameters: [pathParam("id")] }) },
    "/notifications/{id}": { delete: op("Notifications", "Delete one", { parameters: [pathParam("id")] }) },
    "/chat/guest-session": {
      post: op("Chat", "Start a support chat as a website visitor (no account). Returns a guest token for the Socket.IO handshake (`auth: { guestToken }`) and the X-Chat-Guest-Token upload header. 10 per IP per hour.", {
        requestBody: json({
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", maxLength: 50 },
            email: { type: "string", format: "email", description: "Optional: lets support email the visitor about replies" },
          },
        }),
      }, "none"),
    },
    "/reviews/featured": {
      get: op("Reviews", "Recent approved 4-5 star reviews with a comment (homepage testimonials; reviewer shown as first name + initial)", {
        parameters: [{ name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 12, default: 3 } }],
      }, "none"),
    },
    "/contact": {
      post: op("Contact", "Send a contact-form message (stored, and emailed to CONTACT_EMAIL; rate limited)", {
        requestBody: json({
          type: "object",
          required: ["name", "email", "message"],
          properties: {
            name: { type: "string", maxLength: 100 },
            email: { type: "string", format: "email" },
            phone: { type: "string" },
            subject: { type: "string", maxLength: 150 },
            message: { type: "string", minLength: 10, maxLength: 2000 },
          },
        }),
      }, "none"),
    },
    "/campaigns/live": {
      get: op("Campaigns", "The festival/event campaign running now (null when none), with its resolved colour theme and sale summary. Admins may pass ?preview=<id> to see any campaign.", {
        parameters: [{ name: "preview", in: "query", description: "Campaign id (admins only)", schema: { type: "string" } }],
      }, "none"),
    },
    "/campaigns/{slug}": {
      get: op("Campaigns", "A published campaign for its sale page (state is live, scheduled or ended)", { parameters: [pathParam("slug", "Campaign slug")] }, "none"),
    },
    "/newsletter/subscribe": {
      post: op("Contact", "Subscribe to the newsletter (idempotent; rate limited)", {
        requestBody: json({
          type: "object",
          required: ["email"],
          properties: { email: { type: "string", format: "email" }, source: { type: "string", maxLength: 30 } },
        }),
      }, "none"),
    },
    "/chat/upload": {
      post: op("Chat", "Upload a chat image (signed-in users, or guests with the X-Chat-Guest-Token header). Realtime messaging uses Socket.IO namespace /chat", {
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { type: "object", properties: { image: { type: "string", format: "binary" } } } } },
        },
      }),
    },

    // ---------------- Admin ----------------
    "/admin/dashboard": {
      get: op("Admin", "Store stats, 7-day sales, orders by status, needs-attention counts, low-stock products and 30-day top products", {}, "admin"),
    },
    "/admin/campaigns/presets": {
      get: op("Admin", "Festival presets (look and copy) and the colour palettes campaigns can use", {}, "admin"),
    },
    "/admin/campaigns": {
      get: op("Admin", "All campaigns (newest first) with state draft/scheduled/live/ended", {}, "admin"),
      post: op("Admin", "Create a campaign. Missing look fields come from the festival preset. Published campaigns may not overlap (409).", {
        requestBody: json({
            type: "object",
            properties: {
              name: { type: "string", maxLength: 80 },
              festival: { type: "string", enum: ["dashain", "tihar", "chhath", "holi", "christmas", "new-year", "nepali-new-year", "teej", "lhosar", "custom"] },
              headline: { type: "string", maxLength: 80 },
              subheadline: { type: "string", maxLength: 160 },
              greeting: { type: "string", maxLength: 80 },
              emoji: { type: "string" },
              palette: { type: "string", enum: ["brand", "marigold", "diyo", "sindoor", "holi", "pine", "himal", "teej"] },
              ctaLabel: { type: "string", maxLength: 30 },
              startsAt: { type: "string", format: "date-time" },
              endsAt: { type: "string", format: "date-time" },
              status: { type: "string", enum: ["draft", "published"] },
              sale: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["none", "percent", "fixed"] },
                  value: { type: "number", description: "Percent (1-70) or NPR amount" },
                  scope: { type: "string", enum: ["all", "categories", "products"] },
                  categories: { type: "array", items: { type: "string" } },
                  products: { type: "array", items: { type: "string" } },
                  excludeProducts: { type: "array", items: { type: "string" } },
                },
              },
              notify: { type: "object", properties: { pushOnLaunch: { type: "boolean" } } },
            },
          }),
      }, "admin"),
    },
    "/admin/campaigns/{id}": {
      get: op("Admin", "Campaign by id", { parameters: [pathParam("id")] }, "admin"),
      put: op("Admin", "Update a campaign (same rules as create)", { parameters: [pathParam("id")], requestBody: json({
            type: "object",
            properties: {
              name: { type: "string", maxLength: 80 },
              festival: { type: "string", enum: ["dashain", "tihar", "chhath", "holi", "christmas", "new-year", "nepali-new-year", "teej", "lhosar", "custom"] },
              headline: { type: "string", maxLength: 80 },
              subheadline: { type: "string", maxLength: 160 },
              greeting: { type: "string", maxLength: 80 },
              emoji: { type: "string" },
              palette: { type: "string", enum: ["brand", "marigold", "diyo", "sindoor", "holi", "pine", "himal", "teej"] },
              ctaLabel: { type: "string", maxLength: 30 },
              startsAt: { type: "string", format: "date-time" },
              endsAt: { type: "string", format: "date-time" },
              status: { type: "string", enum: ["draft", "published"] },
              sale: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["none", "percent", "fixed"] },
                  value: { type: "number", description: "Percent (1-70) or NPR amount" },
                  scope: { type: "string", enum: ["all", "categories", "products"] },
                  categories: { type: "array", items: { type: "string" } },
                  products: { type: "array", items: { type: "string" } },
                  excludeProducts: { type: "array", items: { type: "string" } },
                },
              },
              notify: { type: "object", properties: { pushOnLaunch: { type: "boolean" } } },
            },
          }) }, "admin"),
      delete: op("Admin", "Delete a campaign and its banners", { parameters: [pathParam("id")] }, "admin"),
    },
    "/admin/campaigns/{id}/duplicate": {
      post: op("Admin", "Copy as a draft with dates moved forward a year (banners are not copied)", { parameters: [pathParam("id")] }, "admin"),
    },
    "/admin/campaigns/{id}/banner": {
      post: op("Admin", "Upload the desktop (?variant=desktop) or mobile (?variant=mobile) banner (multipart field `image`, max 3 MB)", {
        parameters: [pathParam("id"), { name: "variant", in: "query", schema: { type: "string", enum: ["desktop", "mobile"] } }],
      }, "admin"),
      delete: op("Admin", "Remove a banner", {
        parameters: [pathParam("id"), { name: "variant", in: "query", schema: { type: "string", enum: ["desktop", "mobile"] } }],
      }, "admin"),
    },
    "/admin/campaigns/{id}/notify": {
      post: op("Admin", "Send the campaign push notification now (published campaigns; not repeated at launch)", { parameters: [pathParam("id")] }, "admin"),
    },
    "/admin/campaigns/{id}/stats": {
      get: op("Admin", "Orders, units, revenue and customer savings from items sold at this campaign's prices", { parameters: [pathParam("id")] }, "admin"),
    },
    "/admin/badges": {
      get: op("Admin", "Navigation badge counts: pendingOrders, refundRequired (cancelled but paid), unreadMessages", {}, "admin"),
    },
    "/admin/products": {
      get: op("Admin", "All products incl. inactive", {
        parameters: [
          ...pageParams,
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "isActive", in: "query", schema: { type: "boolean" } },
          { name: "stock", in: "query", description: "low = 1 to LOW_STOCK_THRESHOLD, out = 0", schema: { type: "string", enum: ["low", "out"] } },
        ],
      }, "admin"),
      post: op("Admin", "Create product", { requestBody: json(productBody) }, "admin"),
    },
    "/admin/products/sizes": {
      get: op("Admin", "Size options: built-in sizes plus custom sizes already used on products", {}, "admin"),
    },
    "/admin/products/options": {
      get: op(
        "Admin",
        "Product form options: `sizes` { builtIn, custom } and `colors` { palette, used } (colours on other products, with swatches)",
        {},
        "admin",
      ),
    },
    "/admin/products/{id}": {
      get: op("Admin", "Product by id (older per-variant photos shown as colour photos)", { parameters: [pathParam("id")] }, "admin"),
      put: op("Admin", "Update product (send variant _id to update a variant in place; null clears comparePrice/sku/shortDescription)", {
        parameters: [pathParam("id")],
        requestBody: json({
          ...productBody,
          required: [],
          properties: {
            ...productBody.properties,
            images: {
              type: "array",
              description:
                "Existing photos in display order with their colour (null = every colour), alt text and primary flag. " +
                "Photos left out are removed (and deleted from Cloudinary after saving).",
              items: {
                type: "object",
                required: ["_id"],
                properties: {
                  _id: { type: "string" },
                  color: { type: "string", nullable: true },
                  alt: { type: "string", nullable: true },
                  isPrimary: { type: "boolean" },
                },
              },
            },
            primaryImageId: { type: "string", description: "Existing image to mark as primary (older clients)" },
          },
        }),
      }, "admin"),
      delete: op("Admin", "Delete product", { parameters: [pathParam("id")] }, "admin"),
    },
    "/admin/products/{id}/images": {
      post: op(
        "Admin",
        "Upload product images (multipart: `images` files; optional `meta` = JSON array, same order as the files, of " +
          "{ color, alt, isPrimary }; older clients send `primaryIndex`)",
        { parameters: [pathParam("id")] },
        "admin",
      ),
    },
    "/admin/products/{id}/images/{imageId}": {
      delete: op("Admin", "Delete product image", { parameters: [pathParam("id"), pathParam("imageId")] }, "admin"),
    },
    "/admin/products/{id}/variants/{variantId}/image": {
      post: op(
        "Admin",
        "Upload a photo for a variant (multipart, field `image`; older clients). Added first among the variant's colour photos.",
        { parameters: [pathParam("id"), pathParam("variantId")] },
        "admin",
      ),
    },
    "/admin/categories": {
      get: op("Admin", "All categories", {}, "admin"),
      post: op("Admin", "Create category", {}, "admin"),
    },
    "/admin/categories/{id}": {
      put: op("Admin", "Update category", { parameters: [pathParam("id")] }, "admin"),
      delete: op("Admin", "Delete category", { parameters: [pathParam("id")] }, "admin"),
    },
    "/admin/categories/{id}/image": {
      post: op("Admin", "Upload category image (multipart, field `image`)", { parameters: [pathParam("id")] }, "admin"),
    },
    "/admin/orders": {
      get: op("Admin", "All orders (also returns per-status stats)", {
        parameters: [
          ...pageParams,
          { name: "status", in: "query", schema: { type: "string", enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] } },
          { name: "paymentStatus", in: "query", schema: { type: "string", enum: ["pending", "paid", "failed", "refunded"] } },
          { name: "paymentMethod", in: "query", schema: { type: "string", enum: ["cod", "esewa", "khalti"] } },
          { name: "search", in: "query", description: "Order number, recipient name/phone, or customer name/email", schema: { type: "string" } },
          { name: "refundRequired", in: "query", description: "Cancelled orders that were paid (refund needed)", schema: { type: "boolean" } },
        ],
      }, "admin"),
    },
    "/admin/orders/bulk-status": {
      post: op("Admin", "Change the status of up to 100 orders (same rules as a single update; returns updated and failed lists)", {
        requestBody: json({
          type: "object",
          required: ["orderIds", "status"],
          properties: {
            orderIds: { type: "array", items: { type: "string" }, maxItems: 100 },
            status: { type: "string", enum: ["confirmed", "processing", "shipped", "delivered", "cancelled"] },
            note: { type: "string" },
          },
        }),
      }, "admin"),
    },
    "/admin/orders/{id}": { get: op("Admin", "Order by id", { parameters: [pathParam("id")] }, "admin") },
    "/admin/orders/{id}/status": {
      put: op("Admin", "Change order status", {
        parameters: [pathParam("id")],
        requestBody: json({
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] },
            note: { type: "string" },
          },
        }),
      }, "admin"),
    },
    "/admin/users": {
      get: op("Admin", "Users", {
        parameters: [
          ...pageParams,
          { name: "role", in: "query", schema: { type: "string", enum: ["customer", "admin"] } },
          { name: "isActive", in: "query", schema: { type: "boolean" } },
          { name: "search", in: "query", description: "Name, email or phone", schema: { type: "string" } },
        ],
      }, "admin"),
    },
    "/admin/users/{id}/status": {
      put: op("Admin", "Activate/deactivate user", {
        parameters: [pathParam("id")],
        requestBody: json({ type: "object", required: ["isActive"], properties: { isActive: { type: "boolean" } } }),
      }, "admin"),
    },
    "/admin/users/{id}/role": {
      put: op("Admin", "Change user role", {
        parameters: [pathParam("id")],
        requestBody: json({ type: "object", required: ["role"], properties: { role: { type: "string", enum: ["customer", "admin"] } } }),
      }, "admin"),
    },
    "/admin/contact-messages": {
      get: op("Admin", "Contact-form messages (newest first, with unreadCount)", {
        parameters: [...pageParams, { name: "unread", in: "query", schema: { type: "boolean" } }],
      }, "admin"),
    },
    "/admin/contact-messages/{id}": {
      put: op("Admin", "Mark a contact message read or unread", {
        parameters: [pathParam("id")],
        requestBody: json({ type: "object", properties: { isRead: { type: "boolean", default: true } } }, false),
      }, "admin"),
    },
    "/admin/subscribers": {
      get: op("Admin", "Active newsletter subscribers", { parameters: pageParams }, "admin"),
    },
    "/admin/payments/cod-collected": {
      post: op("Admin", "Mark a COD order as paid", {
        requestBody: json({ type: "object", required: ["orderId"], properties: { orderId: { type: "string" } } }),
      }, "admin"),
    },
  },
};

export default openApiSpec;
