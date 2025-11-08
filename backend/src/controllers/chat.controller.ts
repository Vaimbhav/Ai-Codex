import { Request, Response } from 'express';
import { geminiService } from '../services/gemini.service';
import { contextService } from '../services/context.service';
import { embeddingService } from '../services/embedding.service';
import { chatSessionService } from '../services/chatSession.service';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

// Helper function to get user ID as string
const getUserId = (req: AuthenticatedRequest): string => {
    if (!req.user || !req.user._id) {
        throw new Error('User not authenticated');
    }
    return req.user._id.toString();
};

export const initializeGemini = async (req: Request, res: Response) => {
    try {
        const { apiKey } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        geminiService.initialize(apiKey);

        res.json({ success: true, message: 'Gemini API initialized' });
    } catch (error) {
        logger.error('Error initializing Gemini:', error);
        return res.status(500).json({ error: 'Failed to initialize Gemini API' });
    }
};

export const chat = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { message, sessionId, useContext = true } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // User must be authenticated at this point (enforced by middleware)
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Get API key from user's settings or request
        const apiKey = req.body.apiKey || req.query.apiKey || req.headers['x-api-key'];

        if (!apiKey) {
            return res.status(400).json({
                error: 'Gemini API key is required. Please provide your API key in your account settings or request.'
            });
        }

        // Initialize if API key provided
        if (!geminiService.isInitialized()) {
            geminiService.initialize(apiKey);
        }

        let finalMessage = message;

        // Build context if sessionId provided and useContext is true
        if (sessionId && useContext) {
            try {
                // Initialize embedding service if not already done
                if (apiKey && !embeddingService.isInitialized()) {
                    embeddingService.initialize(apiKey);
                }

                const context = await contextService.buildContextForQuery(message, sessionId, apiKey);
                finalMessage = contextService.buildPromptWithContext(message, context);

                logger.info(`Enhanced message with context for session ${sessionId}`);
            } catch (error) {
                logger.warn('Could not build context, using original message:', error);
            }
        }

        const response = await geminiService.generateResponse(finalMessage);

        res.json({ success: true, response });
    } catch (error) {
        logger.error('Error in chat:', error);
        return res.status(500).json({ error: 'Failed to generate response' });
    }
};

export const chatStream = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { message, sessionId, useContext = true } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // User must be authenticated at this point (enforced by middleware)
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Get API key from user's settings or request
        const apiKey = req.body.apiKey || req.query.apiKey || req.headers['x-api-key'];

        if (!apiKey) {
            return res.status(400).json({
                error: 'Gemini API key is required. Please provide your API key in your account settings or request.'
            });
        }

        // Initialize if API key provided
        if (!geminiService.isInitialized()) {
            geminiService.initialize(apiKey);
        }

        let finalMessage = message;

        // Build context if sessionId provided and useContext is true
        if (sessionId && useContext) {
            try {
                // Initialize embedding service if not already done
                if (apiKey && !embeddingService.isInitialized()) {
                    embeddingService.initialize(apiKey);
                }

                const context = await contextService.buildContextForQuery(message, sessionId, apiKey);
                finalMessage = contextService.buildPromptWithContext(message, context);

                logger.info(`Enhanced streaming message with context for session ${sessionId}`);
            } catch (error) {
                logger.warn('Could not build context, using original message:', error);
            }
        }

        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const stream = await geminiService.generateStreamingResponse(finalMessage);

        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        logger.error('Error in streaming chat:', error);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Failed to generate streaming response' });
        }
    }
};

export const validateApiKey = async (req: Request, res: Response) => {
    try {
        const apiKey = req.headers['x-api-key'] as string;

        if (!apiKey) {
            return res.status(400).json({
                success: false,
                error: 'API key is required'
            });
        }

        // Validate API key format
        const geminiApiKeyPattern = /^AIza[0-9A-Za-z-_]{35}$/;
        if (!geminiApiKeyPattern.test(apiKey)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid API key format'
            });
        }

        // Test the API key by making a simple request
        try {
            const tempService = Object.create(geminiService);
            tempService.initialize(apiKey);

            // Try to generate a very short response to test the key
            const testResponse = await tempService.generateResponse('Hi');

            if (testResponse) {
                res.json({
                    success: true,
                    message: 'API key is valid'
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: 'API key is invalid or has no quota'
                });
            }
        } catch (error: unknown) {
            logger.error('API key validation failed:', error);

            if (error instanceof Error && error.message?.includes('API_KEY_INVALID')) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid API key'
                });
            } else if (error instanceof Error && error.message?.includes('QUOTA_EXCEEDED')) {
                return res.status(429).json({
                    success: false,
                    error: 'API key quota exceeded'
                });
            } else {
                return res.status(401).json({
                    success: false,
                    error: 'API key validation failed'
                });
            }
        }
    } catch (error) {
        logger.error('Error validating API key:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to validate API key'
        });
    }
};

// Chat Session Management Endpoints

export const createChatSession = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { title } = req.body;
        const session = await chatSessionService.createSession(
            getUserId(req),
            title || 'New Chat'
        );

        res.json({ success: true, data: { session } });
    } catch (error) {
        logger.error('Error creating chat session:', error);
        return res.status(500).json({ success: false, error: 'Failed to create chat session' });
    }
};

export const getUserChatSessions = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const sessions = await chatSessionService.getUserSessions(getUserId(req));
        res.json({ success: true, data: { sessions } });
    } catch (error) {
        logger.error('Error fetching user chat sessions:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch chat sessions' });
    }
};

export const getChatSession = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { sessionId } = req.params;
        const session = await chatSessionService.getSession(sessionId, getUserId(req));

        if (!session) {
            return res.status(404).json({ success: false, error: 'Chat session not found' });
        }

        res.json({ success: true, data: { session } });
    } catch (error) {
        logger.error('Error fetching chat session:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch chat session' });
    }
};

export const setActiveChatSession = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { sessionId } = req.params;
        await chatSessionService.setActiveSession(sessionId, getUserId(req));

        res.json({ success: true, message: 'Session set as active' });
    } catch (error) {
        logger.error('Error setting active chat session:', error);
        return res.status(500).json({ success: false, error: 'Failed to set active session' });
    }
};

export const addMessageToChatSession = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { sessionId } = req.params;
        const { content, role } = req.body;

        if (!content || !role) {
            return res.status(400).json({ success: false, error: 'Content and role are required' });
        }

        const session = await chatSessionService.addMessage(
            sessionId,
            getUserId(req),
            { content, role }
        );

        if (!session) {
            return res.status(404).json({ success: false, error: 'Chat session not found' });
        }

        // Auto-generate title if this is the first user message
        if (role === 'user' && session.messages.length === 1 && session.title === 'New Chat') {
            await chatSessionService.autoGenerateTitle(sessionId, getUserId(req), content);
        }

        res.json({ success: true, data: { session } });
    } catch (error) {
        logger.error('Error adding message to chat session:', error);
        return res.status(500).json({ success: false, error: 'Failed to add message to session' });
    }
};

export const updateChatSessionTitle = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { sessionId } = req.params;
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }

        const session = await chatSessionService.updateSessionTitle(
            sessionId,
            getUserId(req),
            title
        );

        if (!session) {
            return res.status(404).json({ success: false, error: 'Chat session not found' });
        }

        res.json({ success: true, data: { session } });
    } catch (error) {
        logger.error('Error updating chat session title:', error);
        return res.status(500).json({ success: false, error: 'Failed to update session title' });
    }
};

export const deleteChatSession = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { sessionId } = req.params;
        const deleted = await chatSessionService.deleteSession(sessionId, getUserId(req));

        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Chat session not found' });
        }

        res.json({ success: true, message: 'Chat session deleted' });
    } catch (error) {
        logger.error('Error deleting chat session:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete chat session' });
    }
};

export const semanticSearch = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { query, sessionId, limit = 5 } = req.body;

        if (!query) {
            return res.status(400).json({ success: false, error: 'Search query is required' });
        }

        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'Session ID is required' });
        }

        const userId = getUserId(req);
        const apiKey = req.body.apiKey || req.query.apiKey || req.headers['x-api-key'];

        if (!apiKey) {
            return res.status(400).json({
                success: false,
                error: 'API key is required for semantic search'
            });
        }

        try {
            const results = await embeddingService.searchInSession(userId, sessionId, query, apiKey, limit);

            res.json({
                success: true,
                data: {
                    query,
                    results,
                    count: results.length
                }
            });
        } catch (error) {
            logger.error('Error performing semantic search:', error);
            return res.status(500).json({
                success: false,
                error: 'Semantic search failed. Please check your API key and try again.'
            });
        }
    } catch (error) {
        logger.error('Error in semantic search controller:', error);
        return res.status(500).json({ success: false, error: 'Semantic search failed' });
    }
};
