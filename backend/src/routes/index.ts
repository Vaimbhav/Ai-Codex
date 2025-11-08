import { Router } from 'express';
import chatRoutes from './chat.routes';
import fileRoutes from './file.routes';
import embeddingRoutes from './embedding.routes';
import authRoutes from './auth.routes';

const router = Router();

// Health check for API
router.get('/health', (_req, res) => {
    res.json({ status: 'API is running', timestamp: new Date().toISOString() });
});

// API routes
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/files', fileRoutes);
router.use('/embeddings', embeddingRoutes);

export default router;
