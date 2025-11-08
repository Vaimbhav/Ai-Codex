import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    LogOut,
    Key,
    X,
    ChevronDown,
    Trash2,
    Menu
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ChatSession } from '../services/chatSession';
import { UserFiles } from './SessionFiles';
import { ConfirmationModal } from './ConfirmationModal';

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    onNewChat: () => void;
    sessions: ChatSession[];
    onSessionSelect: (sessionId: string) => void;
    onDeleteSession: (sessionId: string) => void;
    activeSessionId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onToggle,
    onNewChat,
    sessions,
    onSessionSelect,
    onDeleteSession,
    activeSessionId
}) => {
    const { user, logout, setApiKey: saveApiKey, apiKey: currentApiKey } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [apiKey, setApiKey] = useState(currentApiKey || '');
    const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

    const handleLogout = () => {
        logout();
    };

    const handleSaveApiKey = () => {
        if (apiKey.trim()) {
            saveApiKey(apiKey.trim());
            setShowApiKeyModal(false);
        }
    };

    const handleDeleteApiKey = () => {
        setApiKey('');
        saveApiKey('');
        setShowApiKeyModal(false);
    };

    const handleDeleteSession = (sessionId: string) => {
        console.log('Delete session button clicked for:', sessionId);

        // Prevent multiple clicks during deletion
        if (deletingSessionId === sessionId) {
            console.log('Already deleting this session, ignoring click');
            return;
        }

        console.log('Showing session confirmation modal...');
        setSessionToDelete(sessionId);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteSession = async () => {
        if (!sessionToDelete) return;

        console.log('Starting deletion process for session:', sessionToDelete);
        setDeletingSessionId(sessionToDelete);
        setShowDeleteConfirm(false);

        try {
            console.log('Calling onDeleteSession...');
            await onDeleteSession(sessionToDelete);
            console.log('Session deletion completed successfully');
        } catch (error) {
            console.error('Error deleting session:', error);
            alert('Failed to delete chat session: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setDeletingSessionId(null);
            setSessionToDelete(null);
            console.log('Deletion process finished');
        }
    };

    const cancelDeleteSession = () => {
        console.log('User cancelled session deletion');
        setShowDeleteConfirm(false);
        setSessionToDelete(null);
    };

    const getUserInitials = (name: string): string => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const formatTimestamp = (date: Date | string): string => {
        const now = new Date();
        const dateObj = typeof date === 'string' ? new Date(date) : date;

        if (isNaN(dateObj.getTime())) {
            return 'Unknown';
        }

        const diff = now.getTime() - dateObj.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return dateObj.toLocaleDateString();
    };

    const collapsedSidebarContent = (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-950 text-gray-700 dark:text-white w-16">
            <div className="p-3 border-b border-gray-200 dark:border-gray-800">
                <button
                    onClick={onToggle}
                    className="w-10 h-10 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
                    title="Expand sidebar"
                >
                    <Menu className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
                <button
                    onClick={onNewChat}
                    className="w-10 h-10 mt-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
                    title="New Chat"
                >
                    <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2 sidebar-scroll">
                <div className="space-y-1 px-2">
                    {sessions.slice(0, 5).map((session) => (
                        <button
                            key={session.id}
                            onClick={() => onSessionSelect(session.id)}
                            className={`w-10 h-10 rounded-lg transition-colors flex items-center justify-center ${activeSessionId === session.id
                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white'
                                : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
                                }`}
                            title={session.title}
                        >
                            <div className={`w-2 h-2 rounded-full ${activeSessionId === session.id ? 'bg-gray-700 dark:bg-white' : 'bg-gray-400'}`} />
                        </button>
                    ))}
                </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 p-3">
                <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-xs font-medium hover:bg-blue-700 transition-colors"
                    title={user?.name || 'User'}
                >
                    {user ? getUserInitials(user.name) : 'U'}
                </button>
            </div>
        </div>
    );

    const expandedSidebarContent = (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-white w-full overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={onToggle}
                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                        title="Collapse sidebar"
                    >
                        <Menu className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <button
                    onClick={onNewChat}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <Plus className="w-5 h-5 text-gray-700 dark:text-white" />
                    <span className="font-medium text-gray-700 dark:text-white">New Chat</span>
                </button>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto sidebar-scroll">
                {/* User Files - At the top and always visible */}
                <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
                    <UserFiles
                        onFileSelect={(file) => {
                            console.log('File selected:', file);
                        }}
                    />
                </div>

                {/* Chat Sessions */}
                <div className="py-4">
                    <div className="px-4 mb-2">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Recent Chats
                        </h3>
                    </div>

                    <div className="space-y-1 px-4">
                        {sessions.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                                No chat sessions yet. Click "New Chat" to start!
                            </div>
                        ) : (
                            sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className={`w-full rounded-lg transition-colors group ${activeSessionId === session.id
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                                        }`}
                                >
                                    <div className="flex items-start gap-3 w-full p-3">
                                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${activeSessionId === session.id ? 'bg-gray-700 dark:bg-white' : 'bg-gray-400'}`} />
                                        <div
                                            className="flex-1 min-w-0 overflow-hidden cursor-pointer"
                                            onClick={() => onSessionSelect(session.id)}
                                        >
                                            <p className="text-sm font-medium truncate">
                                                {session.title}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-1">
                                                {session.lastMessage || 'No messages yet'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                {formatTimestamp(session.timestamp)}
                                            </p>
                                        </div>
                                        {/* Delete button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                if (deletingSessionId !== session.id) {
                                                    handleDeleteSession(session.id);
                                                }
                                            }}
                                            onTouchStart={(e) => {
                                                e.stopPropagation();
                                            }}
                                            className="session-delete-button p-2 min-w-[32px] min-h-[32px] rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center flex-shrink-0 cursor-pointer active:bg-gray-300 dark:active:bg-gray-600"
                                            title={deletingSessionId === session.id ? "Deleting..." : "Delete chat session"}
                                            type="button"

                                        >
                                            <Trash2 className={`w-4 h-4 ${deletingSessionId === session.id ? 'text-gray-400' : 'text-red-500'}`} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* User Profile Section - Fixed at bottom */}
            <div className="border-t border-gray-200 dark:border-gray-800 p-4 flex-shrink-0">
                <div className="relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {user ? getUserInitials(user.name) : 'U'}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-medium truncate">
                                {user?.name || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user?.email || 'user@example.com'}
                            </p>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${showUserMenu ? 'rotate-180' : ''
                            }`} />
                    </button>

                    <AnimatePresence>
                        {showUserMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
                            >
                                <button
                                    onClick={() => {
                                        setApiKey(currentApiKey || '');
                                        setShowApiKeyModal(true);
                                        setShowUserMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left text-gray-700 dark:text-white"
                                >
                                    <Key className="w-4 h-4" />
                                    <span className="text-sm">Manage API Key</span>
                                </button>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left text-red-500 dark:text-red-400"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="text-sm">Sign out</span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <style>{`
                .sidebar-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .sidebar-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .sidebar-scroll::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.5);
                    border-radius: 3px;
                }
                .sidebar-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(156, 163, 175, 0.7);
                }
                .dark .sidebar-scroll::-webkit-scrollbar-thumb {
                    background: rgba(75, 85, 99, 0.5);
                }
                .dark .sidebar-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(75, 85, 99, 0.7);
                }
                .session-delete-button {
                    -webkit-tap-highlight-color: transparent;
                    -webkit-touch-callout: none;
                    -webkit-user-select: none;
                    -khtml-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                    touch-action: manipulation;
                }
            `}</style>

            {/* Desktop Sidebar */}
            <div className={`hidden md:block transition-all duration-300 flex-shrink-0 h-screen ${isOpen ? 'w-96' : 'w-16'
                }`}>
                <div className={`h-full ${isOpen ? 'w-96' : 'w-16'} overflow-hidden`}>
                    {isOpen ? expandedSidebarContent : collapsedSidebarContent}
                </div>
            </div>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
                            onClick={onToggle}
                        />

                        <motion.div
                            initial={{ x: -384 }}
                            animate={{ x: 0 }}
                            exit={{ x: -384 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="md:hidden fixed left-0 top-0 w-96 max-w-[85vw] h-full z-50 overflow-hidden"
                        >
                            {expandedSidebarContent}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* API Key Modal */}
            <AnimatePresence>
                {showApiKeyModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowApiKeyModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Manage API Key
                                </h3>
                                <button
                                    onClick={() => setShowApiKeyModal(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    title="Close modal"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Gemini API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="Enter your Gemini API key..."
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={handleSaveApiKey}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Save API Key
                                    </button>
                                    <button
                                        onClick={handleDeleteApiKey}
                                        className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors"
                                        title="Delete API Key"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Session Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                title="Delete Chat Session"
                message="Are you sure you want to delete this chat session? This action cannot be undone."
                onConfirm={confirmDeleteSession}
                onCancel={cancelDeleteSession}
                confirmText="Delete"
                cancelText="Cancel"
            />
        </>
    );
};