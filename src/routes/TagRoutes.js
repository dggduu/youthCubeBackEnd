import express from 'express';
const router = express.Router();
import { tagController } from "../controllers/tagController.js";
import authenticateToken from "../middleware/authMiddleware.js";

router.post('/api/tags', authenticateToken, tagController.createTag);
router.get('/api/tags', tagController.getAllTags);
router.get('/api/tags/:id', tagController.getTagById);
router.get('/api/tags/:id/posts', tagController.getPostsByTag);

export default router;