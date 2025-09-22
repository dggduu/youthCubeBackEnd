import express from 'express';
const router = express.Router();

import { progressController } from '../controllers/ProgressController.js';
import authenticateToken from '../middleware/authMiddleware.js';

router.post('/api/team/:teamId/progress', authenticateToken, progressController.createTeamProgress);
router.get('/api/team/:teamId/progress', authenticateToken, progressController.getTeamProgressList);
router.get('/api/team/:teamId/progress/year', authenticateToken, progressController.getTeamProgressByYear);
router.get('/api/progress/:progressId',authenticateToken, progressController.getProgressById);
router.put('/api/progress/:id', authenticateToken, progressController.updateProgress);
router.delete('/api/progress/:id', authenticateToken, progressController.deleteProgress);
router.post('/api/progress/:progressId/comments', authenticateToken, progressController.addCommentToProgress);
router.get('/api/progress/:progressId/comments', progressController.getCommentsForProgress);
router.get('/api/progress/comments/:commentId/replies', progressController.getRepliesForProgressComment);

export default router;