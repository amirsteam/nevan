import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * JWT Token Utilities
 * Handles generation and verification of access and refresh tokens
 */

interface AccessPayload {
  userId: string;
  role: string;
  // Issued after two-step login (admins: access without it is refused)
  mfa?: boolean;
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
        // Unique id: without it, two tokens issued in the same second are identical,
        // which would make separate sessions (or a rotated token) indistinguishable.
        jwtid: crypto.randomUUID(),
    });
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token: string): any => {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as any;
    // Other tokens signed with this secret (chat guests) carry an audience: never access tokens
    if (decoded && typeof decoded === 'object' && decoded.aud !== undefined) {
        throw new jwt.JsonWebTokenError('invalid token');
    }
    return decoded;
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token: string): any => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string);
};

/**
 * Hash a refresh token for storage (never store the raw JWT)
 */
export const hashToken = (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Expiry date encoded in a JWT (falls back to 7 days)
 */
export const getTokenExpiry = (token: string): Date => {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    return decoded?.exp
        ? new Date(decoded.exp * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};

/**
 * Generate both tokens for a user
 */
export const generateTokenPair = (
    user: { _id: string | any; role: string },
    { mfa = false }: { mfa?: boolean } = {},
) => {
    const accessPayload: AccessPayload = {
        userId: user._id.toString(),
        role: user.role,
        ...(mfa && { mfa: true }),
    };

    const refreshPayload: RefreshPayload = {
        userId: user._id.toString(),
    };

    return {
        accessToken: generateAccessToken(accessPayload),
        refreshToken: generateRefreshToken(refreshPayload),
    };
};

// ==================== Chat guest tokens ====================

export interface GuestChatPayload {
    guestId: string;
    name: string;
    email?: string;
}

const GUEST_AUDIENCE = 'chat-guest';

/**
 * Token identifying an anonymous website visitor in the support chat. It only
 * grants access to that visitor's own conversation (audience `chat-guest`; it is
 * not accepted as an access token because it carries no userId).
 */
export const generateGuestToken = (payload: GuestChatPayload): string => {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, {
        audience: GUEST_AUDIENCE,
        expiresIn: '30d',
    });
};

export const verifyGuestToken = (token: string): GuestChatPayload => {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string, {
        audience: GUEST_AUDIENCE,
    }) as GuestChatPayload;
    if (!decoded.guestId || !decoded.name) throw new Error('Invalid guest token');
    return decoded;
};

/**
 * An admin's access token issued without two-step login: from before it was
 * required, or from before the account became an admin. Refused everywhere.
 */
export const missingTwoFactor = (user: { role: string }, decoded: { mfa?: boolean }): boolean =>
    user.role === 'admin' && decoded.mfa !== true;

export const SIGN_IN_WITH_TWO_FACTOR = 'Please sign in again: admin accounts use two-step login.';

// ==================== Two-step login challenges ====================

export type TwoFactorPurpose = 'verify' | 'setup';

export interface TwoFactorChallenge {
    userId: string;
    purpose: TwoFactorPurpose;
    // The account's twoFactor.version when issued (bumped on reset/replace/lock)
    ver: number;
}

const CHALLENGE_AUDIENCE = 'two-factor';

// Own key (derived), so a challenge can never pass as an access or guest token
const challengeSecret = (): string =>
    crypto.createHmac('sha256', process.env.JWT_ACCESS_SECRET as string).update('two-factor-challenge').digest('hex');

/**
 * Proof that the password (or Google) step succeeded, for 10 minutes. It only
 * lets the holder finish two-step login; it grants no access by itself.
 */
export const generateTwoFactorChallenge = (payload: TwoFactorChallenge): string =>
    jwt.sign(payload, challengeSecret(), { audience: CHALLENGE_AUDIENCE, expiresIn: '10m' });

export const verifyTwoFactorChallenge = (token: string): TwoFactorChallenge => {
    const decoded = jwt.verify(token, challengeSecret(), { audience: CHALLENGE_AUDIENCE }) as TwoFactorChallenge;
    if (!decoded.userId || !['verify', 'setup'].includes(decoded.purpose)) throw new Error('Invalid challenge');
    return decoded;
};
