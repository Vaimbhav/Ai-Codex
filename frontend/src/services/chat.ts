import { apiClient } from './api';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

class ChatService {
    async initializeGemini(apiKey: string) {
        return apiClient.post('/chat/initialize', { apiKey });
    }

    async sendMessage(
        message: string,
        apiKey?: string,
        sessionId?: string,
        useContext = true
    ) {
        return apiClient.post<{ response: string }>('/chat/message', {
            message,
            apiKey,
            sessionId,
            useContext,
        });
    }

    async *streamMessage(
        message: string,
        apiKey?: string,
        sessionId?: string,
        useContext = true
    ): AsyncGenerator<string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Add authentication headers
        const storedApiKey = localStorage.getItem('gemini_api_key');
        if (storedApiKey) {
            headers['X-API-Key'] = storedApiKey;
        }

        const token = localStorage.getItem('auth_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('http://localhost:3001/api/chat/stream', {
            method: 'POST',
            headers,
            body: JSON.stringify({ message, apiKey, sessionId, useContext }),
        });

        if (!response.ok) {
            throw new Error('Failed to stream response');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
            throw new Error('No reader available');
        }

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);

                    if (data === '[DONE]') {
                        return;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.chunk) {
                            yield parsed.chunk;
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
    }
}

export const chatService = new ChatService();
