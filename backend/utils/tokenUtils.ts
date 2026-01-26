import jwt from 'jsonwebtoken';

/**
 * JWT Token Utilities
 * Handles generation and verification of access and refresh tokens
 */

interface AccessPayload {
  userId: string;
  role: string;
}

interface RefreshPayload {
  userId: string;
}

/**
 * Generate Access Token (short-lived)
 */
export const generateAccessToken = (payload: AccessPayload): string => {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, {
        expiresIn: (process.env.JWT_ACCESS_EXPIRES || '15m') as jwt.SignOptions['expiresIn'],
    });
};

/**
 * Generate Refresh Token (long-lived)
 */
export const generateRefreshToken = (payload: RefreshPayload): string => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
        expiresIn: (process.env.JWT_REFRESH_EXPIRES || '7d') as jwt.SignOptions['expiresIn'],
    });
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token: string): any => {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET as string);
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token: string): any => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string);
};

/**
 * Generate both tokens for a user
 */
export const generateTokenPair = (user: { _id: string | any; role: string }) => {
    const accessPayload: AccessPayload = {
        userId: user._id.toString(),
        role: user.role,
    };

    const refreshPayload: RefreshPayload = {
        userId: user._id.toString(),
    };

    return {
        accessToken: generateAccessToken(accessPayload),
        refreshToken: generateRefreshToken(refreshPayload),
    };
};
