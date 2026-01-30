/**
 * Global Error Handler Middleware
 * Catches all errors and returns consistent error responses
 */
import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import AppError from "../utils/AppError";

interface MongooseError extends Error {
  path?: string;
  value?: any;
  keyValue?: Record<string, any>;
  errors?: Record<string, { message: string }>;
  code?: number;
}

/**
 * Handle Mongoose CastError (invalid ID)
 */
const handleCastError = (err: MongooseError): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose Duplicate Key Error
 */
const handleDuplicateKeyError = (err: MongooseError): AppError => {
  const field = Object.keys(err.keyValue || {})[0];
  const value = err.keyValue?.[field];
  const message = `${field} '${value}' already exists. Please use a different value.`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose Validation Error
 */
const handleValidationError = (err: MongooseError): AppError => {
  const errors = Object.values(err.errors || {}).map((el) => el.message);
  const message = `Invalid input: ${errors.join(". ")}`;
  return new AppError(message, 400);
};

/**
 * Handle JWT Error
 */
const handleJWTError = (): AppError => {
  return new AppError("Invalid token. Please log in again.", 401);
};

/**
 * Handle JWT Expired Error
 */
const handleJWTExpiredError = (): AppError => {
  return new AppError("Your token has expired. Please log in again.", 401);
};

/**
 * Handle Multer/Cloudinary Error
 */
const handleMulterError = (err: MongooseError): AppError => {
  if (err.code === ("LIMIT_FILE_SIZE" as any)) {
    return new AppError(
      "File too large. Maximum size is 10MB. Please compress your image or use a smaller file.",
      400,
    );
  }
  if (err.code === ("LIMIT_UNEXPECTED_FILE" as any)) {
    return new AppError("Unexpected file field.", 400);
  }
  if (err.message?.includes("Only image files")) {
    return new AppError(err.message, 400);
  }
  return new AppError(
    "File upload error. Please try again with a valid image file.",
    400,
  );
};

interface ErrorResponse {
  status: string;
  error?: any;
  message: string;
  stack?: string;
}

/**
 * Send error response in development
 * Includes full error details for debugging
 */
const sendErrorDev = (err: AppError, res: Response): void => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  } as ErrorResponse);
};

/**
 * Send error response in production
 * Only sends operational errors; hides programming errors
 */
const sendErrorProd = (err: AppError, res: Response): void => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or unknown error: don't leak details
    console.error("ERROR 💥:", err);

    res.status(500).json({
      status: "error",
      message: "Something went wrong. Please try again later.",
    });
  }
};

/**
 * Global Error Handler
 */
const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    // Handle specific error types
    if (err.name === "CastError") error = handleCastError(err);
    if (err.code === 11000) error = handleDuplicateKeyError(err);
    if (err.name === "ValidationError") error = handleValidationError(err);
    if (err.name === "JsonWebTokenError") error = handleJWTError();
    if (err.name === "TokenExpiredError") error = handleJWTExpiredError();
    if (err.name === "MulterError") error = handleMulterError(err);

    sendErrorProd(error, res);
  }
};

/**
 * Handle unhandled routes
 */
const notFound = (req: Request, res: Response, next: NextFunction): void => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
};

export { errorHandler, notFound };
