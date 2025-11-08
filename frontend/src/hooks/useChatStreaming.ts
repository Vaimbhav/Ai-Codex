import { useState, useCallback, useRef } from 'react';

export interface StreamingMessage {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    isComplete: boolean;
    isStreaming: boolean;
}

interface UseChatStreamingOptions {
    sessionId: string;
    onMessageComplete?: (message: StreamingMessage) => void;
    onError?: (error: Error) => void;
}

export const useChatStreaming = ({ sessionId, onMessageComplete, onError }: UseChatStreamingOptions) => {
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const sendMessage = useCallback(async (message: string) => {
        if (isStreaming) return;

        try {
            setIsStreaming(true);

            // Create abort controller for cancellation
            abortControllerRef.current = new AbortController();

            // Create initial streaming message
            const messageId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            const initialStreamingMessage: StreamingMessage = {
                id: messageId,
                content: '',
                role: 'assistant',
                isComplete: false,
                isStreaming: true
            };

            setStreamingMessage(initialStreamingMessage);

            // Prepare headers with authentication
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            // Add API key if available
            const apiKey = localStorage.getItem('gemini_api_key') || localStorage.getItem('user_gemini_api_key');
            if (apiKey) {
                headers['X-API-Key'] = apiKey;
            }

            // Add auth token if available
            const token = localStorage.getItem('auth_token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Get the API URL from environment
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

            // Make API request to backend
            const response = await fetch(`${API_URL}/chat/stream`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message,
                    sessionId,
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error(`Authentication required. Please sign in to use the chat feature. (HTTP ${response.status})`);
                }
                if (response.status === 400) {
                    // Try to get the specific error message from the response
                    try {
                        const errorData = await response.json();
                        if (errorData.error && errorData.error.includes('API key is required')) {
                            throw new Error('Gemini API key is required. Please set your API key in the settings to use the chat feature.');
                        }
                        throw new Error(errorData.error || `Bad request: ${response.status}`);
                    } catch (parseError) {
                        throw new Error(`Bad request: ${response.status}`);
                    }
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('ReadableStream not supported');
            }

            // Create reader for streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';

            try {
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        // Stream ended without explicit [DONE] - finalize the message
                        if (accumulatedContent) {
                            const finalMessage: StreamingMessage = {
                                ...initialStreamingMessage,
                                content: accumulatedContent,
                                isComplete: true,
                                isStreaming: false
                            };
                            setStreamingMessage(finalMessage);
                            onMessageComplete?.(finalMessage);
                        }
                        break;
                    }

                    // Decode chunk
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);

                            if (data === '[DONE]') {
                                // Stream complete
                                const finalMessage: StreamingMessage = {
                                    ...initialStreamingMessage,
                                    content: accumulatedContent,
                                    isComplete: true,
                                    isStreaming: false
                                };

                                setStreamingMessage(finalMessage);
                                onMessageComplete?.(finalMessage);
                                return;
                            }

                            try {
                                const parsed = JSON.parse(data);
                                // Backend sends chunks as { chunk: "text" }, not { content: "text" }
                                if (parsed.chunk) {
                                    accumulatedContent += parsed.chunk;

                                    // Update streaming message
                                    setStreamingMessage({
                                        ...initialStreamingMessage,
                                        content: accumulatedContent,
                                        isStreaming: true
                                    });
                                }
                            } catch (parseError) {
                                console.warn('Failed to parse SSE data:', data);
                            }
                        }
                    }
                }
            } catch (streamError) {
                if (streamError instanceof Error && streamError.name === 'AbortError') {
                    console.log('Stream aborted by user');
                } else {
                    throw streamError;
                }
            }

        } catch (error) {
            console.error('Chat streaming error:', error);

            if (error instanceof Error && error.name !== 'AbortError') {
                onError?.(error);

                // Show error message with more specific error info
                const errorContent = error.message.includes('API key')
                    ? error.message
                    : 'Sorry, I encountered an error while processing your request. Please try again.';

                const errorMessage: StreamingMessage = {
                    id: Date.now().toString(36),
                    content: errorContent,
                    role: 'assistant',
                    isComplete: true,
                    isStreaming: false
                };

                setStreamingMessage(errorMessage);
                onMessageComplete?.(errorMessage);
            }
        } finally {
            setIsStreaming(false);
            setStreamingMessage(null);
            abortControllerRef.current = null;
        }
    }, [sessionId, isStreaming, onMessageComplete, onError]);

    const stopStreaming = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsStreaming(false);
        setStreamingMessage(null);
    }, []);

    const clearStreamingMessage = useCallback(() => {
        setStreamingMessage(null);
    }, []);

    return {
        isStreaming,
        streamingMessage,
        sendMessage,
        stopStreaming,
        clearStreamingMessage
    };
};