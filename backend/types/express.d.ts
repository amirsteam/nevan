/**
 * Custom Type Definitions for Express
 * Extends Request to include user and other custom properties
 */
import { IUser } from '../models/User';

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
            isOwner?: boolean;
            isAdmin?: boolean;
        }
    }
}

export interface JwtPayload {
    userId: string;
    iat?: number;
    exp?: number;
}
