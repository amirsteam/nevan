/**
 * CORS Configuration
 * Allows requests from web and mobile clients
 */
import { CorsOptions } from 'cors';

const corsOptions: CorsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // Allowed origins from environment
        const envOrigins = (process.env.FRONTEND_URL || '').split(',').map(url => url.trim());
        // Local development servers are trusted only outside production
        const devOrigins = process.env.NODE_ENV === 'production'
            ? []
            : [
                'http://localhost:8081', // Expo web default
                'http://localhost:5173', // Vite default
                'http://localhost:5000', // Backend self
            ];
        const allowedOrigins = [...envOrigins, process.env.ADMIN_URL, ...devOrigins].filter(Boolean) as string[];

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`⚠️ CORS blocked request from: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Allow cookies and authorization headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Chat-Guest-Token'],
    exposedHeaders: ['X-Total-Count', 'X-Total-Pages'], // For pagination
    maxAge: 86400, // Cache preflight for 24 hours
};

export default corsOptions;
