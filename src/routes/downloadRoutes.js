// downloadRoutes.js
import express from 'express';
const router = express.Router();

import authenticateToken from '../middleware/authMiddleware.js';
import uploadController from '../controllers/uploadController.js';

router.get('/{*splat}', uploadController.downloadFile);

export default router;