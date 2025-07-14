// routes/chatRoomRoutes.js
import express from 'express';
import { chatRoomController } from '../controllers/ChatRoomController.js';
import authenticateToken from '../middleware/authMiddleware.js';

const router = express.Router();

router.put('/api/chatrooms/:room_id/update', authenticateToken, chatRoomController.updateChatRoomName);
router.put('/api/chatrooms/:room_id/members/:user_id/role', authenticateToken, chatRoomController.updateChatRoomMemberRole);
router.post('/api/chatrooms/:room_id/transfer-owner', authenticateToken, chatRoomController.transferOwner);

router.post('/api/chatrooms/private', authenticateToken, chatRoomController.createPrivateChat);
router.get('/api/chatrooms/private', authenticateToken, chatRoomController.listPrivateChatRooms);
//获取room_id
router.get('/api/chatrooms/team/:team_id', authenticateToken, chatRoomController.getTeamChatRoom);
router.get('/api/chatrooms/private/:targetUserId', authenticateToken, chatRoomController.getPrivateChatRoom);
router.get('/api/chatrooms/history/:room_id', authenticateToken, chatRoomController.getChatRoomMessages);


export default router;