/**
 * Auth Controller
 * Handles HTTP requests for authentication
 * Delegates business logic to authService
 */
import { Request, Response } from 'express';
import * as authService from '../services/authService';
import asyncHandler from '../utils/asyncHandler';

/**
 * @desc    Register new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.registerUser(req.body);

    res.status(201).json({
        status: 'success',
        message: 'Registration successful',
        data: {
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        },
    });
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const { user, tokens } = await authService.loginUser(email, password);

    res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        },
    });
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) {
        await authService.logoutUser((req.user as any)._id);
    }

    res.status(200).json({
        status: 'success',
        message: 'Logout successful',
    });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public (requires refresh token)
 */
const refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
        status: 'success',
        data: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        },
    });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({
        status: 'success',
        data: {
            user: req.user,
        },
    });
});

/**
 * @desc    Change password
 * @route   PUT /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    if (req.user) {
        const result = await authService.changePassword(
            (req.user as any)._id,
            currentPassword,
            newPassword
        );
    
        res.status(200).json({
            status: 'success',
            message: result.message,
        });
    }
});

export {
    register,
    login,
    logout,
    refreshToken,
    getMe,
    changePassword,
};
