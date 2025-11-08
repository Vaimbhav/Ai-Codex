import { apiClient } from './api';
import { ApiResponse } from '../types';

export interface Message {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    lastMessage: string;
    timestamp: Date;
    isActive?: boolean;
}

export class ChatSessionService {
    /**
     * Create a new chat session
     */
    async createSession(title?: string): Promise<ChatSession> {
        try {
            const response: ApiResponse<{ session: ChatSession }> = await apiClient.post('/chat/sessions', {
                title: title || 'New Chat'
            });

            if (!response.success || !response.data) {
                throw new Error(response.error || 'Failed to create chat session');
            }

            return {
                ...response.data.session,
                timestamp: new Date(response.data.session.timestamp),
                messages: response.data.session.messages.map((msg: Message) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }))
            };
        } catch (error) {
            console.error('Error creating chat session:', error);
            throw error;
        }
    }    /**
     * Get all user chat sessions
     */
    async getUserSessions(): Promise<ChatSession[]> {
        try {
            const response: ApiResponse<{ sessions: ChatSession[] }> = await apiClient.get('/chat/sessions');

            if (!response.success || !response.data) {
                throw new Error(response.error || 'Failed to fetch chat sessions');
            }

            return response.data.sessions.map((session: ChatSession) => ({
                ...session,
                timestamp: new Date(session.timestamp),
                messages: session.messages.map((msg: Message) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }))
            }));
        } catch (error) {
            console.error('Error fetching chat sessions:', error);
            throw error;
        }
    }    /**
     * Get a specific chat session
     */
    async getSession(sessionId: string): Promise<ChatSession> {
        try {
            const response: ApiResponse<{ session: ChatSession }> = await apiClient.get(`/chat/sessions/${sessionId}`);

            if (!response.success || !response.data) {
                throw new Error('Failed to fetch chat session');
            }

            return {
                ...response.data.session,
                timestamp: new Date(response.data.session.timestamp),
                messages: response.data.session.messages.map((msg: Message) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }))
            };
        } catch (error) {
            console.error('Error fetching chat session:', error);
            throw error;
        }
    }

    /**
     * Set a session as active
     */
    async setActiveSession(sessionId: string): Promise<void> {
        try {
            const response: ApiResponse = await apiClient.put(`/chat/sessions/${sessionId}/active`);

            if (!response.success) {
                throw new Error('Failed to set active session');
            }
        } catch (error) {
            console.error('Error setting active session:', error);
            throw error;
        }
    }

    /**
     * Add a message to a chat session
     */
    async addMessage(sessionId: string, content: string, role: 'user' | 'assistant'): Promise<ChatSession> {
        try {
            const response: ApiResponse<{ session: ChatSession }> = await apiClient.post(`/chat/sessions/${sessionId}/messages`, {
                content,
                role
            });

            if (!response.success || !response.data) {
                throw new Error('Failed to add message to session');
            }

            return {
                ...response.data.session,
                timestamp: new Date(response.data.session.timestamp),
                messages: response.data.session.messages.map((msg: Message) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }))
            };
        } catch (error) {
            console.error('Error adding message to session:', error);
            throw error;
        }
    }

    /**
     * Update session title
     */
    async updateSessionTitle(sessionId: string, title: string): Promise<ChatSession> {
        try {
            const response: ApiResponse<{ session: ChatSession }> = await apiClient.put(`/chat/sessions/${sessionId}/title`, {
                title
            });

            if (!response.success || !response.data) {
                throw new Error('Failed to update session title');
            }

            return {
                ...response.data.session,
                timestamp: new Date(response.data.session.timestamp),
                messages: response.data.session.messages.map((msg: Message) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }))
            };
        } catch (error) {
            console.error('Error updating session title:', error);
            throw error;
        }
    }

    /**
     * Delete a chat session
     */
    async deleteSession(sessionId: string): Promise<void> {
        try {
            const response: ApiResponse = await apiClient.delete(`/chat/sessions/${sessionId}`);

            if (!response.success) {
                throw new Error('Failed to delete chat session');
            }
        } catch (error) {
            console.error('Error deleting chat session:', error);
            throw error;
        }
    }
}

export const chatSessionService = new ChatSessionService();