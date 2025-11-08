import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, StopCircle, Menu, Plus } from 'lucide-react';
import { Sidebar } from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { AuthenticationPrompt } from './AuthenticationPrompt';
import { ApiKeyRequiredPrompt } from './ApiKeyRequiredPrompt';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useChatStore } from '../store/chatStore';
import { useChatStreaming } from '../hooks/useChatStreaming';
import { useAuth } from '../contexts/AuthContext';
import { FileUploadService } from '../services/fileUpload';
import { triggerFileUpdate } from '../hooks/useFileManager';

interface ChatLayoutProps {
    children?: React.ReactNode;
}

export const ChatLayout: React.FC<ChatLayoutProps> = () => {
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        return window.innerWidth >= 768;
    });
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    const [input, setInput] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { isAuthenticated, apiKey } = useAuth();

    const hasApiKey = Boolean(apiKey || localStorage.getItem('user_gemini_api_key'));

    const {
        sessions,
        activeSessionId,
        createNewSession,
        selectSession,
        addMessage,
        deleteSession,
        getActiveSession,
        syncWithBackend
    } = useChatStore();

    const activeSession = getActiveSession();

    const {
        isStreaming,
        streamingMessage,
        sendMessage,
        stopStreaming,
        clearStreamingMessage
    } = useChatStreaming({
        sessionId: activeSessionId || '',
        onMessageComplete: async (message) => {
            if (activeSessionId) {
                try {
                    await addMessage(activeSessionId, {
                        content: message.content,
                        role: 'assistant'
                    });
                    setTimeout(() => {
                        clearStreamingMessage();
                    }, 100);
                } catch (error) {
                    console.error('Failed to save assistant message:', error);
                }
            }
        },
        onError: (error) => {
            console.error('Streaming error:', error);
        }
    });

    useEffect(() => {
        const syncSession = async () => {
            if (sessionId && sessionId !== activeSessionId) {
                try {
                    await selectSession(sessionId);
                } catch (error) {
                    console.error('Failed to select session from URL:', error);

                    // If session selection failed due to deletion, handle gracefully
                    if (error instanceof Error && error.message.includes('Session deleted')) {
                        if (error.message.includes('Redirecting to session')) {
                            // Extract new session ID from error message and redirect
                            const newSessionMatch = error.message.match(/Redirecting to session (\w+)/);
                            if (newSessionMatch) {
                                navigate(`/chat/${newSessionMatch[1]}`, { replace: true });
                            }
                        } else {
                            // No sessions available, redirect to home
                            navigate('/', { replace: true });
                        }
                    }
                }
            } else if (!sessionId && activeSessionId) {
                navigate(`/chat/${activeSessionId}`, { replace: true });
            }
        };

        syncSession();
    }, [sessionId, activeSessionId, selectSession, navigate]);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            const wasMobile = isMobile;
            setIsMobile(mobile);

            if (mobile && !wasMobile) {
                setSidebarOpen(false);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [isMobile]);

    const handleNewChat = async () => {
        if (!isAuthenticated) {
            alert('Please sign in to create a new chat.');
            return;
        }

        try {
            const newSessionId = await createNewSession();
            navigate(`/chat/${newSessionId}`);

            if (isMobile) {
                setSidebarOpen(false);
            }
        } catch (error) {
            console.error('Failed to create new chat:', error);
            const errorMessage = (error as Error).message;
            if (errorMessage.includes('Network Error') || errorMessage.includes('fetch')) {
                alert('Cannot connect to server. Please ensure the backend is running.');
            } else {
                alert('Failed to create new chat: ' + errorMessage);
            }
        }
    };

    const handleSessionSelect = async (sessionId: string) => {
        try {
            await selectSession(sessionId);
            navigate(`/chat/${sessionId}`);

            if (isMobile) {
                setSidebarOpen(false);
            }
        } catch (error) {
            console.error('Failed to select session:', error);
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!isAuthenticated) {
            alert('Please sign in to delete chat sessions.');
            return;
        }

        try {
            await deleteSession(sessionId);

            if (sessionId === activeSessionId) {
                const remainingSessions = sessions.filter(s => s.id !== sessionId);
                if (remainingSessions.length > 0) {
                    navigate(`/chat/${remainingSessions[0].id}`);
                } else {
                    const newSessionId = await createNewSession();
                    navigate(`/chat/${newSessionId}`);
                }
            }
        } catch (error) {
            console.error('Failed to delete session:', error);
            const errorMessage = (error as Error).message;
            alert('Failed to delete chat session: ' + errorMessage);
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeSession?.messages, streamingMessage, isStreaming]);

    // Auto-focus the textarea when component mounts and when session changes
    useEffect(() => {
        if (isAuthenticated && hasApiKey && !isStreaming && textareaRef.current) {
            // Small delay to ensure component is fully rendered
            const timeoutId = setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);

            return () => clearTimeout(timeoutId);
        }
    }, [isAuthenticated, hasApiKey, isStreaming, activeSessionId]);

    // Focus textarea after streaming ends
    useEffect(() => {
        if (!isStreaming && isAuthenticated && hasApiKey && textareaRef.current) {
            const timeoutId = setTimeout(() => {
                textareaRef.current?.focus();
            }, 200);

            return () => clearTimeout(timeoutId);
        }
    }, [isStreaming, isAuthenticated, hasApiKey]);

    // Periodic synchronization to keep sessions in sync across browser instances
    useEffect(() => {
        if (!isAuthenticated) return;

        const syncInterval = setInterval(async () => {
            try {
                const syncResult = await syncWithBackend();
                if (syncResult?.activeSessionChanged && syncResult.newActiveId) {
                    // If the active session changed due to deletion, navigate to the new active session
                    navigate(`/chat/${syncResult.newActiveId}`, { replace: true });
                } else if (syncResult?.activeSessionChanged && !syncResult.newActiveId) {
                    // If no sessions are left, redirect to home
                    navigate('/', { replace: true });
                }
            } catch (error) {
                console.error('Periodic sync failed:', error);
            }
        }, 10000); // Sync every 10 seconds

        return () => clearInterval(syncInterval);
    }, [isAuthenticated, syncWithBackend, navigate]);

    // Sync when window gains focus (user switches back to this tab)
    useEffect(() => {
        if (!isAuthenticated) return;

        const handleWindowFocus = async () => {
            try {
                const syncResult = await syncWithBackend();
                if (syncResult?.activeSessionChanged && syncResult.newActiveId) {
                    navigate(`/chat/${syncResult.newActiveId}`, { replace: true });
                } else if (syncResult?.activeSessionChanged && !syncResult.newActiveId) {
                    navigate('/', { replace: true });
                }
            } catch (error) {
                console.error('Focus sync failed:', error);
            }
        };

        window.addEventListener('focus', handleWindowFocus);
        return () => window.removeEventListener('focus', handleWindowFocus);
    }, [isAuthenticated, syncWithBackend, navigate]); const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isStreaming || !activeSessionId || !isAuthenticated || !hasApiKey) return;

        const userMessage = input.trim();
        setInput('');

        // Keep focus on textarea after sending message
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 50);

        try {
            await addMessage(activeSessionId, {
                content: userMessage,
                role: 'user'
            });

            await sendMessage(userMessage);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        if (!isAuthenticated || !hasApiKey) {
            alert('Please sign in and set your API key to upload files.');
            return;
        }

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const supportedExtensions = [
            '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c',
            '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
            '.html', '.css', '.scss', '.sass', '.json', '.xml', '.yaml', '.yml',
            '.md', '.txt', '.sql'
        ];

        const validFiles = files.filter(file => {
            const isValidType = supportedExtensions.some(ext =>
                file.name.toLowerCase().endsWith(ext)
            );
            const isValidSize = file.size > 0 && file.size <= 5 * 1024 * 1024;
            return isValidType && isValidSize;
        });

        if (validFiles.length === 0) {
            alert('No valid files to upload. Supported formats: ' + supportedExtensions.join(', ') + '\nMax size: 5MB per file');
            return;
        }

        try {
            if (validFiles.length === 1) {
                const result = await FileUploadService.uploadSingleFile(validFiles[0], apiKey || localStorage.getItem('user_gemini_api_key') || undefined);
                if (result.success) {
                    if (activeSessionId) {
                        await FileUploadService.assignFilesToSession(activeSessionId);
                    }
                    triggerFileUpdate();
                    alert(`File "${result.data.file.name}" uploaded successfully!`);
                }
            } else {
                const result = await FileUploadService.uploadMultipleFiles(validFiles, apiKey || localStorage.getItem('user_gemini_api_key') || undefined);
                if (result.success) {
                    if (activeSessionId) {
                        await FileUploadService.assignFilesToSession(activeSessionId);
                    }
                    triggerFileUpdate();
                    alert(`${result.data.files.length} files uploaded successfully!`);
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const handleFileInputClick = () => {
        if (!isAuthenticated || !hasApiKey) {
            alert('Please sign in and set your API key to upload files.');
            return;
        }
        fileInputRef.current?.click();
    };

    const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const supportedExtensions = [
            '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c',
            '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
            '.html', '.css', '.scss', '.sass', '.json', '.xml', '.yaml', '.yml',
            '.md', '.txt', '.sql'
        ];

        const validFiles = files.filter(file => {
            const isValidType = supportedExtensions.some(ext =>
                file.name.toLowerCase().endsWith(ext)
            );
            const isValidSize = file.size > 0 && file.size <= 5 * 1024 * 1024;
            return isValidType && isValidSize;
        });

        if (validFiles.length === 0) {
            alert('No valid files to upload. Supported formats: ' + supportedExtensions.join(', ') + '\nMax size: 5MB per file');
            return;
        }

        try {
            if (validFiles.length === 1) {
                const result = await FileUploadService.uploadSingleFile(validFiles[0], apiKey || localStorage.getItem('user_gemini_api_key') || undefined);
                if (result.success) {
                    if (activeSessionId) {
                        await FileUploadService.assignFilesToSession(activeSessionId);
                    }
                    triggerFileUpdate();
                    alert(`File "${result.data.file.name}" uploaded successfully!`);
                }
            } else {
                const result = await FileUploadService.uploadMultipleFiles(validFiles, apiKey || localStorage.getItem('user_gemini_api_key') || undefined);
                if (result.success) {
                    if (activeSessionId) {
                        await FileUploadService.assignFilesToSession(activeSessionId);
                    }
                    triggerFileUpdate();
                    alert(`${result.data.files.length} files uploaded successfully!`);
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={toggleSidebar}
                onNewChat={handleNewChat}
                sessions={sessions}
                onSessionSelect={handleSessionSelect}
                onDeleteSession={handleDeleteSession}
                activeSessionId={activeSessionId || undefined}
            />

            <div className="flex-1 flex flex-col min-w-0">
                <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        {isMobile && (
                            <button
                                onClick={toggleSidebar}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-2"
                                title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                            >
                                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        )}

                        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                            AICodeX
                        </h1>
                    </div>

                    <div className="flex items-center">
                        <ThemeToggle />
                    </div>
                </div>

                <div
                    className={`flex-1 overflow-hidden flex flex-col bg-white dark:bg-gray-800 transition-colors ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-400' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {activeSession ? (
                        <div className="flex-1 flex flex-col h-full">
                            <div className="flex-1 overflow-y-auto">
                                <div className="w-full">
                                    {activeSession.messages.length === 0 ? (
                                        <div className="max-w-3xl mx-auto px-4 py-6">
                                            {!isAuthenticated ? (
                                                <AuthenticationPrompt
                                                    onLogin={() => navigate('/auth?mode=login')}
                                                    onRegister={() => navigate('/auth?mode=register')}
                                                />
                                            ) : !hasApiKey ? (
                                                <ApiKeyRequiredPrompt />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
                                                        <span className="text-white text-xl font-bold">AI</span>
                                                    </div>
                                                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                                                        How can I help you today?
                                                    </h2>
                                                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                                                        Ask me anything about coding, development, or technical questions
                                                    </p>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                                                        {[
                                                            "Explain React hooks",
                                                            "Help me debug this code",
                                                            "Best practices for API design",
                                                            "How to optimize database queries"
                                                        ].map((prompt, index) => (
                                                            <button
                                                                key={index}
                                                                onClick={() => setInput(prompt)}
                                                                className="p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm text-gray-700 dark:text-gray-300"
                                                            >
                                                                {prompt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-4 py-4">
                                            {activeSession.messages.map((message, index) => (
                                                message.role === 'user' ? (
                                                    <div key={message.id || index} className="w-full px-6 flex justify-end">
                                                        <div className="max-w-2xl bg-blue-600 text-white rounded-2xl px-4 py-3">
                                                            <div className="prose prose-sm max-w-none prose-invert">
                                                                <p className="text-white whitespace-pre-wrap m-0">
                                                                    {message.content}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div key={message.id || index} className="w-full py-6 bg-gray-50 dark:bg-gray-800/50">
                                                        <div className="max-w-4xl mx-auto px-6">
                                                            <MarkdownRenderer
                                                                content={message.content}
                                                                className="text-gray-900 dark:text-white"
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            ))}

                                            {/* Loading bubble - shows when streaming starts */}
                                            {isStreaming && !streamingMessage && (
                                                <div className="w-full py-6 bg-gray-50 dark:bg-gray-800/50">
                                                    <div className="max-w-4xl mx-auto px-6">
                                                        <div className="inline-flex items-center justify-center bg-white dark:bg-gray-700 rounded-3xl px-6 py-4 shadow-sm border border-gray-200 dark:border-gray-600">
                                                            <div className="flex space-x-2">
                                                                <div
                                                                    className="w-3 h-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full animate-bounce"
                                                                    style={{ animationDelay: '0ms', animationDuration: '1s' }}
                                                                ></div>
                                                                <div
                                                                    className="w-3 h-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full animate-bounce"
                                                                    style={{ animationDelay: '200ms', animationDuration: '1s' }}
                                                                ></div>
                                                                <div
                                                                    className="w-3 h-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full animate-bounce"
                                                                    style={{ animationDelay: '400ms', animationDuration: '1s' }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Streaming message */}
                                            {streamingMessage && (
                                                <div className="w-full py-6 bg-gray-50 dark:bg-gray-800/50">
                                                    <div className="max-w-4xl mx-auto px-6">
                                                        <MarkdownRenderer
                                                            content={streamingMessage?.content || ''}
                                                            className="text-gray-900 dark:text-white"
                                                        />
                                                        <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse"></span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>

                            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="max-w-3xl mx-auto p-4">
                                    <form onSubmit={handleSubmit} className="relative">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleFileInputClick}
                                                disabled={!isAuthenticated || !hasApiKey}
                                                className="flex-shrink-0 p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-400 disabled:hover:bg-gray-400 dark:disabled:bg-gray-600 dark:disabled:hover:bg-gray-600 disabled:cursor-not-allowed transition-colors w-10 h-10 flex items-center justify-center"
                                                title="Upload files"
                                            >
                                                <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400 disabled:text-gray-200 dark:disabled:text-gray-500" />
                                            </button>

                                            <div className="flex-1 relative bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus-within:border-blue-500 dark:focus-within:border-blue-400">
                                                <textarea
                                                    ref={textareaRef}
                                                    value={input}
                                                    onChange={(e) => setInput(e.target.value)}
                                                    onKeyDown={handleKeyDown}
                                                    placeholder={
                                                        !isAuthenticated
                                                            ? "Please sign in to start chatting..."
                                                            : !hasApiKey
                                                                ? "Please set your API key in the sidebar to start chatting..."
                                                                : "Message AICodeX..."
                                                    }
                                                    className="w-full p-3 pr-12 bg-transparent border-none outline-none resize-none max-h-[120px] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 min-h-[44px] h-auto leading-tight rounded-xl"
                                                    rows={1}
                                                    disabled={isStreaming || !isAuthenticated || !hasApiKey}
                                                />

                                                {isStreaming ? (
                                                    <button
                                                        type="button"
                                                        onClick={stopStreaming}
                                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors w-8 h-8 flex items-center justify-center"
                                                        title="Stop generating"
                                                    >
                                                        <StopCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="submit"
                                                        disabled={!input.trim() || !isAuthenticated || !hasApiKey}
                                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:hover:bg-gray-400 dark:disabled:bg-gray-600 dark:disabled:hover:bg-gray-600 disabled:cursor-not-allowed transition-colors w-8 h-8 flex items-center justify-center"
                                                        title="Send message"
                                                    >
                                                        <Send className="w-4 h-4 text-white disabled:text-gray-200 dark:disabled:text-gray-400" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                                            AI-Codex can make mistakes. Consider checking important information.
                                        </div>
                                    </form>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept=".ts,.tsx,.js,.jsx,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.swift,.kt,.scala,.html,.css,.scss,.sass,.json,.xml,.yaml,.yml,.md,.txt,.sql"
                                        onChange={handleFileInputChange}
                                        className="hidden"
                                        aria-label="Upload files"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                            <div className="text-center max-w-md">
                                <div className="w-16 h-16 mx-auto mb-4 opacity-50 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-2xl font-bold">AI</span>
                                </div>
                                <h2 className="text-2xl font-semibold mb-2">Welcome to AICodeX</h2>
                                <p className="mb-4">Your ChatGPT-style coding assistant</p>
                                <div className="space-y-2 text-sm">
                                    <p>✨ Click "New Chat" to start a conversation</p>
                                    <p>🔑 Use the user menu to manage your API key</p>
                                    <p>🌙 Toggle between light and dark themes</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};





// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { Send, StopCircle, Menu, Plus } from 'lucide-react';
// import { Sidebar } from './Sidebar';
// import ThemeToggle from './ThemeToggle';
// import { AuthenticationPrompt } from './AuthenticationPrompt';
// import { ApiKeyRequiredPrompt } from './ApiKeyRequiredPrompt';
// import { MarkdownRenderer } from './MarkdownRenderer';
// import { ThinkingBubble } from './ThinkingBubble';
// import { useChatStore } from '../store/chatStore';
// import { useChatStreaming } from '../hooks/useChatStreaming';
// import { useAuth } from '../contexts/AuthContext';
// import { FileUploadService } from '../services/fileUpload';
// import { triggerFileUpdate } from '../hooks/useFileManager';

// interface ChatLayoutProps {
//     children?: React.ReactNode;
// }

// export const ChatLayout: React.FC<ChatLayoutProps> = () => {
//     const [sidebarOpen, setSidebarOpen] = useState(() => {
//         // Initialize based on screen size
//         return window.innerWidth >= 768; // Desktop default: open, Mobile default: closed
//     });
//     const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
//     const [input, setInput] = useState('');
//     const [isDragOver, setIsDragOver] = useState(false);
//     const messagesEndRef = useRef<HTMLDivElement>(null);
//     const fileInputRef = useRef<HTMLInputElement>(null);

//     const { sessionId } = useParams<{ sessionId: string }>();
//     const navigate = useNavigate();
//     const { isAuthenticated, apiKey } = useAuth();

//     // Check if user has API key set
//     const hasApiKey = Boolean(apiKey || localStorage.getItem('user_gemini_api_key'));

//     const {
//         sessions,
//         activeSessionId,
//         createNewSession,
//         selectSession,
//         addMessage,
//         deleteSession,
//         getActiveSession
//     } = useChatStore();

//     const activeSession = getActiveSession();

//     // Initialize streaming hook
//     const {
//         isStreaming,
//         streamingMessage,
//         sendMessage,
//         stopStreaming,
//         clearStreamingMessage
//     } = useChatStreaming({
//         sessionId: activeSessionId || '',
//         onMessageComplete: async (message) => {
//             if (activeSessionId) {
//                 try {
//                     await addMessage(activeSessionId, {
//                         content: message.content,
//                         role: 'assistant'
//                     });
//                     // Add a small delay to ensure the message is added before clearing streaming
//                     setTimeout(() => {
//                         clearStreamingMessage();
//                     }, 100);
//                 } catch (error) {
//                     console.error('Failed to save assistant message:', error);
//                 }
//             }
//         },
//         onError: (error) => {
//             console.error('Streaming error:', error);
//         }
//     });    // Sync URL with active session
//     useEffect(() => {
//         const syncSession = async () => {
//             if (sessionId && sessionId !== activeSessionId) {
//                 try {
//                     await selectSession(sessionId);
//                 } catch (error) {
//                     console.error('Failed to select session from URL:', error);
//                 }
//             } else if (!sessionId && activeSessionId) {
//                 navigate(`/chat/${activeSessionId}`, { replace: true });
//             }
//         };

//         syncSession();
//     }, [sessionId, activeSessionId, selectSession, navigate]);

//     useEffect(() => {
//         const checkMobile = () => {
//             const mobile = window.innerWidth < 768;
//             const wasMobile = isMobile;
//             setIsMobile(mobile);

//             // Only auto-close sidebar when transitioning to mobile
//             if (mobile && !wasMobile) {
//                 setSidebarOpen(false);
//             }
//             // On desktop, keep sidebar state as is
//         };

//         checkMobile();
//         window.addEventListener('resize', checkMobile);
//         return () => window.removeEventListener('resize', checkMobile);
//     }, [isMobile]);

//     const handleNewChat = async () => {
//         if (!isAuthenticated) {
//             alert('Please sign in to create a new chat.');
//             return;
//         }

//         try {
//             const newSessionId = await createNewSession();
//             navigate(`/chat/${newSessionId}`);

//             // Close sidebar on mobile after creating new chat
//             if (isMobile) {
//                 setSidebarOpen(false);
//             }
//         } catch (error) {
//             console.error('Failed to create new chat:', error);
//             const errorMessage = (error as Error).message;
//             if (errorMessage.includes('Network Error') || errorMessage.includes('fetch')) {
//                 alert('Cannot connect to server. Please ensure the backend is running.');
//             } else {
//                 alert('Failed to create new chat: ' + errorMessage);
//             }
//         }
//     };

//     const handleSessionSelect = async (sessionId: string) => {
//         try {
//             await selectSession(sessionId);
//             navigate(`/chat/${sessionId}`);

//             // Close sidebar on mobile after selecting session
//             if (isMobile) {
//                 setSidebarOpen(false);
//             }
//         } catch (error) {
//             console.error('Failed to select session:', error);
//         }
//     };

//     const handleDeleteSession = async (sessionId: string) => {
//         if (!isAuthenticated) {
//             alert('Please sign in to delete chat sessions.');
//             return;
//         }

//         try {
//             await deleteSession(sessionId);

//             // If we deleted the currently active session, navigate to the first available session or create a new one
//             if (sessionId === activeSessionId) {
//                 const remainingSessions = sessions.filter(s => s.id !== sessionId);
//                 if (remainingSessions.length > 0) {
//                     navigate(`/chat/${remainingSessions[0].id}`);
//                 } else {
//                     // No sessions left, create a new one
//                     const newSessionId = await createNewSession();
//                     navigate(`/chat/${newSessionId}`);
//                 }
//             }
//         } catch (error) {
//             console.error('Failed to delete session:', error);
//             const errorMessage = (error as Error).message;
//             alert('Failed to delete chat session: ' + errorMessage);
//         }
//     };

//     // Auto-scroll to bottom when new messages arrive
//     useEffect(() => {
//         messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//     }, [activeSession?.messages, streamingMessage]);

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         if (!input.trim() || isStreaming || !activeSessionId || !isAuthenticated || !hasApiKey) return;

//         const userMessage = input.trim();
//         setInput('');

//         // Add user message
//         try {
//             await addMessage(activeSessionId, {
//                 content: userMessage,
//                 role: 'user'
//             });

//             // Send message to streaming API
//             await sendMessage(userMessage);
//         } catch (error) {
//             console.error('Error sending message:', error);
//         }
//     };

//     const handleKeyDown = (e: React.KeyboardEvent) => {
//         if (e.key === 'Enter' && !e.shiftKey) {
//             e.preventDefault();
//             handleSubmit(e);
//         }
//     };

//     // Drag and drop handlers for file upload
//     const handleDragOver = (e: React.DragEvent) => {
//         e.preventDefault();
//         setIsDragOver(true);
//     };

//     const handleDragLeave = (e: React.DragEvent) => {
//         e.preventDefault();
//         setIsDragOver(false);
//     };

//     const handleDrop = async (e: React.DragEvent) => {
//         e.preventDefault();
//         setIsDragOver(false);

//         if (!isAuthenticated || !hasApiKey) {
//             alert('Please sign in and set your API key to upload files.');
//             return;
//         }

//         const files = Array.from(e.dataTransfer.files);
//         if (files.length === 0) return;

//         // Validate files
//         const supportedExtensions = [
//             '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c',
//             '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
//             '.html', '.css', '.scss', '.sass', '.json', '.xml', '.yaml', '.yml',
//             '.md', '.txt', '.sql'
//         ];

//         const validFiles = files.filter(file => {
//             const isValidType = supportedExtensions.some(ext =>
//                 file.name.toLowerCase().endsWith(ext)
//             );
//             const isValidSize = file.size > 0 && file.size <= 5 * 1024 * 1024; // 5MB limit
//             return isValidType && isValidSize;
//         });

//         if (validFiles.length === 0) {
//             alert('No valid files to upload. Supported formats: ' + supportedExtensions.join(', ') + '\nMax size: 5MB per file');
//             return;
//         }

//         try {
//             if (validFiles.length === 1) {
//                 // Single file upload
//                 const result = await FileUploadService.uploadSingleFile(validFiles[0], apiKey || localStorage.getItem('user_gemini_api_key') || undefined);
//                 if (result.success) {
//                     // Assign file to current session if we have an active session
//                     if (activeSessionId) {
//                         await FileUploadService.assignFilesToSession(activeSessionId);
//                     }
//                     triggerFileUpdate();
//                     alert(`File "${result.data.file.name}" uploaded successfully!`);
//                 }
//             } else {
//                 // Multiple file upload
//                 const result = await FileUploadService.uploadMultipleFiles(validFiles, apiKey || localStorage.getItem('user_gemini_api_key') || undefined);
//                 if (result.success) {
//                     // Assign files to current session if we have an active session
//                     if (activeSessionId) {
//                         await FileUploadService.assignFilesToSession(activeSessionId);
//                     }
//                     triggerFileUpdate();
//                     alert(`${result.data.files.length} files uploaded successfully!`);
//                 }
//             }
//         } catch (error) {
//             console.error('Upload error:', error);
//             alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
//         }
//     };

//     const toggleSidebar = () => {
//         setSidebarOpen(!sidebarOpen);
//     };

//     const handleFileInputClick = () => {
//         if (!isAuthenticated || !hasApiKey) {
//             alert('Please sign in and set your API key to upload files.');
//             return;
//         }
//         fileInputRef.current?.click();
//     };

//     const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//         const files = Array.from(e.target.files || []);
//         if (files.length === 0) return;

//         // Validate files
//         const supportedExtensions = [
//             '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c',
//             '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
//             '.html', '.css', '.scss', '.sass', '.json', '.xml', '.yaml', '.yml',
//             '.md', '.txt', '.sql'
//         ];

//         const validFiles = files.filter(file => {
//             const isValidType = supportedExtensions.some(ext =>
//                 file.name.toLowerCase().endsWith(ext)
//             );
//             const isValidSize = file.size > 0 && file.size <= 5 * 1024 * 1024; // 5MB limit
//             return isValidType && isValidSize;
//         });

//         if (validFiles.length === 0) {
//             alert('No valid files to upload. Supported formats: ' + supportedExtensions.join(', ') + '\nMax size: 5MB per file');
//             return;
//         }

//         try {
//             if (validFiles.length === 1) {
//                 // Single file upload
//                 const result = await FileUploadService.uploadSingleFile(validFiles[0], apiKey || localStorage.getItem('user_gemini_api_key') || undefined);
//                 if (result.success) {
//                     // Assign file to current session if we have an active session
//                     if (activeSessionId) {
//                         await FileUploadService.assignFilesToSession(activeSessionId);
//                     }
//                     triggerFileUpdate();
//                     alert(`File "${result.data.file.name}" uploaded successfully!`);
//                 }
//             } else {
//                 // Multiple file upload
//                 const result = await FileUploadService.uploadMultipleFiles(validFiles, apiKey || localStorage.getItem('user_gemini_api_key') || undefined);
//                 if (result.success) {
//                     // Assign files to current session if we have an active session
//                     if (activeSessionId) {
//                         await FileUploadService.assignFilesToSession(activeSessionId);
//                     }
//                     triggerFileUpdate();
//                     alert(`${result.data.files.length} files uploaded successfully!`);
//                 }
//             }
//         } catch (error) {
//             console.error('Upload error:', error);
//             alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
//         }

//         // Reset the file input
//         if (fileInputRef.current) {
//             fileInputRef.current.value = '';
//         }
//     };

//     return (
//         <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
//             {/* Sidebar */}
//             <Sidebar
//                 isOpen={sidebarOpen}
//                 onToggle={toggleSidebar}
//                 onNewChat={handleNewChat}
//                 sessions={sessions}
//                 onSessionSelect={handleSessionSelect}
//                 onDeleteSession={handleDeleteSession}
//                 activeSessionId={activeSessionId || undefined}
//             />

//             {/* Main Content Area */}
//             <div className="flex-1 flex flex-col min-w-0">
//                 {/* Header */}
//                 <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between bg-white dark:bg-gray-800">
//                     <div className="flex items-center gap-2">
//                         {/* Mobile menu button - always show on mobile */}
//                         {isMobile && (
//                             <button
//                                 onClick={toggleSidebar}
//                                 className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-2"
//                                 title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
//                             >
//                                 <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
//                             </button>
//                         )}

//                         <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
//                             AICodeX
//                         </h1>
//                     </div>

//                     <div className="flex items-center">
//                         <ThemeToggle />
//                     </div>
//                 </div>

//                 {/* Chat Content */}
//                 {/* Chat Content */}
//                 <div
//                     className={`flex-1 overflow-hidden flex flex-col bg-white dark:bg-gray-800 transition-colors ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-400' : ''}`}
//                     onDragOver={handleDragOver}
//                     onDragLeave={handleDragLeave}
//                     onDrop={handleDrop}
//                 >
//                     {activeSession ? (
//                         /* Active Chat Session */
//                         <div className="flex-1 flex flex-col h-full">
//                             {/* Messages Area */}
//                             <div className="flex-1 overflow-y-auto">
//                                 <div className="w-full">
//                                     {activeSession.messages.length === 0 ? (
//                                         <div className="max-w-3xl mx-auto px-4 py-6">
//                                             {!isAuthenticated ? (
//                                                 /* Authentication Required */
//                                                 <AuthenticationPrompt
//                                                     onLogin={() => navigate('/auth?mode=login')}
//                                                     onRegister={() => navigate('/auth?mode=register')}
//                                                 />
//                                             ) : !hasApiKey ? (
//                                                 /* API Key Required */
//                                                 <ApiKeyRequiredPrompt />
//                                             ) : (
//                                                 /* Welcome State for New Chat */
//                                                 <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
//                                                     <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
//                                                         <span className="text-white text-xl font-bold">AI</span>
//                                                     </div>
//                                                     <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
//                                                         How can I help you today?
//                                                     </h2>
//                                                     <p className="text-gray-600 dark:text-gray-400 mb-8">
//                                                         Ask me anything about coding, development, or technical questions
//                                                     </p>

//                                                     {/* Example Prompts */}
//                                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
//                                                         {[
//                                                             "Explain React hooks",
//                                                             "Help me debug this code",
//                                                             "Best practices for API design",
//                                                             "How to optimize database queries"
//                                                         ].map((prompt, index) => (
//                                                             <button
//                                                                 key={index}
//                                                                 onClick={() => setInput(prompt)}
//                                                                 className="p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm text-gray-700 dark:text-gray-300"
//                                                             >
//                                                                 {prompt}
//                                                             </button>
//                                                         ))}
//                                                     </div>
//                                                 </div>
//                                             )}
//                                         </div>
//                                     ) : (
//                                         /* Chat Messages */
//                                         <div className="space-y-4 py-4">
//                                             {activeSession.messages.map((message, index) => (
//                                                 message.role === 'user' ? (
//                                                     /* User Message - Right aligned with rounded border */
//                                                     <div key={message.id || index} className="w-full px-6 flex justify-end">
//                                                         <div className="max-w-2xl bg-blue-600 text-white rounded-2xl px-4 py-3">
//                                                             <div className="prose prose-sm max-w-none prose-invert">
//                                                                 <p className="text-white whitespace-pre-wrap m-0">
//                                                                     {message.content}
//                                                                 </p>
//                                                             </div>
//                                                         </div>
//                                                     </div>
//                                                 ) : (
//                                                     /* AI Message - Full width with background */
//                                                     <div key={message.id || index} className="w-full py-6 bg-white dark:bg-gray-800">
//                                                         <div className="max-w-4xl mx-auto px-6">
//                                                             <MarkdownRenderer
//                                                                 content={message.content}
//                                                                 className="text-gray-900 dark:text-white"
//                                                             />
//                                                         </div>
//                                                     </div>
//                                                 )
//                                             ))}

//                                             {/* Streaming Message */}
//                                             {streamingMessage && (
//                                                 <div className="w-full py-6 bg-white dark:bg-gray-800">
//                                                     <div className="max-w-4xl mx-auto px-6">
//                                                         <MarkdownRenderer
//                                                             content={streamingMessage?.content || ''}
//                                                             className="text-gray-900 dark:text-white"
//                                                         />
//                                                         <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse"></span>
//                                                     </div>
//                                                 </div>
//                                             )}

//                                             {/* Thinking Indicator */}
//                                             {isStreaming && !streamingMessage && (
//                                                 <div className="w-full py-6 bg-white dark:bg-gray-800">
//                                                     <div className="max-w-4xl mx-auto px-6">
//                                                         <ThinkingBubble show={true} />
//                                                     </div>
//                                                 </div>
//                                             )}
//                                         </div>
//                                     )}
//                                     <div ref={messagesEndRef} />
//                                 </div>
//                             </div>

//                             {/* Input Area - Inside right content area */}
//                             <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
//                                 <div className="max-w-3xl mx-auto p-4">
//                                     <form onSubmit={handleSubmit} className="relative">
//                                         <div className="flex items-center gap-2">
//                                             {/* File Upload Button */}
//                                             <button
//                                                 type="button"
//                                                 onClick={handleFileInputClick}
//                                                 disabled={!isAuthenticated || !hasApiKey}
//                                                 className="flex-shrink-0 p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-400 disabled:hover:bg-gray-400 dark:disabled:bg-gray-600 dark:disabled:hover:bg-gray-600 disabled:cursor-not-allowed transition-colors w-10 h-10 flex items-center justify-center"
//                                                 title="Upload files"
//                                             >
//                                                 <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400 disabled:text-gray-200 dark:disabled:text-gray-500" />
//                                             </button>

//                                             {/* Input Container with integrated send button */}
//                                             <div className="flex-1 relative bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus-within:border-blue-500 dark:focus-within:border-blue-400">
//                                                 <textarea
//                                                     value={input}
//                                                     onChange={(e) => setInput(e.target.value)}
//                                                     onKeyDown={handleKeyDown}
//                                                     placeholder={
//                                                         !isAuthenticated
//                                                             ? "Please sign in to start chatting..."
//                                                             : !hasApiKey
//                                                                 ? "Please set your API key in the sidebar to start chatting..."
//                                                                 : "Message AICodeX..."
//                                                     }
//                                                     className="w-full p-3 pr-12 bg-transparent border-none outline-none resize-none max-h-[120px] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 min-h-[44px] h-auto leading-tight rounded-xl"
//                                                     rows={1}
//                                                     disabled={isStreaming || !isAuthenticated || !hasApiKey}
//                                                 />

//                                                 {/* Send/Stop Button - Positioned inside textarea */}
//                                                 {isStreaming ? (
//                                                     <button
//                                                         type="button"
//                                                         onClick={stopStreaming}
//                                                         className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors w-8 h-8 flex items-center justify-center"
//                                                         title="Stop generating"
//                                                     >
//                                                         <StopCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
//                                                     </button>
//                                                 ) : (
//                                                     <button
//                                                         type="submit"
//                                                         disabled={!input.trim() || !isAuthenticated || !hasApiKey}
//                                                         className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:hover:bg-gray-400 dark:disabled:bg-gray-600 dark:disabled:hover:bg-gray-600 disabled:cursor-not-allowed transition-colors w-8 h-8 flex items-center justify-center"
//                                                         title="Send message"
//                                                     >
//                                                         <Send className="w-4 h-4 text-white disabled:text-gray-200 dark:disabled:text-gray-400" />
//                                                     </button>
//                                                 )}
//                                             </div>
//                                         </div>

//                                         {/* Footer Text */}
//                                         <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
//                                             AI-Codex can make mistakes. Consider checking important information.
//                                         </div>
//                                     </form>

//                                     {/* Hidden File Input */}
//                                     <input
//                                         ref={fileInputRef}
//                                         type="file"
//                                         multiple
//                                         accept=".ts,.tsx,.js,.jsx,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.swift,.kt,.scala,.html,.css,.scss,.sass,.json,.xml,.yaml,.yml,.md,.txt,.sql"
//                                         onChange={handleFileInputChange}
//                                         className="hidden"
//                                         aria-label="Upload files"
//                                     />
//                                 </div>
//                             </div>
//                         </div>
//                     ) : (
//                         /* Welcome State - No Active Session */
//                         <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
//                             <div className="text-center max-w-md">
//                                 <div className="w-16 h-16 mx-auto mb-4 opacity-50 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
//                                     <span className="text-white text-2xl font-bold">AI</span>
//                                 </div>
//                                 <h2 className="text-2xl font-semibold mb-2">Welcome to AICodeX</h2>
//                                 <p className="mb-4">Your ChatGPT-style coding assistant</p>
//                                 <div className="space-y-2 text-sm">
//                                     <p>✨ Click "New Chat" to start a conversation</p>
//                                     <p>🔑 Use the user menu to manage your API key</p>
//                                     <p>🌙 Toggle between light and dark themes</p>
//                                 </div>
//                             </div>
//                         </div>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// };