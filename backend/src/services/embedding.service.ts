import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { File } from '../models/File';
import { logger } from '../utils/logger';

interface EmbeddingResult {
    chunkId: string;
    embedding: number[];
    content: string;
}

class EmbeddingService {
    private genAI: GoogleGenerativeAI | null = null;
    private embeddingModel: GenerativeModel | null = null;

    initialize(apiKey: string) {
        try {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.embeddingModel = this.genAI.getGenerativeModel({ model: 'embedding-001' });
            logger.info('Embedding service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize embedding service:', error);
            throw error;
        }
    }

    async generateEmbedding(text: string): Promise<number[]> {
        if (!this.embeddingModel) {
            throw new Error('Embedding service not initialized');
        }

        try {
            const result = await this.embeddingModel.embedContent(text);
            return result.embedding.values;
        } catch (error) {
            logger.error('Error generating embedding:', error);
            throw error;
        }
    }

    async generateEmbeddingsForFile(fileId: string, apiKey?: string): Promise<EmbeddingResult[]> {
        if (apiKey && !this.embeddingModel) {
            this.initialize(apiKey);
        }

        if (!this.embeddingModel) {
            throw new Error('Embedding service not initialized');
        }

        try {
            const file = await File.findById(fileId);
            if (!file) {
                throw new Error('File not found');
            }

            const embeddingResults: EmbeddingResult[] = [];

            // Generate embeddings for each chunk
            for (const chunk of file.chunks) {
                try {
                    const embedding = await this.generateEmbedding(chunk.content);
                    embeddingResults.push({
                        chunkId: chunk.id,
                        embedding,
                        content: chunk.content
                    });
                } catch (error) {
                    logger.warn(`Failed to generate embedding for chunk ${chunk.id}:`, error);
                }
            }

            // Store embeddings back to database
            await this.storeEmbeddings(fileId, embeddingResults);

            logger.info(`Generated ${embeddingResults.length} embeddings for file ${file.originalName}`);
            return embeddingResults;
        } catch (error) {
            logger.error('Error generating embeddings for file:', error);
            throw error;
        }
    }

    private async storeEmbeddings(fileId: string, embeddings: EmbeddingResult[]) {
        try {
            const file = await File.findById(fileId);
            if (!file) {
                throw new Error('File not found');
            }

            // Update chunks with embeddings
            for (const embeddingResult of embeddings) {
                const chunkIndex = file.chunks.findIndex(chunk => chunk.id === embeddingResult.chunkId);
                if (chunkIndex !== -1) {
                    file.chunks[chunkIndex].embedding = embeddingResult.embedding;
                }
            }

            await file.save();
            logger.info(`Stored embeddings for file ${file.originalName}`);
        } catch (error) {
            logger.error('Error storing embeddings:', error);
            throw error;
        }
    }

    async findSimilarChunks(queryEmbedding: number[], sessionId: string, limit = 5): Promise<Array<{
        file: { id: string; name: string; language: string };
        chunk: { id: string; content: string; startLine: number; endLine: number; type: string };
        similarity: number;
    }>> {
        try {
            logger.info(`Searching for similar chunks in session ${sessionId}`);

            // Find files in the session that have embeddings
            const files = await File.find({
                sessionId,
                'chunks.embedding': { $exists: true, $ne: null }
            });

            logger.info(`Found ${files.length} files with embeddings in session ${sessionId}`);

            const similarities: Array<{
                file: { id: string; name: string; language: string };
                chunk: { id: string; content: string; startLine: number; endLine: number; type: string };
                similarity: number;
            }> = [];

            // Calculate cosine similarity for each chunk
            for (const file of files) {
                let fileChunksWithEmbeddings = 0;
                for (const chunk of file.chunks) {
                    if (chunk.embedding && chunk.embedding.length > 0) {
                        fileChunksWithEmbeddings++;
                        const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
                        similarities.push({
                            file: {
                                id: String(file._id),
                                name: file.originalName,
                                language: file.language
                            },
                            chunk: {
                                id: chunk.id,
                                content: chunk.content,
                                startLine: chunk.startLine,
                                endLine: chunk.endLine,
                                type: chunk.type
                            },
                            similarity
                        });
                    }
                }
                logger.info(`File ${file.originalName}: ${fileChunksWithEmbeddings} chunks with embeddings out of ${file.chunks.length} total chunks`);
            }

            logger.info(`Total chunks with embeddings: ${similarities.length}`);

            // Sort by similarity and return top results
            const topResults = similarities
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);

            if (topResults.length > 0) {
                logger.info(`Top similarity scores: ${topResults.slice(0, 3).map(r => r.similarity).join(', ')}`);
            }

            return topResults;
        } catch (error) {
            logger.error('Error finding similar chunks:', error);
            throw error;
        }
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) {
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    async searchInSession(userId: string, sessionId: string, query: string, apiKey: string, limit: number = 5) {
        try {
            // Initialize if needed
            if (!this.isInitialized()) {
                this.initialize(apiKey);
            }

            // Generate embedding for the search query
            const queryEmbedding = await this.generateEmbedding(query);

            // Find files in the specific session
            const files = await File.find({ userId, sessionId });

            if (files.length === 0) {
                return [];
            }

            const similarities: Array<{
                file: {
                    id: string;
                    name: string;
                    language: string;
                };
                chunk: {
                    id: string;
                    content: string;
                    startLine: number;
                    endLine: number;
                    type: string;
                };
                similarity: number;
            }> = [];

            // Compare query embedding with chunk embeddings
            for (const file of files) {
                for (const chunk of file.chunks) {
                    if (chunk.embedding && chunk.embedding.length > 0) {
                        const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
                        similarities.push({
                            file: {
                                id: String(file._id),
                                name: file.originalName,
                                language: file.language
                            },
                            chunk: {
                                id: chunk.id,
                                content: chunk.content,
                                startLine: chunk.startLine,
                                endLine: chunk.endLine,
                                type: chunk.type
                            },
                            similarity
                        });
                    }
                }
            }

            // Sort by similarity and return top results
            return similarities
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);
        } catch (error) {
            logger.error('Error searching in session:', error);
            throw error;
        }
    }

    isInitialized(): boolean {
        return this.embeddingModel !== null;
    }
}

export const embeddingService = new EmbeddingService();