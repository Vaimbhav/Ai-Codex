import { Request, Response } from 'express';
import { contextService } from '../services/context.service';
import { embeddingService } from '../services/embedding.service';
import { logger } from '../utils/logger';

export const generateEmbeddings = async (req: Request, res: Response) => {
    try {
        const { sessionId, apiKey } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        // Initialize embedding service
        if (!embeddingService.isInitialized()) {
            embeddingService.initialize(apiKey);
        }

        await contextService.generateEmbeddingsForSession(sessionId, apiKey);

        res.json({
            success: true,
            message: 'Embeddings generated successfully'
        });
    } catch (error) {
        logger.error('Error generating embeddings:', error);
        return res.status(500).json({ error: 'Failed to generate embeddings' });
    }
};

export const generateEmbeddingForFile = async (req: Request, res: Response) => {
    try {
        const { fileId } = req.params;
        const { apiKey } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        // Initialize embedding service
        if (!embeddingService.isInitialized()) {
            embeddingService.initialize(apiKey);
        }

        const embeddings = await embeddingService.generateEmbeddingsForFile(fileId, apiKey);

        res.json({
            success: true,
            embeddings: embeddings.length,
            message: `Generated ${embeddings.length} embeddings for file`
        });
    } catch (error) {
        logger.error('Error generating file embeddings:', error);
        res.status(500).json({ error: 'Failed to generate file embeddings' });
    }
};

export const searchSimilarCode = async (req: Request, res: Response) => {
    try {
        const { query, sessionId, apiKey, limit = 5 } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        // Initialize embedding service
        if (!embeddingService.isInitialized()) {
            embeddingService.initialize(apiKey);
        }

        // Generate embedding for query
        const queryEmbedding = await embeddingService.generateEmbedding(query);

        // Find similar chunks
        const similarChunks = await embeddingService.findSimilarChunks(
            queryEmbedding,
            sessionId,
            parseInt(limit)
        );

        res.json({
            success: true,
            results: similarChunks,
            query
        });
    } catch (error) {
        logger.error('Error searching similar code:', error);
        res.status(500).json({ error: 'Failed to search similar code' });
    }
};