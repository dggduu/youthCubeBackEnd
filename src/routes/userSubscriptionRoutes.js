import express from 'express';
import { userSubscriptionController } from '../controllers/UserSubscriptionController.js';
import authenticateToken from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/api/subscriptions', authenticateToken, userSubscriptionController.getAllUserSubscriptions);
router.get('/api/subscriptions/all/nopaging', authenticateToken, userSubscriptionController.getAllSubscriptionsNoPaging);
router.get('/api/subscriptions/me', authenticateToken, userSubscriptionController.getMySubscriptions);
router.get('/api/subscriptions/:id', authenticateToken, userSubscriptionController.getUserSubscriptionById);
router.post('/api/subscriptions', authenticateToken, userSubscriptionController.createUserSubscription);
router.put('/api/subscriptions/:id/cancel', authenticateToken, userSubscriptionController.cancelUserSubscription);

export default router;