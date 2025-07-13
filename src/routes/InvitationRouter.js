import express from 'express';
const router = express.Router();

import { invitationController } from '../controllers/invitationController.js';
import authenticateToken from "../middleware/authMiddleware.js";
// 获取当前用户所有的邀请
router.get('/api/invite/team',authenticateToken, invitationController.getMyTeamInvitations);     // 获取队伍邀请
router.get('/api/invite/friend', authenticateToken, invitationController.getMyFriendInvitations); // 获取好友邀请

router.get('/api/invite/:teamId', authenticateToken, invitationController.getTeamInvitations);
//发送邀请
router.post('/api/invite/team', authenticateToken, invitationController.inviteToTeam);          // 邀请加入队伍
router.post('/api/invite/friend', authenticateToken, invitationController.inviteAsFriend);      // 邀请添加好友

// 接受邀请
router.patch('/api/invite/team/:id/accept', authenticateToken, invitationController.acceptTeamInvitation);    // 接受队伍邀请
router.patch('/api/invite/friend/:id/accept', authenticateToken, invitationController.acceptFriendInvitation); // 接受好友邀请

// 拒绝邀请
router.patch('/api/invite/team/:id/reject', authenticateToken, invitationController.rejectTeamInvitation);     // 拒绝队伍邀请
router.patch('/api/invite/friend/:id/reject', authenticateToken, invitationController.rejectFriendInvitation);  // 拒绝好友邀请

export default router;