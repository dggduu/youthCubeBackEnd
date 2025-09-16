import express from 'express';
import { userPaymentController } from '../controllers/UserPaymentController.js';
import authenticateToken from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/api/payments', authenticateToken, userPaymentController.getAllUserPayments);
router.get('/api/payments/all/nopaging', authenticateToken, userPaymentController.getAllPaymentsNoPaging);
router.get('/api/payments/me', authenticateToken, userPaymentController.getMyPayments);
router.get('/api/payments/:id', authenticateToken, userPaymentController.getUserPaymentById);
router.post('/api/payments', authenticateToken, userPaymentController.createUserPayment);
router.put('/api/payments/:id/status', authenticateToken, userPaymentController.updateUserPaymentStatus);
router.delete('/api/payments/:id', authenticateToken, userPaymentController.deleteUserPayment);

export default router;