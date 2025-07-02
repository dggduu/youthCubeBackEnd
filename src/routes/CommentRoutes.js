import express from 'express';
const router = express.Router();
import { commentController } from "../controllers/commentController.js";
import authenticateToken from "../middleware/authMiddleware.js";

router.post('/api/posts/:postId/comments', authenticateToken, commentController.addCommentToPost);
router.get('/api/posts/:postId/comments', commentController.getCommentsForPost);
router.get('/api/comments/:commentId/replies', commentController.getRepliesForComment);
router.put('/api/comments/:id', authenticateToken, commentController.updateComment);
router.delete('/api/comments/:id', authenticateToken, commentController.deleteComment);
router.post('/api/comments/:id/like', authenticateToken, commentController.likeComment);
router.delete('/api/comments/:id/unlike', authenticateToken, commentController.unlikeComment);

export default router;