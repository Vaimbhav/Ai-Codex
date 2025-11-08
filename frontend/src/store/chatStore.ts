import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { chatSessionService, ChatSession, Message } from '../services/chatSession';

interface ChatState {
    sessions: ChatSession[];
    activeSessionId: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    // Actions
    initializeFromBackend: () => Promise<void>;
    syncWithBackend: () => Promise<{ activeSessionChanged: boolean; newActiveId: string | null } | undefined>;
    createNewSession: (title?: string) => Promise<string>;
    selectSession: (sessionId: string) => Promise<void>;
    updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
    addMessage: (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => Promise<void>;
    updateMessageContent: (sessionId: string, messageId: string, content: string) => void;
    deleteSession: (sessionId: string) => Promise<void>;
    clearSessions: () => void;
    getActiveSession: () => ChatSession | null;
    updateLastMessage: (sessionId: string, message: string) => void;
    setAuthenticationStatus: (isAuthenticated: boolean) => void;
}

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            sessions: [],
            activeSessionId: null,
            isLoading: false,
            isAuthenticated: false,

            initializeFromBackend: async () => {
                const state = get();

                if (!state.isAuthenticated) {
                    return;
                }

                set({ isLoading: true });
                try {
                    const sessions = await chatSessionService.getUserSessions();
                    const activeSession = sessions.find(s => s.isActive) || sessions[0];

                    set({
                        sessions,
                        activeSessionId: activeSession?.id || null,
                        isLoading: false
                    });
                } catch (error) {
                    console.error('Failed to initialize from backend:', error);
                    set({ isLoading: false });
                }
            },

            syncWithBackend: async () => {
                const state = get();

                if (!state.isAuthenticated) {
                    return;
                }

                try {
                    const backendSessions = await chatSessionService.getUserSessions();
                    const currentActiveId = state.activeSessionId;

                    // Check if current active session still exists
                    const activeSessionExists = backendSessions.some(s => s.id === currentActiveId);

                    // If active session was deleted, select the first available or null
                    const newActiveId = activeSessionExists
                        ? currentActiveId
                        : (backendSessions.length > 0 ? backendSessions[0].id : null);

                    set({
                        sessions: backendSessions,
                        activeSessionId: newActiveId
                    });

                    // If active session changed due to deletion, return the new active ID
                    return { activeSessionChanged: currentActiveId !== newActiveId, newActiveId };
                } catch (error) {
                    console.error('Failed to sync with backend:', error);
                    return { activeSessionChanged: false, newActiveId: null };
                }
            }, createNewSession: async (title?: string) => {
                const state = get();
                if (!state.isAuthenticated) {
                    throw new Error('Must be authenticated to create a session');
                }

                set({ isLoading: true });
                try {
                    const newSession = await chatSessionService.createSession(title);

                    set((state) => ({
                        sessions: [newSession, ...state.sessions.map(s => ({ ...s, isActive: false }))],
                        activeSessionId: newSession.id,
                        isLoading: false
                    }));

                    // Assign any unassigned files to this new session
                    try {
                        const { FileUploadService } = await import('../services/fileUpload');
                        await FileUploadService.assignFilesToSession(newSession.id);
                    } catch (error) {
                        console.warn('Failed to assign files to new session:', error);
                    }

                    return newSession.id;
                } catch (error) {
                    console.error('Failed to create session:', error);
                    set({ isLoading: false });
                    throw error;
                }
            },

            selectSession: async (sessionId: string) => {
                try {
                    await chatSessionService.setActiveSession(sessionId);

                    set((state) => ({
                        activeSessionId: sessionId,
                        sessions: state.sessions.map(s => ({
                            ...s,
                            isActive: s.id === sessionId
                        }))
                    }));

                    // Assign any unassigned files to the selected session
                    try {
                        const { FileUploadService } = await import('../services/fileUpload');
                        await FileUploadService.assignFilesToSession(sessionId);
                    } catch (error) {
                        console.warn('Failed to assign files to selected session:', error);
                    }
                } catch (error) {
                    console.error('Failed to select session:', error);

                    // If it's a 404 error, the session was likely deleted in another instance
                    if (error instanceof Error && (error.message.includes('404') || error.message.includes('not found'))) {
                        console.log('Session not found, syncing with backend...');
                        // Trigger a sync to refresh the session list
                        const syncResult = await get().syncWithBackend();
                        if (syncResult?.newActiveId) {
                            throw new Error(`Session deleted. Redirecting to session ${syncResult.newActiveId}`);
                        } else {
                            throw new Error('Session deleted and no other sessions available.');
                        }
                    }

                    throw error;
                }
            },

            updateSessionTitle: async (sessionId: string, title: string) => {
                try {
                    const updatedSession = await chatSessionService.updateSessionTitle(sessionId, title);

                    set((state) => ({
                        sessions: state.sessions.map(session =>
                            session.id === sessionId ? updatedSession : session
                        )
                    }));
                } catch (error) {
                    console.error('Failed to update session title:', error);
                    throw error;
                }
            },

            addMessage: async (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
                try {
                    const updatedSession = await chatSessionService.addMessage(sessionId, message.content, message.role);

                    set((state) => ({
                        sessions: state.sessions.map(session =>
                            session.id === sessionId ? updatedSession : session
                        )
                    }));
                } catch (error) {
                    console.error('Failed to add message:', error);
                    throw error;
                }
            },

            updateMessageContent: (sessionId: string, messageId: string, content: string) => {
                set((state) => ({
                    sessions: state.sessions.map(session => {
                        if (session.id === sessionId) {
                            return {
                                ...session,
                                messages: session.messages.map(message =>
                                    message.id === messageId
                                        ? { ...message, content }
                                        : message
                                ),
                                lastMessage: content,
                                timestamp: new Date()
                            };
                        }
                        return session;
                    })
                }));
            },

            updateLastMessage: (sessionId: string, message: string) => {
                set((state) => ({
                    sessions: state.sessions.map(session =>
                        session.id === sessionId
                            ? { ...session, lastMessage: message, timestamp: new Date() }
                            : session
                    )
                }));
            },

            deleteSession: async (sessionId: string) => {
                try {
                    await chatSessionService.deleteSession(sessionId);

                    set((state) => {
                        const filteredSessions = state.sessions.filter(s => s.id !== sessionId);
                        const newActiveId = state.activeSessionId === sessionId
                            ? (filteredSessions.length > 0 ? filteredSessions[0].id : null)
                            : state.activeSessionId;

                        return {
                            sessions: filteredSessions,
                            activeSessionId: newActiveId
                        };
                    });
                } catch (error) {
                    console.error('Failed to delete session:', error);
                    throw error;
                }
            },

            clearSessions: () => {
                set({ sessions: [], activeSessionId: null, isAuthenticated: false });
            },

            getActiveSession: () => {
                const state = get();
                return state.sessions.find(s => s.id === state.activeSessionId) || null;
            },

            setAuthenticationStatus: (isAuthenticated: boolean) => {
                set({ isAuthenticated });
                if (!isAuthenticated) {
                    set({ sessions: [], activeSessionId: null });
                }
            }
        }),
        {
            name: 'chat-sessions',
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated
            }),
            onRehydrateStorage: () => (state) => {
                if (state?.isAuthenticated) {
                    // Initialize sessions from backend when rehydrating if authenticated
                    setTimeout(() => {
                        const currentState = useChatStore.getState();
                        currentState.initializeFromBackend();
                    }, 100);
                }
            }
        }
    )
);