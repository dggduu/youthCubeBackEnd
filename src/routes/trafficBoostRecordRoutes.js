import express from 'express';
import { trafficBoostRecordController } from '../controllers/TrafficBoostRecordController.js';
import authenticateToken from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/api/traffic-boost-records', authenticateToken, trafficBoostRecordController.getAllTrafficBoostRecords);
router.get('/api/traffic-boost-records/posts/:postId', authenticateToken, trafficBoostRecordController.getTrafficBoostRecordsForPost);
router.get('/api/traffic-boost-records/:id', authenticateToken, trafficBoostRecordController.getTrafficBoostRecordById);
router.post('/api/traffic-boost-records', authenticateToken, trafficBoostRecordController.createTrafficBoostRecord);
router.delete('/api/traffic-boost-records/:id', authenticateToken, trafficBoostRecordController.deleteTrafficBoostRecord);

export default router;