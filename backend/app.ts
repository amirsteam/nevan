/**
 * Express Application Configuration
 * Sets up middleware, routes, and error handling
 */
import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import corsOptions from "./config/cors";
import { apiLimiter } from "./config/rateLimit";
import routes from "./routes";
import swaggerUi from "swagger-ui-express";
import openApiSpec from "./docs/openapi";
import { errorHandler, notFound } from "./middleware/errorHandler";

// Create Express app
const app: Express = express();

// Trust proxy when behind reverse proxy/load balancer (ngrok, prod, etc.)
if (process.env.NODE_ENV === "production" || process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

// ==================== SECURITY MIDDLEWARE ====================

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow Cloudinary images
  }),
);

// Rate limiting (stricter per-endpoint limiters are applied in the routers)
app.use("/api", apiLimiter);

// ==================== BODY PARSING ====================

// CORS
app.use(cors(corsOptions as any));

// Body parser
app.use(express.json({ limit: "10kb" })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

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
  // Express 5 exposes req.query as a getter, so redefine it with the sanitized copy
  if (req.query && typeof req.query === "object") {
    Object.defineProperty(req, "query", {
      value: sanitizeObject(req.query),
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  // req.params is not populated yet at app level (routers fill it in later), and
  // route params are always plain strings, so they cannot carry query operators.
  next();
});

// ==================== LOGGING ====================

// Request logging
if (process.env.NODE_ENV === "production") {
  // Combined format for production (includes more details)
  app.use(morgan("combined"));
} else if (process.env.NODE_ENV !== "test") {
  // Dev format for development (colored, concise)
  app.use(morgan("dev"));
}

// ==================== ROUTES ====================

// API routes
// app.use('/api/v1', routes); // routes exported as default
// Interactive API docs (Swagger UI). Off in production unless API_DOCS=true.
if (process.env.NODE_ENV !== "production" || process.env.API_DOCS === "true") {
  app.get("/api/v1/docs.json", (_req: Request, res: Response) => {
    res.json(openApiSpec);
  });
  app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
}

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
