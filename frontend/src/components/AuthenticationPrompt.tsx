import React from 'react';
import { motion } from 'framer-motion';
import { Lock, LogIn, UserPlus } from 'lucide-react';
import AccessibleButton from './AccessibleButton';

interface AuthenticationPromptProps {
    onLogin: () => void;
    onRegister: () => void;
}

export const AuthenticationPrompt: React.FC<AuthenticationPromptProps> = ({ onLogin, onRegister }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4"
        >
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                Authentication Required
            </h2>

            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
                Please sign in or create an account to use the AICodeX chat features.
                Your conversations will be saved and synced across devices.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <AccessibleButton
                    onClick={onLogin}
                    variant="primary"
                    className="flex-1 flex items-center justify-center gap-2"
                >
                    <LogIn className="w-4 h-4" />
                    Sign In
                </AccessibleButton>

                <AccessibleButton
                    onClick={onRegister}
                    variant="outline"
                    className="flex-1 flex items-center justify-center gap-2"
                >
                    <UserPlus className="w-4 h-4" />
                    Sign Up
                </AccessibleButton>
            </div>

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-md">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>New to AICodeX?</strong> Create a free account to get started with
                    intelligent code assistance, file uploads, and persistent chat history.
                </p>
            </div>
        </motion.div>
    );
};