/**
 * Auth Service
 * Handles authentication business logic
 * Separates auth logic from HTTP handling
 */
import User, { IUser } from '../models/User';
import { generateTokenPair, verifyRefreshToken } from '../utils/tokenUtils';
import AppError from '../utils/AppError';

interface UserRegistrationData {
    name: string;
    email: string;
    password: string;
    phone?: string;
}

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

interface AuthResult {
    user: IUser;
    tokens: TokenPair;
}

/**
 * Register a new user
 */
const registerUser = async (userData: UserRegistrationData): Promise<AuthResult> => {
    const { name, email, password, phone } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new AppError('Email already registered', 400);
    }

    // Create user
    const user = await User.create({
        name,
        email,
        password,
        phone,
    });

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Save refresh token to user
    (user as any).refreshToken = tokens.refreshToken;
    await (user as any).save({ validateBeforeSave: false });

    // Remove sensitive fields
    (user as any).password = undefined;
    (user as any).refreshToken = undefined;

    return { user, tokens };
};

/**
 * Login user
 */
const loginUser = async (email: string, password: string): Promise<AuthResult> => {
    // Find user with password field
    const user = await User.findOne({ email }).select('+password +refreshToken');

    if (!user || !(await user.comparePassword(password))) {
        throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
        throw new AppError('Your account has been deactivated', 401);
    }

    // Generate new tokens
    const tokens = generateTokenPair(user);

    // Update refresh token and last login
    (user as any).refreshToken = tokens.refreshToken;
    (user as any).lastLogin = new Date();
    await (user as any).save({ validateBeforeSave: false });

    // Remove sensitive fields
    (user as any).password = undefined;
    (user as any).refreshToken = undefined;

    return { user, tokens };
};

/**
 * Logout user - Invalidates refresh token
 */
const logoutUser = async (userId: string): Promise<void> => {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (refreshToken: string): Promise<TokenPair> => {
    if (!refreshToken) {
        throw new AppError('Refresh token is required', 400);
    }

    try {
        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);

        // Find user with stored refresh token
        const user = await User.findById(decoded.userId).select('+refreshToken');

        if (!user) {
            throw new AppError('User not found', 401);
        }

        if (!user.isActive) {
            throw new AppError('Your account has been deactivated', 401);
        }

        // Verify stored refresh token matches
        if ((user as any).refreshToken !== refreshToken) {
            throw new AppError('Invalid refresh token', 401);
        }

        // Generate new token pair (rotate refresh token for security)
        const tokens = generateTokenPair(user);

        // Update stored refresh token
        (user as any).refreshToken = tokens.refreshToken;
        await (user as any).save({ validateBeforeSave: false });

        return tokens;
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Invalid refresh token', 401);
    }
};

/**
 * Change user password
 */
const changePassword = async (
    userId: string,
    currentPassword: string,
    newPassword: string
): Promise<{ message: string }> => {
    const user = await User.findById(userId).select('+password');

    if (!user) {
        throw new AppError('User not found', 404);
    }

    if (!(await user.comparePassword(currentPassword))) {
        throw new AppError('Current password is incorrect', 401);
    }

    (user as any).password = newPassword;
    (user as any).refreshToken = null; // Invalidate all sessions
    await user.save();

    return { message: 'Password changed successfully' };
};

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
};
