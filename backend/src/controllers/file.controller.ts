import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import { File } from '../models/File';
import { FileProcessorService } from '../services/fileProcessor.service';
import { logger } from '../utils/logger';
import { generateId } from '../utils/helpers';
import { AuthenticatedRequest } from '../middleware/auth';

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error as Error, uploadDir);
        }
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${generateId()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Check if file should be processed
    if (FileProcessorService.shouldProcessFile(file.originalname)) {
        cb(null, true);
    } else {
        cb(new Error(`File type not supported: ${file.originalname}`));
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
        files: parseInt(process.env.MAX_FILES || '100')
    }
});

export const uploadFiles = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, error: 'No files uploaded' });
        }

        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const userId = (req.user._id as string).toString();
        const { apiKey } = req.body;
        const processedFiles = [];

        logger.info(`Multiple file upload request - userId: ${userId}, fileCount: ${files.length}, hasApiKey: ${!!apiKey}`);

        for (const file of files) {
            try {
                // Read file content
                const content = await fs.readFile(file.path, 'utf-8');

                // Detect language
                const language = FileProcessorService.detectLanguage(file.originalname);

                // Parse code chunks
                const chunks = FileProcessorService.parseCodeChunks(content, language);

                // Extract dependencies and exports
                const dependencies = FileProcessorService.extractDependencies(content, language);
                const exports = FileProcessorService.extractExports(content, language);

                // Save to database with userId
                const fileDoc = new File({
                    name: file.filename,
                    originalName: file.originalname,
                    path: file.path,
                    size: file.size,
                    mimeType: file.mimetype,
                    language,
                    content,
                    chunks,
                    dependencies,
                    exports,
                    userId, // Add the missing userId field
                });

                await fileDoc.save();

                // Generate embeddings if API key is provided
                let embeddingsGenerated = false;
                if (apiKey) {
                    try {
                        const { embeddingService } = await import('../services/embedding.service');
                        await embeddingService.generateEmbeddingsForFile(fileDoc._id as string, apiKey);
                        embeddingsGenerated = true;
                        logger.info(`Generated embeddings for file: ${file.originalname}`);
                    } catch (embeddingError) {
                        logger.warn(`Failed to generate embeddings for file ${file.originalname}:`, embeddingError);
                    }
                }

                processedFiles.push({
                    id: fileDoc._id,
                    name: fileDoc.originalName,
                    language: fileDoc.language,
                    size: fileDoc.size,
                    chunks: fileDoc.chunks.length,
                    dependencies: fileDoc.dependencies.length,
                    exports: fileDoc.exports.length,
                    uploadedAt: fileDoc.uploadedAt,
                    embeddingsGenerated
                });

                logger.info(`Processed file: ${file.originalname} (${language}) for user ${userId}`);
            } catch (error) {
                logger.error(`Error processing file ${file.originalname}:`, error);

                // Clean up uploaded file on processing error
                try {
                    await fs.unlink(file.path);
                } catch (unlinkError) {
                    logger.warn(`Could not clean up file: ${file.path}`);
                }
                // Continue with other files
            }
        }

        const embeddingsCount = processedFiles.filter(f => f.embeddingsGenerated).length;
        const successMessage = `Successfully processed ${processedFiles.length} files` +
            (embeddingsCount > 0 ? ` (${embeddingsCount} with embeddings)` : '');

        res.json({
            success: true,
            data: { files: processedFiles }, // Use consistent response format
            message: successMessage
        });

    } catch (error) {
        logger.error('Error in multiple file upload:', error);
        res.status(500).json({ success: false, error: 'Multiple file upload failed' });
    }
};

export const getFiles = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.query;

        const query = sessionId ? { sessionId } : {};
        const files = await File.find(query).select('-content').sort({ uploadedAt: -1 });

        res.json({ success: true, files });
    } catch (error) {
        logger.error('Error fetching files:', error);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
};

export const getFileContent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const file = await File.findById(id);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.json({
            success: true,
            file: {
                id: file._id,
                name: file.originalName,
                language: file.language,
                content: file.content,
                chunks: file.chunks,
                dependencies: file.dependencies,
                exports: file.exports
            }
        });
    } catch (error) {
        logger.error('Error fetching file content:', error);
        res.status(500).json({ error: 'Failed to fetch file content' });
    }
};

export const uploadSingleFile = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const file = req.file as Express.Multer.File;

        if (!file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const userId = (req.user._id as string).toString(); // From auth middleware
        const { apiKey } = req.body;

        logger.info(`File upload request - userId: ${userId}, fileName: ${file.originalname}`);

        try {
            // Read file content
            const content = await fs.readFile(file.path, 'utf-8');

            // Detect language
            const language = FileProcessorService.detectLanguage(file.originalname);

            // Parse code chunks
            const chunks = FileProcessorService.parseCodeChunks(content, language);

            // Extract dependencies and exports
            const dependencies = FileProcessorService.extractDependencies(content, language);
            const exports = FileProcessorService.extractExports(content, language);

            // Save to database
            const fileDoc = new File({
                name: file.filename,
                originalName: file.originalname,
                path: file.path,
                size: file.size,
                mimeType: file.mimetype,
                language,
                content,
                chunks,
                dependencies,
                exports,
                userId,
            });

            await fileDoc.save();

            // Generate embeddings if API key is provided
            let embeddingsGenerated = false;
            if (apiKey) {
                try {
                    const { embeddingService } = await import('../services/embedding.service');
                    await embeddingService.generateEmbeddingsForFile(fileDoc._id as string, apiKey);
                    embeddingsGenerated = true;
                    logger.info(`Generated embeddings for file: ${file.originalname}`);
                } catch (embeddingError) {
                    logger.warn(`Failed to generate embeddings for file ${file.originalname}:`, embeddingError);
                }
            }

            const processedFile = {
                id: fileDoc._id,
                name: fileDoc.originalName,
                language: fileDoc.language,
                size: fileDoc.size,
                chunks: fileDoc.chunks.length,
                dependencies: fileDoc.dependencies.length,
                exports: fileDoc.exports.length,
                uploadedAt: fileDoc.uploadedAt,
                embeddingsGenerated
            };

            logger.info(`Processed single file: ${file.originalname} (${language}) for user ${userId}`);

            res.json({
                success: true,
                data: { file: processedFile },
                message: `Successfully processed file: ${file.originalname}${embeddingsGenerated ? ' with embeddings' : ''}`
            });

        } catch (error) {
            logger.error(`Error processing file ${file.originalname}:`, error);

            // Clean up uploaded file on processing error
            try {
                await fs.unlink(file.path);
            } catch (unlinkError) {
                logger.warn(`Could not clean up file: ${file.path}`);
            }

            res.status(500).json({ success: false, error: 'File processing failed' });
        }

    } catch (error) {
        logger.error('Error in single file upload:', error);
        res.status(500).json({ success: false, error: 'File upload failed' });
    }
};

export const getUserFiles = async (req: AuthenticatedRequest, res: Response) => {
    try {
        logger.info('🔥 getUserFiles endpoint called!');

        if (!req.user) {
            logger.warn('❌ No user found in request');
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const userId = (req.user._id as string).toString();

        logger.info(`📂 Fetching all files for user ${userId}`);
        logger.info(`👤 Current user details: email=${req.user.email}, name=${req.user.name}`);

        const files = await File.find({ userId })
            .select('originalName language size chunks dependencies exports uploadedAt')
            .sort({ uploadedAt: -1 });

        logger.info(`📊 Found ${files.length} files for user ${userId}`);

        const userFiles = files.map(file => ({
            id: file._id,
            name: file.originalName,
            language: file.language,
            size: file.size,
            chunks: file.chunks.length,
            dependencies: file.dependencies.length,
            exports: file.exports.length,
            uploadedAt: file.uploadedAt
        }));

        logger.info(`✅ Returning ${userFiles.length} files for user ${userId}`);
        logger.info(`📋 File details:`, userFiles.map(f => ({ id: f.id, name: f.name })));

        const responseData = {
            success: true,
            data: { files: userFiles }
        };

        logger.info(`🔍 Response structure being sent:`, JSON.stringify(responseData, null, 2));

        res.json(responseData);

    } catch (error) {
        logger.error('❌ Error fetching user files:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch files' });
    }
};

export const getAllUserFiles = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const userId = (req.user._id as string).toString();

        const allFiles = await File.find({ userId }).select('originalName sessionId uploadedAt').sort({ uploadedAt: -1 });

        res.json({
            success: true,
            data: {
                files: allFiles.map(f => ({
                    id: f._id,
                    name: f.originalName,
                    sessionId: f.sessionId,
                    uploadedAt: f.uploadedAt
                }))
            }
        });

    } catch (error) {
        logger.error('Error fetching all user files:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch files' });
    }
};

export const assignFilesToSession = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const userId = (req.user._id as string).toString();
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'Session ID is required' });
        }

        // Find files without sessionId
        const filesWithoutSession = await File.find({
            userId,
            $or: [
                { sessionId: { $exists: false } },
                { sessionId: null },
                { sessionId: "" }
            ]
        });

        logger.info(`Found ${filesWithoutSession.length} files without sessionId for user ${userId}`);

        // Update files to have the current sessionId
        const updateResult = await File.updateMany(
            {
                userId,
                $or: [
                    { sessionId: { $exists: false } },
                    { sessionId: null },
                    { sessionId: "" }
                ]
            },
            { sessionId }
        );

        logger.info(`Updated ${updateResult.modifiedCount} files with sessionId ${sessionId}`);

        res.json({
            success: true,
            data: {
                filesUpdated: updateResult.modifiedCount,
                sessionId
            },
            message: `Assigned ${updateResult.modifiedCount} files to session ${sessionId}`
        });

    } catch (error) {
        logger.error('Error assigning files to session:', error);
        res.status(500).json({ success: false, error: 'Failed to assign files to session' });
    }
};

export const getSessionFiles = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { sessionId } = req.params;

        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const userId = (req.user._id as string).toString();

        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'Session ID is required' });
        }

        logger.info(`Looking for files with userId: ${userId}, sessionId: ${sessionId}`);

        // First, let's get all files for this user to understand the data
        const allUserFiles = await File.find({ userId }).select('originalName sessionId uploadedAt').sort({ uploadedAt: -1 });
        logger.info(`All files for user ${userId}:`, allUserFiles.map(f => ({
            name: f.originalName,
            sessionId: f.sessionId,
            uploadedAt: f.uploadedAt
        })));

        const files = await File.find({
            userId,
            sessionId
        }).select('originalName language size chunks dependencies exports uploadedAt sessionId').sort({ uploadedAt: -1 });

        logger.info(`Found ${files.length} files for session ${sessionId}`);

        // Also check if there are files without sessionId for this user
        const filesWithoutSession = await File.find({
            userId,
            $or: [
                { sessionId: { $exists: false } },
                { sessionId: null },
                { sessionId: "" }
            ]
        }).select('originalName sessionId').limit(5);

        if (filesWithoutSession.length > 0) {
            logger.info(`Found ${filesWithoutSession.length} files without sessionId for user ${userId}:`,
                filesWithoutSession.map(f => ({ name: f.originalName, sessionId: f.sessionId })));
        }

        const sessionFiles = files.map(file => ({
            id: file._id,
            name: file.originalName,
            language: file.language,
            size: file.size,
            chunks: file.chunks.length,
            dependencies: file.dependencies.length,
            exports: file.exports.length,
            uploadedAt: file.uploadedAt,
            sessionId: file.sessionId
        }));

        res.json({
            success: true,
            data: { files: sessionFiles }
        });

    } catch (error) {
        logger.error('Error fetching session files:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch session files' });
    }
}; export const getFileById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const userId = (req.user._id as string).toString();

        const file = await File.findOne({ _id: id, userId });
        if (!file) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        res.json({
            success: true,
            data: {
                file: {
                    id: file._id,
                    name: file.originalName,
                    language: file.language,
                    size: file.size,
                    content: file.content,
                    chunks: file.chunks.length,
                    dependencies: file.dependencies.length,
                    exports: file.exports.length,
                    uploadedAt: file.uploadedAt,
                    sessionId: file.sessionId
                }
            }
        });

    } catch (error) {
        logger.error('Error fetching file by ID:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch file' });
    }
};

export const deleteFile = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const userId = (req.user._id as string).toString();

        const file = await File.findOne({ _id: id, userId });
        if (!file) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        // Delete file from filesystem
        try {
            await fs.unlink(file.path);
        } catch (error) {
            logger.warn(`Could not delete file from filesystem: ${file.path}`);
        }

        // Delete from database
        await File.findByIdAndDelete(id);

        res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
        logger.error('Error deleting file:', error);
        res.status(500).json({ success: false, error: 'Failed to delete file' });
        res.status(500).json({ error: 'Failed to delete file' });
    }
};