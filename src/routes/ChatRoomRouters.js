// routes/chatRoomRoutes.js
import express from 'express';
import { chatRoomController } from '../controllers/ChatRoomController.js';
import authenticateToken from '../middleware/authMiddleware.js';

const router = express.Router();

router.put('/api/chatrooms/:room_id/update', authenticateToken, chatRoomController.updateChatRoomName);
router.put('/api/chatrooms/:room_id/members/:user_id/role', authenticateToken, chatRoomController.updateChatRoomMemberRole);
router.post('/api/chatrooms/:room_id/transfer-owner', authenticateToken, chatRoomController.transferOwner);

export default router;