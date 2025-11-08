import { Request, Response } from 'express';
const { body, validationResult } = require("express-validator");

import { authService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { IUserPreferences } from '../models/User';
import { logger } from '../utils/logger';

// Validation rules
export const registerValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
];

export const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

export const changePasswordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

export const resetPasswordValidation = [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// Handle validation errors
const handleValidationErrors = (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
        return true;
    }
    return false;
};

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        if (handleValidationErrors(req, res)) return;

        const { email, password, name } = req.body;

        const result = await authService.register({ email, password, name });

        // Set HTTP-only cookie with the token
        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: result.user,
            token: result.token
        });
    } catch (error) {
        logger.error('Registration error:', error);

        if (error instanceof Error) {
            if (error.message.includes('already exists')) {
                res.status(409).json({
                    success: false,
                    error: error.message
                });
                return;
            }
        }

        res.status(500).json({
            success: false,
            error: 'Registration failed'
        });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        if (handleValidationErrors(req, res)) return;

        const { email, password } = req.body;

        const result = await authService.login({ email, password });

        // Set HTTP-only cookie with the token
        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            success: true,
            message: 'Login successful',
            user: result.user,
            token: result.token
        });
    } catch (error) {
        logger.error('Login error:', error);

        if (error instanceof Error && error.message.includes('Invalid email or password')) {
            res.status(401).json({
                success: false,
                error: error.message
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        // Clear the token cookie
        res.clearCookie('token');

        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }

        res.json({
            success: true,
            user: req.user
        });
    } catch (error) {
        logger.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get profile'
        });
    }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }

        const { name, preferences } = req.body;
        const updates: { name?: string; preferences?: IUserPreferences } = {};

        if (name) updates.name = name;
        if (preferences) updates.preferences = preferences as IUserPreferences;

        const updatedUser = await authService.updateProfile((req.user._id as string).toString(), updates);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (error) {
        logger.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
};

export const updateApiKey = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }

        const { apiKey } = req.body;

        if (!apiKey) {
            res.status(400).json({
                success: false,
                error: 'API key is required'
            });
            return;
        }

        await authService.updateApiKey((req.user._id as string).toString(), apiKey);

        res.json({
            success: true,
            message: 'API key updated successfully'
        });
    } catch (error) {
        logger.error('Update API key error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update API key'
        });
    }
};

export const getApiKey = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }

        const apiKey = await authService.getApiKey((req.user._id as string).toString());

        res.json({
            success: true,
            apiKey
        });
    } catch (error) {
        logger.error('Get API key error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get API key'
        });
    }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (handleValidationErrors(req, res)) return;

        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }

        const { currentPassword, newPassword } = req.body;

        await authService.changePassword((req.user._id as string).toString(), currentPassword, newPassword);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        logger.error('Change password error:', error);

        if (error instanceof Error && error.message.includes('Current password is incorrect')) {
            res.status(400).json({
                success: false,
                error: error.message
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: 'Failed to change password'
        });
    }
};

export const initiatePasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({
                success: false,
                error: 'Email is required'
            });
            return;
        }

        const message = await authService.initiatePasswordReset(email);

        res.json({
            success: true,
            message
        });
    } catch (error) {
        logger.error('Password reset initiation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initiate password reset'
        });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        if (handleValidationErrors(req, res)) return;

        const { token, newPassword } = req.body;

        await authService.resetPassword({ token, newPassword });

        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        logger.error('Password reset error:', error);

        if (error instanceof Error && error.message.includes('Invalid or expired')) {
            res.status(400).json({
                success: false,
                error: error.message
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: 'Failed to reset password'
        });
    }
};

export const deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }

        const { password } = req.body;

        if (!password) {
            res.status(400).json({
                success: false,
                error: 'Password is required'
            });
            return;
        }

        await authService.deleteAccount((req.user._id as string).toString(), password);

        // Clear the token cookie
        res.clearCookie('token');

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        logger.error('Delete account error:', error);

        if (error instanceof Error && error.message.includes('Password is incorrect')) {
            res.status(400).json({
                success: false,
                error: error.message
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: 'Failed to delete account'
        });
    }
};