import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
    children: React.ReactNode;
    requireAuth?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
    children,
    requireAuth = true,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user } = useAuth();

    useEffect(() => {
        // If authentication is required but user is not authenticated
        if (requireAuth && (!isAuthenticated || !user)) {
            // Only redirect if not already on the home page
            if (location.pathname !== '/') {
                navigate('/', { replace: true });
            }
        }
    }, [requireAuth, isAuthenticated, user, navigate, location.pathname]);

    // If auth is not required, render children
    if (!requireAuth) {
        return <>{children}</>;
    }

    // Only allow authenticated users with actual accounts
    if (isAuthenticated && user) {
        return <>{children}</>;
    }

    // If we're on the home page and not authenticated, don't render anything
    // (the home page will handle showing the appropriate UI)
    if (location.pathname === '/') {
        return null;
    }

    // For other routes, return null as the redirect will happen via useEffect
    return null;
};