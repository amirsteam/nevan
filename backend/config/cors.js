/**
 * CORS Configuration
 * Allows requests from web and mobile clients
 */
const corsOptions = {
    origin: function (origin, callback) {
        // Allowed origins from environment
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            process.env.ADMIN_URL,
            'http://localhost:8081',
            // Add production URLs here
        ].filter(Boolean); // Remove undefined values

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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Total-Pages'], // For pagination
    maxAge: 86400, // Cache preflight for 24 hours
};

module.exports = corsOptions;
