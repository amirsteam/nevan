import { Request, Response, NextFunction } from 'express';

/**
 * Async Handler Wrapper
 * Wraps async route handlers to automatically catch errors
 * and pass them to Express error handling middleware
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
