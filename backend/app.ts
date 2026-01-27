/**
 * Express Application Configuration
 * Sets up middleware, routes, and error handling
 */
import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import corsOptions from "./config/cors";
import routes from "./routes";
import { errorHandler, notFound } from "./middleware/errorHandler";

// Create Express app
const app: Express = express();

// ==================== SECURITY MIDDLEWARE ====================

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow Cloudinary images
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes default
  limit: parseInt(process.env.RATE_LIMIT_MAX || "100"), // 100 requests per window
  message: {
    status: "fail",
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  } as any,
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use("/api", limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: parseInt(process.env.AUTH_RATE_LIMIT_MAX || "10"), // 10 attempts per hour
  message: {
    status: "fail",
    message: "Too many login attempts, please try again after an hour",
  } as any,
});
app.use("/api/v1/auth/login", authLimiter);
app.use("/api/v1/auth/register", authLimiter);

// ==================== BODY PARSING ====================

// CORS
app.use(cors(corsOptions as any));

// Body parser
app.use(express.json({ limit: "10kb" })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Custom NoSQL injection sanitizer for Express v5
// express-mongo-sanitize doesn't work with Express v5 (req.query is read-only)
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  const sanitized: any = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    // Skip keys starting with $ or containing .
    if (key.startsWith("$") || key.includes(".")) {
      console.warn(`⚠️ Blocked potentially malicious key: ${key}`);
      continue;
    }
    sanitized[key] = sanitizeObject(obj[key]);
  }
  return sanitized;
};

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.params) {
    for (const key of Object.keys(req.params)) {
      if (typeof req.params[key] === "string") {
        req.params[key] = req.params[key].replace(/[$.]/, "_");
      }
    }
  }
  next();
});

// ==================== LOGGING ====================

// Request logging
if (process.env.NODE_ENV === "production") {
  // Combined format for production (includes more details)
  app.use(morgan("combined"));
} else {
  // Dev format for development (colored, concise)
  app.use(morgan("dev"));
}

// ==================== ROUTES ====================

// API routes
// app.use('/api/v1', routes); // routes exported as default
app.use("/api/v1", routes);

// Root route
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "BivanHandicraft API",
    version: "1.0.0",
    documentation: "/api/v1/health",
  });
});

// ==================== ERROR HANDLING ====================

// Handle 404
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;
