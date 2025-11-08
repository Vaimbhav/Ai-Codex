import { File } from '../models/File';
import { embeddingService } from './embedding.service';
import { logger } from '../utils/logger';

interface CodeContext {
    relevantFiles: Array<{
        name: string;
        language: string;
        content: string;
        chunks: number;
    }>;
    relevantChunks: Array<{
        fileName: string;
        content: string;
        type: string;
        lines: string;
        similarity?: number;
    }>;
    projectSummary: {
        totalFiles: number;
        languages: string[];
        totalLines: number;
        mainFiles: string[];
    };
}

class ContextService {
    async buildContextForQuery(query: string, sessionId: string, apiKey?: string): Promise<CodeContext> {
        try {
            // First try to get files for this specific session
            let files = await File.find({ sessionId }).sort({ uploadedAt: -1 });

            logger.info(`Found ${files.length} files for session ${sessionId}`);

            // If no session-specific files found, try to find all files for this user and assign them to the session
            if (files.length === 0) {
                // Find files without sessionId (recently uploaded files that weren't assigned)
                const unassignedFiles = await File.find({
                    $or: [
                        { sessionId: { $exists: false } },
                        { sessionId: null },
                        { sessionId: "" }
                    ]
                }).sort({ uploadedAt: -1 });

                logger.info(`Found ${unassignedFiles.length} unassigned files`);

                // Assign unassigned files to this session
                if (unassignedFiles.length > 0) {
                    await File.updateMany(
                        {
                            $or: [
                                { sessionId: { $exists: false } },
                                { sessionId: null },
                                { sessionId: "" }
                            ]
                        },
                        { sessionId }
                    );

                    // Refresh files list
                    files = await File.find({ sessionId }).sort({ uploadedAt: -1 });
                    logger.info(`Assigned ${unassignedFiles.length} files to session ${sessionId}`);
                }
            }

            if (files.length === 0) {
                logger.warn(`No files found for session ${sessionId} after assignment attempt`);
                return this.getEmptyContext();
            }

            // Generate embedding for the query
            let queryEmbedding: number[] | null = null;
            let relevantChunks: Array<{
                file: { name: string };
                chunk: { content: string; type: string; startLine: number; endLine: number };
                similarity: number;
            }> = [];

            if (apiKey) {
                try {
                    // Initialize embedding service if not already done
                    if (!embeddingService.isInitialized()) {
                        embeddingService.initialize(apiKey);
                        logger.info('Initialized embedding service for query');
                    }

                    queryEmbedding = await embeddingService.generateEmbedding(query);
                    logger.info(`Generated embedding for query: "${query}"`);

                    relevantChunks = await embeddingService.findSimilarChunks(queryEmbedding, sessionId, 10);
                    logger.info(`Found ${relevantChunks.length} relevant chunks for query`);

                    // Log similarity scores for debugging
                    if (relevantChunks.length > 0) {
                        logger.info('Top relevant chunks:', relevantChunks.slice(0, 3).map(chunk => ({
                            fileName: chunk.file.name,
                            similarity: chunk.similarity,
                            contentPreview: chunk.chunk.content.substring(0, 100)
                        })));
                    }
                } catch (error) {
                    logger.error('Error generating embeddings for query:', error);
                }
            } else {
                logger.warn('No API key provided for embedding generation');
            }

            // Build context from files
            const context: CodeContext = {
                relevantFiles: files.slice(0, 5).map(file => ({
                    name: file.originalName,
                    language: file.language,
                    content: file.content.length > 2000
                        ? file.content.substring(0, 2000) + '...\n[Content truncated]'
                        : file.content,
                    chunks: file.chunks.length
                })),
                relevantChunks: relevantChunks.map(item => ({
                    fileName: item.file.name,
                    content: item.chunk.content,
                    type: item.chunk.type,
                    lines: `${item.chunk.startLine}-${item.chunk.endLine}`,
                    similarity: Math.round(item.similarity * 100) / 100
                })),
                projectSummary: {
                    totalFiles: files.length,
                    languages: [...new Set(files.map(f => f.language))],
                    totalLines: files.reduce((sum, f) => sum + f.content.split('\n').length, 0),
                    mainFiles: files
                        .filter(f => ['index', 'main', 'app'].some(name =>
                            f.originalName.toLowerCase().includes(name)
                        ))
                        .map(f => f.originalName)
                }
            };

            return context;
        } catch (error) {
            logger.error('Error building context for query:', error);
            return this.getEmptyContext();
        }
    }

    buildPromptWithContext(query: string, context: CodeContext): string {
        if (context.projectSummary.totalFiles === 0) {
            return query;
        }

        let prompt = `You are an AI assistant helping with code analysis and development. Here's the context of the project:

## Project Overview
- Total files: ${context.projectSummary.totalFiles}
- Languages: ${context.projectSummary.languages.join(', ')}
- Total lines of code: ${context.projectSummary.totalLines}
${context.projectSummary.mainFiles.length > 0 ? `- Main files: ${context.projectSummary.mainFiles.join(', ')}` : ''}

`;

        // Add relevant chunks if available (from vector search)
        if (context.relevantChunks.length > 0) {
            prompt += `## Most Relevant Code Sections
`;
            context.relevantChunks.slice(0, 5).forEach((chunk, index) => {
                prompt += `### ${index + 1}. ${chunk.fileName} (${chunk.type}, lines ${chunk.lines})${chunk.similarity ? ` - Similarity: ${chunk.similarity}` : ''}
\`\`\`${context.relevantFiles.find(f => f.name === chunk.fileName)?.language || 'text'}
${chunk.content}
\`\`\`

`;
            });
        }

        // Add file contents if no similar chunks found
        if (context.relevantChunks.length === 0 && context.relevantFiles.length > 0) {
            prompt += `## Project Files
`;
            context.relevantFiles.slice(0, 3).forEach((file, index) => {
                prompt += `### ${index + 1}. ${file.name} (${file.language})
\`\`\`${file.language}
${file.content}
\`\`\`

`;
            });
        }

        prompt += `## User Question
${query}

Please provide a helpful response based on the code context above. Reference specific files, functions, or code sections when relevant.`;

        return prompt;
    }

    private getEmptyContext(): CodeContext {
        return {
            relevantFiles: [],
            relevantChunks: [],
            projectSummary: {
                totalFiles: 0,
                languages: [],
                totalLines: 0,
                mainFiles: []
            }
        };
    }

    async generateEmbeddingsForSession(sessionId: string, apiKey: string): Promise<void> {
        try {
            const files = await File.find({ sessionId });

            logger.info(`Generating embeddings for ${files.length} files in session ${sessionId}`);

            for (const file of files) {
                try {
                    await embeddingService.generateEmbeddingsForFile(String(file._id), apiKey);
                } catch (error) {
                    logger.warn(`Failed to generate embeddings for file ${file.originalName}:`, error);
                }
            }

            logger.info(`Completed embedding generation for session ${sessionId}`);
        } catch (error) {
            logger.error('Error generating embeddings for session:', error);
            throw error;
        }
    }
}

export const contextService = new ContextService();