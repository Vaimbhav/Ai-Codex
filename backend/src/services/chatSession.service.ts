import { ChatSession, IChatSession, IMessage } from '../models/ChatSession';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export class ChatSessionService {
    /**
     * Create a new chat session for a user
     */
    async createSession(userId: string, title: string = 'New Chat'): Promise<IChatSession> {
        try {
            // Deactivate all other sessions for this user
            await ChatSession.updateMany(
                { userId: new mongoose.Types.ObjectId(userId) },
                { isActive: false }
            );

            const session = new ChatSession({
                userId: new mongoose.Types.ObjectId(userId),
                title,
                messages: [],
                lastMessage: '',
                timestamp: new Date(),
                isActive: true
            });

            const savedSession = await session.save();
            logger.info(`Created new chat session ${savedSession._id} for user ${userId}`);

            return savedSession;
        } catch (error) {
            logger.error('Error creating chat session:', error);
            throw new Error('Failed to create chat session');
        }
    }

    /**
     * Get all chat sessions for a user
     */
    async getUserSessions(userId: string): Promise<IChatSession[]> {
        try {
            const sessions = await ChatSession.find({
                userId: new mongoose.Types.ObjectId(userId)
            })
                .sort({ timestamp: -1 });

            return sessions;
        } catch (error) {
            logger.error('Error fetching user sessions:', error);
            throw new Error('Failed to fetch chat sessions');
        }
    }    /**
     * Get a specific chat session by ID
     */
    async getSession(sessionId: string, userId: string): Promise<IChatSession | null> {
        try {
            const session = await ChatSession.findOne({
                _id: new mongoose.Types.ObjectId(sessionId),
                userId: new mongoose.Types.ObjectId(userId)
            });

            return session;
        } catch (error) {
            logger.error('Error fetching chat session:', error);
            throw new Error('Failed to fetch chat session');
        }
    }

    /**
     * Update session as active
     */
    async setActiveSession(sessionId: string, userId: string): Promise<void> {
        try {
            // Deactivate all sessions for this user
            await ChatSession.updateMany(
                { userId: new mongoose.Types.ObjectId(userId) },
                { isActive: false }
            );

            // Activate the selected session
            await ChatSession.updateOne(
                {
                    _id: new mongoose.Types.ObjectId(sessionId),
                    userId: new mongoose.Types.ObjectId(userId)
                },
                { isActive: true }
            );

            logger.info(`Set session ${sessionId} as active for user ${userId}`);
        } catch (error) {
            logger.error('Error setting active session:', error);
            throw new Error('Failed to set active session');
        }
    }

    /**
     * Add a message to a chat session
     */
    async addMessage(
        sessionId: string,
        userId: string,
        messageData: Omit<IMessage, 'id' | 'timestamp'>
    ): Promise<IChatSession | null> {
        try {
            const messageId = Date.now().toString(36) + Math.random().toString(36).substr(2);

            const message: IMessage = {
                ...messageData,
                id: messageId,
                timestamp: new Date()
            };

            const updatedSession = await ChatSession.findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(sessionId),
                    userId: new mongoose.Types.ObjectId(userId)
                },
                {
                    $push: { messages: message },
                    $set: {
                        lastMessage: messageData.role === 'user' ? messageData.content : undefined,
                        timestamp: new Date()
                    }
                },
                { new: true }
            );

            if (updatedSession) {
                logger.info(`Added message to session ${sessionId} for user ${userId}`);
            }

            return updatedSession;
        } catch (error) {
            logger.error('Error adding message to session:', error);
            throw new Error('Failed to add message to session');
        }
    }

    /**
     * Update a message in a chat session (for streaming updates)
     */
    async updateMessage(
        sessionId: string,
        userId: string,
        messageId: string,
        content: string
    ): Promise<IChatSession | null> {
        try {
            const updatedSession = await ChatSession.findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(sessionId),
                    userId: new mongoose.Types.ObjectId(userId),
                    'messages.id': messageId
                },
                {
                    $set: {
                        'messages.$.content': content,
                        lastMessage: content,
                        timestamp: new Date()
                    }
                },
                { new: true }
            );

            return updatedSession;
        } catch (error) {
            logger.error('Error updating message in session:', error);
            throw new Error('Failed to update message');
        }
    }

    /**
     * Update session title
     */
    async updateSessionTitle(
        sessionId: string,
        userId: string,
        title: string
    ): Promise<IChatSession | null> {
        try {
            const updatedSession = await ChatSession.findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(sessionId),
                    userId: new mongoose.Types.ObjectId(userId)
                },
                {
                    title: title.substring(0, 100),
                    timestamp: new Date()
                },
                { new: true }
            );

            if (updatedSession) {
                logger.info(`Updated session title for ${sessionId}`);
            }

            return updatedSession;
        } catch (error) {
            logger.error('Error updating session title:', error);
            throw new Error('Failed to update session title');
        }
    }

    /**
     * Delete a chat session
     */
    async deleteSession(sessionId: string, userId: string): Promise<boolean> {
        try {
            const result = await ChatSession.deleteOne({
                _id: new mongoose.Types.ObjectId(sessionId),
                userId: new mongoose.Types.ObjectId(userId)
            });

            if (result.deletedCount > 0) {
                logger.info(`Deleted session ${sessionId} for user ${userId}`);
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Error deleting session:', error);
            throw new Error('Failed to delete session');
        }
    }

    /**
     * Delete all sessions for a user
     */
    async deleteAllUserSessions(userId: string): Promise<number> {
        try {
            const result = await ChatSession.deleteMany({
                userId: new mongoose.Types.ObjectId(userId)
            });

            logger.info(`Deleted ${result.deletedCount} sessions for user ${userId}`);
            return result.deletedCount;
        } catch (error) {
            logger.error('Error deleting user sessions:', error);
            throw new Error('Failed to delete user sessions');
        }
    }

    /**
     * Auto-generate title from first user message
     */
    async autoGenerateTitle(sessionId: string, userId: string, firstMessage: string): Promise<void> {
        try {
            const title = firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '');

            await ChatSession.updateOne(
                {
                    _id: new mongoose.Types.ObjectId(sessionId),
                    userId: new mongoose.Types.ObjectId(userId),
                    title: 'New Chat' // Only update if still has default title
                },
                { title, timestamp: new Date() }
            );
        } catch (error) {
            logger.error('Error auto-generating title:', error);
            // Don't throw - this is not critical
        }
    }
}

export const chatSessionService = new ChatSessionService();