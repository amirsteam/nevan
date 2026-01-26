/**
 * Custom Application Error Class
 * Extends Error to include HTTP status codes and operational flags
 */
class AppError extends Error {
    public statusCode: number;
    public status: string;
    public isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // Distinguishes from programming errors

        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
