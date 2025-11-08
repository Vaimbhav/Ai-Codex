import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from './AuthForm';
import { User, Shield } from 'lucide-react';
import AccessibleButton from './AccessibleButton';

interface AuthGuardProps {
    children: React.ReactNode;
    requireAuth?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
    children,
    requireAuth = true,
}) => {
    const {
        isAuthenticated,
        user,
        setAuthMode,
    } = useAuth();

    const [showAuthForm, setShowAuthForm] = useState(false);

    // If auth is not required, render children
    if (!requireAuth) {
        return <>{children}</>;
    }

    // Only allow authenticated users with actual accounts
    if (isAuthenticated && user) {
        return <>{children}</>;
    }

    // Show authentication form
    if (showAuthForm) {
        return (
            <AuthForm
                onSuccess={() => {
                    setShowAuthForm(false);
                }}
            />
        );
    }

    // Show authentication requirement screen
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-8"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Authentication Required
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Please sign in to access AICodeX
                    </p>
                </div>

                {/* Authentication Required */}
                <div className="space-y-4">
                    {/* Primary CTA - Create Account / Login */}
                    <AccessibleButton
                        onClick={() => {
                            setAuthMode('enhanced');
                            setShowAuthForm(true);
                        }}
                        variant="primary"
                        className="w-full p-4 h-auto text-left"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <User className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className="font-semibold text-white mb-1">
                                    Sign In or Create Account
                                </h3>
                                <p className="text-sm text-white/80">
                                    Get access to AICodeX with your account
                                </p>
                            </div>
                        </div>
                    </AccessibleButton>

                    {/* Info about requirements */}
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-center mb-2">
                            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                            <p className="font-medium text-blue-900 dark:text-blue-100">Account Required</p>
                        </div>
                        <p className="text-blue-800 dark:text-blue-200">
                            All users must create an account to access the chat interface and upload files.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                        By continuing, you agree to our terms and privacy policy
                    </p>
                </div>
            </motion.div>
        </div>
    );
};