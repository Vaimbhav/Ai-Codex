import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Trash2, Clock, Sparkles } from 'lucide-react';
import { FadeIn, SlideIn } from './AnimatedLayout';

interface ChatSession {
    id: string;
    title: string;
    lastMessage: string;
    timestamp: Date;
    messageCount: number;
}

interface ChatHistoryProps {
    currentSessionId: string;
    onSessionSelect: (sessionId: string) => void;
    onSessionDelete: (sessionId: string) => void;
}

export default function ChatHistory({
    currentSessionId,
    onSessionSelect,
    onSessionDelete
}: ChatHistoryProps) {
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadChatSessions();
    }, []);

    const loadChatSessions = () => {
        // Load chat sessions from localStorage
        const savedSessions = localStorage.getItem('chat_sessions');
        if (savedSessions) {
            try {
                const sessions = JSON.parse(savedSessions) as ChatSession[];
                setChatSessions(sessions.map((session) => ({
                    ...session,
                    timestamp: new Date(session.timestamp)
                })));
            } catch (error) {
                console.error('Error loading chat sessions:', error);
            }
        }
        setIsLoading(false);
    };

    const saveSession = useCallback((sessionId: string, title: string, lastMessage: string) => {
        const existingIndex = chatSessions.findIndex(s => s.id === sessionId);
        const updatedSession: ChatSession = {
            id: sessionId,
            title: title || `Chat ${new Date().toLocaleDateString()}`,
            lastMessage: lastMessage.substring(0, 100) + (lastMessage.length > 100 ? '...' : ''),
            timestamp: new Date(),
            messageCount: (existingIndex >= 0 ? chatSessions[existingIndex].messageCount : 0) + 1
        };

        let updatedSessions;
        if (existingIndex >= 0) {
            updatedSessions = [...chatSessions];
            updatedSessions[existingIndex] = updatedSession;
        } else {
            updatedSessions = [updatedSession, ...chatSessions];
        }

        // Keep only last 20 sessions
        updatedSessions = updatedSessions.slice(0, 20);
        setChatSessions(updatedSessions);
        localStorage.setItem('chat_sessions', JSON.stringify(updatedSessions));
    }, [chatSessions]); const handleDeleteSession = (sessionId: string) => {
        const updatedSessions = chatSessions.filter(s => s.id !== sessionId);
        setChatSessions(updatedSessions);
        localStorage.setItem('chat_sessions', JSON.stringify(updatedSessions));
        onSessionDelete(sessionId);
    };

    const formatTimeAgo = (timestamp: Date) => {
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return timestamp.toLocaleDateString();
    };

    // Expose saveSession function to parent components
    useEffect(() => {
        (window as unknown as Record<string, unknown>).saveChatSession = saveSession;
        return () => {
            delete (window as unknown as Record<string, unknown>).saveChatSession;
        };
    }, [saveSession]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (chatSessions.length === 0) {
        return (
            <FadeIn>
                <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No chat history yet</p>
                    <p className="text-xs mt-1">Start a conversation to see your chat history</p>
                </div>
            </FadeIn>
        );
    }

    return (
        <div className="space-y-2">
            <FadeIn>
                <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Recent Chats</span>
                </div>
            </FadeIn>

            <div className="space-y-1 max-h-96 overflow-y-auto">
                {chatSessions.map((session, index) => (
                    <SlideIn key={session.id} delay={index * 0.05}>
                        <div
                            className={`group relative p-3 rounded-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border ${session.id === currentSessionId
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                                }`}
                            onClick={() => onSessionSelect(session.id)}
                        >
                            <div className="flex items-start gap-2">
                                <Sparkles className={`w-4 h-4 mt-0.5 flex-shrink-0 ${session.id === currentSessionId
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-gray-400'
                                    }`} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{session.title}</p>
                                    <p className="text-xs text-muted-foreground truncate mt-1">
                                        {session.lastMessage}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                        <span>{formatTimeAgo(session.timestamp)}</span>
                                        <span>•</span>
                                        <span>{session.messageCount} messages</span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSession(session.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-all"
                                    title="Delete chat"
                                >
                                    <Trash2 className="w-3 h-3 text-red-500" />
                                </button>
                            </div>
                        </div>
                    </SlideIn>
                ))}
            </div>
        </div>
    );
}