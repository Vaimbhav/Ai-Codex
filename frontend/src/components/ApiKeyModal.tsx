import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, AlertCircle, CheckCircle } from 'lucide-react';
import AccessibleButton from './AccessibleButton';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApiKeySet: (apiKey: string) => void;
    initialApiKey?: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
    isOpen,
    onClose,
    onApiKeySet,
    initialApiKey = '',
}) => {
    const [apiKey, setApiKey] = useState(initialApiKey);
    const [isValidating, setIsValidating] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        setApiKey(initialApiKey);
    }, [initialApiKey]);

    const validateApiKey = (key: string): boolean => {
        // Basic validation for Gemini API key format
        const geminiApiKeyPattern = /^AIza[0-9A-Za-z-_]{35}$/;
        return geminiApiKeyPattern.test(key);
    };

    const handleApiKeyChange = (value: string) => {
        setApiKey(value);
        setValidationError(null);

        if (value) {
            const isValidFormat = validateApiKey(value);
            setIsValid(isValidFormat);
            if (!isValidFormat) {
                setValidationError('Invalid API key format. Gemini API keys start with "AIza"');
            }
        } else {
            setIsValid(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!apiKey.trim()) {
            setValidationError('API key is required');
            return;
        }

        if (!isValid) {
            setValidationError('Please enter a valid Gemini API key');
            return;
        }

        setIsValidating(true);

        try {
            // Test the API key by making a simple request
            const response = await fetch('/api/chat/validate-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                },
            });

            if (response.ok) {
                onApiKeySet(apiKey);
                onClose();
            } else {
                const error = await response.json();
                setValidationError(error.message || 'Invalid API key');
            }
        } catch (error) {
            setValidationError('Failed to validate API key. Please check your connection.');
        } finally {
            setIsValidating(false);
        }
    };

    const handleClose = () => {
        setValidationError(null);
        setIsValidating(false);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                        <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        Enter Gemini API Key
                                    </h2>
                                </div>
                                <AccessibleButton
                                    onClick={handleClose}
                                    variant="ghost"
                                    size="sm"
                                    className="p-2"
                                    aria-label="Close modal"
                                >
                                    <X className="w-4 h-4" />
                                </AccessibleButton>
                            </div>

                            {/* Content */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="api-key-input"
                                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                                    >
                                        Gemini API Key
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="api-key-input"
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => handleApiKeyChange(e.target.value)}
                                            placeholder="AIza..."
                                            className="w-full px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                            disabled={isValidating}
                                            autoComplete="off"
                                            spellCheck={false}
                                        />
                                        {apiKey && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {isValid ? (
                                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                                ) : (
                                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {validationError && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-2 text-sm text-red-600 dark:text-red-400"
                                        >
                                            {validationError}
                                        </motion.p>
                                    )}
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        <strong>Get your API key:</strong> Visit{' '}
                                        <a
                                            href="https://makersuite.google.com/app/apikey"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline hover:no-underline"
                                        >
                                            Google AI Studio
                                        </a>{' '}
                                        to create a free Gemini API key.
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4">
                                    <AccessibleButton
                                        type="button"
                                        onClick={handleClose}
                                        variant="outline"
                                        className="flex-1"
                                        disabled={isValidating}
                                    >
                                        Cancel
                                    </AccessibleButton>
                                    <AccessibleButton
                                        type="submit"
                                        variant="primary"
                                        className="flex-1"
                                        disabled={!isValid || isValidating}
                                        loading={isValidating}
                                    >
                                        {isValidating ? 'Validating...' : 'Set API Key'}
                                    </AccessibleButton>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};