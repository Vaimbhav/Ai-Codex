import { Router } from 'express';
import {
    generateEmbeddings,
    generateEmbeddingForFile,
    searchSimilarCode
} from '../controllers/embedding.controller';
import { requireAuthentication } from '../middleware/auth';

const router = Router();

// All embedding operations require user authentication
router.post('/generate', requireAuthentication, generateEmbeddings);
router.post('/generate/:fileId', requireAuthentication, generateEmbeddingForFile);
router.post('/search', requireAuthentication, searchSimilarCode); export default router;