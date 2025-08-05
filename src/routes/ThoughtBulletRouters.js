import express from 'express';
const router = express.Router();
import { thoughtBulletController } from "../controllers/ThoughtBulletController.js";
import authenticateToken from "../middleware/authMiddleware.js";

router.post('/api/thoughbullet', authenticateToken,  thoughtBulletController.createThoughtBullet);
router.delete('/api/thoughbullet/:id', authenticateToken,  thoughtBulletController.deleteThoughtBullet);
router.get('/api/thoughbullet', thoughtBulletController.getThoughtBullets);
router.get('/api/thoughbullet/myself',authenticateToken,  thoughtBulletController.getMyThoughtBullets);
router.put('/api/thoughbullet/:id', authenticateToken,  thoughtBulletController.updateThoughtBullet);

export default router;