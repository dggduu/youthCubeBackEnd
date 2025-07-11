import express from 'express';
const router = express.Router();
import { postController } from "../controllers/postController.js";
import authenticateToken from "../middleware/authMiddleware.js";

router.post('/api/posts', authenticateToken, postController.createPost);
router.get('/api/posts', postController.getAllPosts);
router.get('/api/posts/:id', postController.getPostById);
router.put('/api/posts/:id', authenticateToken, postController.updatePost);
router.delete('/api/posts/:id', authenticateToken, postController.deletePost);
router.post('/api/posts/:id/like', authenticateToken, postController.likePost);
router.delete('/api/posts/:id/unlike', authenticateToken, postController.unlikePost);
router.get('/api/posts/:id/like/status',authenticateToken, postController.getLikeStatus);
router.get('/api/posts/:id/collect/status',authenticateToken, postController.getCollectStatus);
router.post('/api/posts/:id/collect', authenticateToken, postController.collectPost);
router.delete('/api/posts/:id/uncollect', authenticateToken, postController.uncollectPost);
router.get('/api/collect/Post', authenticateToken, postController.getCollectedPosts);
router.get("/api/myposts", authenticateToken, postController.getMyPosts);
export default router;