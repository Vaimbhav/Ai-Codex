import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
    user?: IUser;
}

export interface JWTPayload {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}

export const authMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
            return;
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            logger.error('JWT_SECRET not configured');
            res.status(500).json({
                success: false,
                error: 'Authentication service not configured'
            });
            return;
        }

        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

        const user = await User.findById(decoded.userId);
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'User not found'
            });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        logger.error('Authentication error:', error);

        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
            return;
        }

        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: 'Token expired'
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

export const optionalAuthMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = extractToken(req);

        if (!token) {
            next();
            return;
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            next();
            return;
        }

        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        const user = await User.findById(decoded.userId);

        if (user) {
            req.user = user;
        }

        next();
    } catch (error) {
        // For optional auth, we just log the error and continue
        logger.warn('Optional authentication failed:', error);
        next();
    }
};

// Middleware that requires JWT token - no more API key bypass
export const requireAuthentication = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Authentication required. Please sign in to access this feature.'
            });
            return;
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            logger.error('JWT_SECRET not configured');
            res.status(500).json({
                success: false,
                error: 'Authentication service not configured'
            });
            return;
        }

        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        const user = await User.findById(decoded.userId);

        if (!user) {
            res.status(401).json({
                success: false,
                error: 'User not found. Please sign in again.'
            });
            return;
        }

        req.user = user;
        next();

    } catch (error) {
        logger.error('Authentication error:', error);

        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                error: 'Invalid token. Please sign in again.'
            });
            return;
        }

        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: 'Token expired. Please sign in again.'
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
}; function extractToken(req: Request): string | null {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Check cookies
    const cookieToken = req.cookies?.token;
    if (cookieToken) {
        return cookieToken;
    }

    // Check query parameter (for WebSocket or special cases)
    const queryToken = req.query.token as string;
    if (queryToken) {
        return queryToken;
    }

    return null;
}

export const generateToken = (user: IUser): string => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
    }

    const payload: JWTPayload = {
        userId: (user._id as string).toString(),
        email: user.email
    };

    return jwt.sign(payload, jwtSecret, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    } as jwt.SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
    }

    return jwt.verify(token, jwtSecret) as JWTPayload;
};