import React from 'react';
import { motion } from 'framer-motion';
import { Key, ExternalLink } from 'lucide-react';

export const ApiKeyRequiredPrompt: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4"
        >
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mb-6">
                <Key className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                API Key Required
            </h2>

            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
                To use the AI chat features, you need to provide your Gemini API key.
                Click on your profile in the sidebar and select "Manage API Key" to get started.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mb-6">
                <div className="flex-1 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg text-center text-sm">
                    Use the sidebar → Profile → Manage API Key
                </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-md">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    <strong>Get your free API key:</strong>
                </p>
                <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                    Google AI Studio
                    <ExternalLink className="w-3 h-3" />
                </a>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    Your API key is stored locally and only used for your requests.
                </p>
            </div>
        </motion.div>
    );
};