import express from 'express';
const router = express.Router();
import authenticateToken from '../middleware/authMiddleware.js';
import uploadController from '../controllers/uploadController.js';

router.post('/initiate', authenticateToken, uploadController.initiateUpload);
router.post('/part', authenticateToken, uploadController.uploadPart);
router.post('/complete', authenticateToken, uploadController.completeUpload);
router.post('/abort', authenticateToken, uploadController.abortUpload);

export default router;