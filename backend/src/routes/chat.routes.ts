import { Router } from 'express';
import {
    chat,
    chatStream,
    initializeGemini,
    validateApiKey,
    createChatSession,
    getUserChatSessions,
    getChatSession,
    setActiveChatSession,
    addMessageToChatSession,
    updateChatSessionTitle,
    deleteChatSession,
    semanticSearch
} from '../controllers/chat.controller';
import { requireAuthentication } from '../middleware/auth';

const router = Router();

// Public endpoints for API key validation (still needed for users to test their keys)
router.post('/initialize', initializeGemini);
router.post('/validate-key', validateApiKey);

// Protected endpoints - require JWT authentication
router.post('/message', requireAuthentication, chat);
router.post('/stream', requireAuthentication, chatStream);
router.post('/search', requireAuthentication, semanticSearch);

// Chat Session Management endpoints
router.post('/sessions', requireAuthentication, createChatSession);
router.get('/sessions', requireAuthentication, getUserChatSessions);
router.get('/sessions/:sessionId', requireAuthentication, getChatSession);
router.put('/sessions/:sessionId/active', requireAuthentication, setActiveChatSession);
router.post('/sessions/:sessionId/messages', requireAuthentication, addMessageToChatSession);
router.put('/sessions/:sessionId/title', requireAuthentication, updateChatSessionTitle);
router.delete('/sessions/:sessionId', requireAuthentication, deleteChatSession);

export default router;
