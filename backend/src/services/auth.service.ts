import crypto from 'crypto';
import { User, IUser } from '../models/User';
import { generateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    name: string;
}

export interface AuthResult {
    user: IUser;
    token: string;
}

export interface ResetPasswordData {
    token: string;
    newPassword: string;
}

export class AuthService {
    async register(data: RegisterData): Promise<AuthResult> {
        try {
            // Check if user already exists
            const existingUser = await User.findOne({ email: data.email });
            if (existingUser) {
                throw new Error('User already exists with this email');
            }

            // Create new user
            const user = new User({
                email: data.email.toLowerCase(),
                password: data.password,
                name: data.name.trim(),
                preferences: {
                    theme: 'system',
                    language: 'en',
                    notifications: true,
                    contextEnabled: true,
                    streamingEnabled: true
                }
            });

            await user.save();

            // Generate JWT token
            const token = generateToken(user);

            logger.info(`New user registered: ${user.email}`);

            return {
                user,
                token
            };
        } catch (error) {
            logger.error('Registration error:', error);
            throw error;
        }
    }

    async login(credentials: LoginCredentials): Promise<AuthResult> {
        try {
            // Find user and include password for comparison
            const user = await User.findOne({ email: credentials.email.toLowerCase() })
                .select('+password');

            if (!user) {
                throw new Error('Invalid email or password');
            }

            // Check password
            const isPasswordValid = await user.comparePassword(credentials.password);
            if (!isPasswordValid) {
                throw new Error('Invalid email or password');
            }

            // Generate JWT token
            const token = generateToken(user);

            logger.info(`User logged in: ${user.email}`);

            // Return user without password
            const userWithoutPassword = await User.findById(user._id);
            if (!userWithoutPassword) {
                throw new Error('User not found');
            }

            return {
                user: userWithoutPassword,
                token
            };
        } catch (error) {
            logger.error('Login error:', error);
            throw error;
        }
    }

    async updateProfile(userId: string, updates: Partial<IUser>): Promise<IUser> {
        try {
            // Don't allow updating sensitive fields
            const allowedUpdates = ['name', 'preferences'];
            const filteredUpdates: Partial<IUser> = {};

            Object.keys(updates).forEach(key => {
                if (allowedUpdates.includes(key)) {
                    (filteredUpdates as Record<string, unknown>)[key] = (updates as Record<string, unknown>)[key];
                }
            });

            const user = await User.findByIdAndUpdate(
                userId,
                filteredUpdates,
                { new: true, runValidators: true }
            );

            if (!user) {
                throw new Error('User not found');
            }

            logger.info(`Profile updated for user: ${user.email}`);
            return user;
        } catch (error) {
            logger.error('Profile update error:', error);
            throw error;
        }
    }

    async updateApiKey(userId: string, apiKey: string): Promise<void> {
        try {
            const user = await User.findByIdAndUpdate(
                userId,
                { apiKey },
                { new: true }
            );

            if (!user) {
                throw new Error('User not found');
            }

            logger.info(`API key updated for user: ${user.email}`);
        } catch (error) {
            logger.error('API key update error:', error);
            throw error;
        }
    }

    async getApiKey(userId: string): Promise<string | null> {
        try {
            const user = await User.findById(userId).select('+apiKey');
            if (!user) {
                throw new Error('User not found');
            }

            return user.apiKey || null;
        } catch (error) {
            logger.error('Get API key error:', error);
            throw error;
        }
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        try {
            const user = await User.findById(userId).select('+password');
            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            const isCurrentPasswordValid = await user.comparePassword(currentPassword);
            if (!isCurrentPasswordValid) {
                throw new Error('Current password is incorrect');
            }

            // Update password
            user.password = newPassword;
            await user.save();

            logger.info(`Password changed for user: ${user.email}`);
        } catch (error) {
            logger.error('Change password error:', error);
            throw error;
        }
    }

    async initiatePasswordReset(email: string): Promise<string> {
        try {
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                // Don't reveal if email exists or not
                return 'If an account with that email exists, we have sent a password reset link.';
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

            // Save hashed token and expiration
            user.resetPasswordToken = hashedResetToken;
            user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            await user.save();

            logger.info(`Password reset initiated for user: ${user.email}`);

            // In a real application, you would send an email here
            // For now, we'll return the token (remove this in production)
            return resetToken;
        } catch (error) {
            logger.error('Password reset initiation error:', error);
            throw error;
        }
    }

    async resetPassword(data: ResetPasswordData): Promise<void> {
        try {
            // Hash the provided token
            const hashedToken = crypto.createHash('sha256').update(data.token).digest('hex');

            // Find user with valid reset token
            const user = await User.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: new Date() }
            }).select('+resetPasswordToken +resetPasswordExpires');

            if (!user) {
                throw new Error('Invalid or expired reset token');
            }

            // Update password and clear reset token
            user.password = data.newPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            logger.info(`Password reset completed for user: ${user.email}`);
        } catch (error) {
            logger.error('Password reset error:', error);
            throw error;
        }
    }

    async deleteAccount(userId: string, password: string): Promise<void> {
        try {
            const user = await User.findById(userId).select('+password');
            if (!user) {
                throw new Error('User not found');
            }

            // Verify password before deletion
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                throw new Error('Password is incorrect');
            }

            await User.findByIdAndDelete(userId);

            logger.info(`Account deleted for user: ${user.email}`);
        } catch (error) {
            logger.error('Account deletion error:', error);
            throw error;
        }
    }
}

export const authService = new AuthService();