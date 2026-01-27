/* eslint-disable @typescript-eslint/no-namespace */
import { IUser } from "../models/User";

export interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export interface IUserPayload {
  _id: string;
  email: string;
  name: string;
  phone?: string;
  role: "customer" | "admin";
}

// Augment Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      isOwner?: boolean;
      isAdmin?: boolean;
    }
  }
}
