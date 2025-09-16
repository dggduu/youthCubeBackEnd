import express from 'express';
import { paymentProductController } from '../controllers/PaymentProductController.js';
import authenticateToken from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/api/payment-products', authenticateToken, paymentProductController.getAllPaymentProducts);
router.get('/api/payment-products/nopaging', authenticateToken, paymentProductController.getAllPaymentProductsNoPaging);
router.get('/api/payment-products/:id', authenticateToken, paymentProductController.getPaymentProductById);
router.post('/api/payment-products', authenticateToken, paymentProductController.createPaymentProduct);
router.put('/api/payment-products/:id', authenticateToken, paymentProductController.updatePaymentProduct);
router.delete('/api/payment-products/:id', authenticateToken, paymentProductController.deletePaymentProduct);

export default router;