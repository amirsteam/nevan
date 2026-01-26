/**
 * Express Application Configuration
 * Sets up middleware, routes, and error handling
 */
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import corsOptions from './config/cors';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';

// Create Express app
const app: Express = express();

// ==================== SECURITY MIDDLEWARE ====================

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow Cloudinary images
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per windowMs
    message: {
        status: 'fail',
        message: 'Too many requests from this IP, please try again after 15 minutes',
    } as any, // casting to any because of type mismatch in express-rate-limit types
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use('/api', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 10, // Limit each IP to 10 login attempts per hour
    message: {
        status: 'fail',
        message: 'Too many login attempts, please try again after an hour',
    } as any,
});
app.use('/api/v1/auth/login', authLimiter);

// ==================== BODY PARSING ====================

// CORS
// app.use(cors(corsOptions)); // Types for cors options might need adjustment or direct usage
app.use(cors(corsOptions as any));

// Body parser
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ==================== LOGGING ====================

// Request logging in development
if (process.env.NODE_ENV === 'development') {
    app.use((req: Request, res: Response, next: NextFunction) => {
        console.log(`${req.method} ${req.originalUrl}`);
        next();
    });
}

// ==================== ROUTES ====================

// API routes
// app.use('/api/v1', routes); // routes exported as default
app.use('/api/v1', routes);

// Root route
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'success',
        message: 'BivanHandicraft API',
        version: '1.0.0',
        documentation: '/api/v1/health',
    });
});

// ==================== ERROR HANDLING ====================

// Handle 404
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;
