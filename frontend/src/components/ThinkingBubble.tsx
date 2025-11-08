import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThinkingBubbleProps {
    show: boolean;
    messages?: string[];
}

export const ThinkingBubble: React.FC<ThinkingBubbleProps> = ({
    show,
    messages = ['Thinking...', 'Processing...', 'Analyzing...', 'Generating response...']
}) => {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    useEffect(() => {
        if (!show) return;

        const interval = setInterval(() => {
            setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        }, 2000);

        return () => clearInterval(interval);
    }, [show, messages]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    transition={{ duration: 0.3 }}
                    className="flex gap-4"
                >
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">AI</span>
                    </div>
                    <div className="flex-1">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 max-w-xs">
                            <div className="flex items-center gap-2">
                                <motion.div
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="text-gray-600 dark:text-gray-400 text-sm"
                                >
                                    {messages[currentMessageIndex]}
                                </motion.div>
                                <div className="flex gap-1">
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                        className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                                    />
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                        className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                                    />
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                        className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};