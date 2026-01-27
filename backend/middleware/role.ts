/**
 * Role-based Access Control Middleware
 * Restricts access based on user roles
 */
import { Request, Response, NextFunction, RequestHandler } from "express";
import AppError from "../utils/AppError";
import "../types/express";

type UserRole = "customer" | "admin";

/**
 * Restrict access to specific roles
 * Must be used after protect middleware
 *
 * Usage:
 *   router.delete('/users/:id', protect, restrictTo('admin'), deleteUser);
 *   router.get('/orders', protect, restrictTo('admin', 'customer'), getOrders);
 *
 * @param roles - Allowed roles
 */
const restrictTo = (...roles: UserRole[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // protect middleware must run first
    if (!req.user) {
      return next(new AppError("Not authenticated.", 401));
    }

    if (!roles.includes(req.user.role as UserRole)) {
      return next(
        new AppError("You do not have permission to perform this action.", 403),
      );
    }

    next();
  };
};

/**
 * Restrict to admin only
 * Convenience wrapper for restrictTo('admin')
 */
const adminOnly: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    return next(new AppError("Not authenticated.", 401));
  }

  if (req.user.role !== "admin") {
    return next(new AppError("Admin access required.", 403));
  }

  next();
};

/**
 * Check if user owns the resource or is admin
 * Useful for routes where users can only access their own data
 *
 * Usage:
 *   router.put('/users/:id', protect, ownerOrAdmin('id'), updateUser);
 *
 * @param paramName - Request param containing user ID to check
 */
const ownerOrAdmin = (paramName: string = "id"): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("Not authenticated.", 401));
    }

    const resourceUserId = req.params[paramName];
    const isOwner = (req.user as any)._id.toString() === resourceUserId;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return next(new AppError("You can only access your own resources.", 403));
    }

    req.isOwner = isOwner;
    req.isAdmin = isAdmin;
    next();
  };
};

export { restrictTo, adminOnly, ownerOrAdmin };
