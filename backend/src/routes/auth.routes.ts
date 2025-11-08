import { Router } from 'express';
import {
    register,
    login,
    logout,
    getProfile,
    updateProfile,
    updateApiKey,
    getApiKey,
    changePassword,
    initiatePasswordReset,
    resetPassword,
    deleteAccount,
    registerValidation,
    loginValidation,
    changePasswordValidation,
    resetPasswordValidation
} from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', logout);
router.post('/forgot-password', initiatePasswordReset);
router.post('/reset-password', resetPasswordValidation, resetPassword);

// Protected routes (require authentication)
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.put('/api-key', authMiddleware, updateApiKey);
router.get('/api-key', authMiddleware, getApiKey);
router.put('/change-password', authMiddleware, changePasswordValidation, changePassword);
router.delete('/account', authMiddleware, deleteAccount);

export default router;