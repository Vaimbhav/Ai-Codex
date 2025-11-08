import { Router } from 'express';
import { upload, uploadFiles, uploadSingleFile, getFiles, getFileContent, deleteFile, getSessionFiles, getFileById, getAllUserFiles, assignFilesToSession, getUserFiles } from '../controllers/file.controller';
import { requireAuthentication } from '../middleware/auth';

const router = Router();

// All file operations require user authentication
router.post('/upload', requireAuthentication, upload.array('files', 100), uploadFiles);
router.post('/upload-single', requireAuthentication, upload.single('file'), uploadSingleFile);
router.post('/upload-multiple', requireAuthentication, upload.array('files', 10), uploadFiles);
router.get('/', requireAuthentication, getFiles);
router.get('/user', requireAuthentication, getUserFiles);
router.get('/debug/all', requireAuthentication, getAllUserFiles); router.post('/assign-to-session', requireAuthentication, assignFilesToSession);
router.get('/session/:sessionId', requireAuthentication, getSessionFiles);
router.get('/file/:id', requireAuthentication, getFileById);
router.get('/:id', requireAuthentication, getFileContent);
router.delete('/:id', requireAuthentication, deleteFile);

export default router;