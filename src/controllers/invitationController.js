import { Op } from '../config/Sequelize.js';
import { getPagination, getPagingData } from '../utils/pagination.js';
import { Invitation, Team, User, FriendInvitation, ChatRoomMember, UserFollows } from "../config/Sequelize.js";

export const invitationController = {
  /**
   * @route GET /api/invitations/team
   * @desc 获取当前用户收到的所有队伍邀请
   * @access Private
   */
  getTeamInvitations: async (req, res) => {
    try {
      const currentUserId = req.user.userId;
      const { page = 0, size = 10 } = req.query;
      const { limit, offset } = getPagination(page, size);

      const invitations = await Invitation.findAndCountAll({
        where: {
          user_id: currentUserId,
          status: 'pending',
        },
        include: [
          { 
            model: Team, 
            as: 'team',
            attributes: ['team_id', 'team_name', 'grade', 'is_public', 'create_at'] 
          },
          { 
            model: User, 
            as: 'inviter', 
            attributes: ['id', 'name'] 
          }
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });

      const result = getPagingData(invitations, page, limit);
      return res.json(result);
    } catch (error) {
      console.error('Error fetching team invitations:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * @route GET /api/invitations/friend
   * @desc 获取当前用户收到的好友邀请
   * @access Private
   */
  getFriendInvitations: async (req, res) => {
    try {
      const currentUserId = req.user.userId;
      const { page = 0, size = 10 } = req.query;
      const { limit, offset } = getPagination(page, size);

      const invitations = await FriendInvitation.findAndCountAll({
        where: {
          invitee_id: currentUserId,
          status: 'pending'
        },
        include: [
          { model: User, as: 'inviter', attributes: ['id', 'name'] }
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });

      const result = getPagingData(invitations, page, limit);
      return res.json(result);
    } catch (error) {
      console.error('Error fetching friend invitations:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * @route POST /api/invitations/team
   * @desc 邀请用户加入队伍（可选 user_id 或 email）
   * @access Private
   */
  inviteToTeam: async (req, res) => {
    try {
      const currentUserId = req.user.userId;
      const { team_id, user_id, email } = req.body;

      if (!team_id) {
        return res.status(400).json({ message: 'team_id is required.' });
      }

      if (!user_id && !email) {
        return res.status(400).json({ message: 'Either user_id or email is required.' });
      }

      const existing = await Invitation.findOne({
        where: {
          team_id,
          invited_by: currentUserId,
          user_id: user_id || null,
          email: email || null
        }
      });

      if (existing) {
        return res.status(400).json({ message: 'Invitation already exists.' });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7天有效期

      const invitation = await Invitation.create({
        team_id,
        invited_by: currentUserId,
        user_id,
        email,
        status: 'pending',
        expires_at: expiresAt
      });

      return res.status(201).json(invitation);
    } catch (error) {
      console.error('Error sending team invitation:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * @route POST /api/invitations/friend
   * @desc 邀请用户成为好友（可选 user_id 或 email）
   * @access Private
   */
  inviteAsFriend: async (req, res) => {
    try {
      const currentUserId = req.user.userId;
      const { user_id, email } = req.body;

      if (!user_id && !email) {
        return res.status(400).json({ message: 'Either user_id or email is required.' });
      }

      const existing = await FriendInvitation.findOne({
        where: {
          inviter_id: currentUserId,
          invitee_id: user_id || null,
          email: email || null
        }
      });

      if (existing) {
        return res.status(400).json({ message: 'Invitation already exists.' });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7天有效期

      const invitation = await FriendInvitation.create({
        inviter_id: currentUserId,
        invitee_id: user_id,
        email,
        status: 'pending',
        expires_at: expiresAt
      });

      return res.status(201).json(invitation);
    } catch (error) {
      console.error('Error sending friend invitation:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * @route PATCH /api/invitations/team/:id/accept
   * @desc 接受队伍邀请，并加入聊天室
   * @access Private
   */
  acceptTeamInvitation: async (req, res) => {
    try {
      const currentUserId = req.user.userId;
      const invitationId = req.params.id;

      const invitation = await Invitation.findByPk(invitationId);

      if (!invitation || invitation.user_id !== currentUserId) {
        return res.status(404).json({ message: 'Invitation not found.' });
      }

      if (invitation.expires_at < new Date()) {
        invitation.status = 'expired';
        await invitation.save();
        return res.status(400).json({ message: 'Invitation has expired.' });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: 'Invitation is not pending.' });
      }

      // 加入聊天室逻辑（示例 room_id 同 team_id）
      await ChatRoomMember.create({
        room_id: Team.team_id,
        user_id: currentUserId,
        role: 'member'
      });

      invitation.status = 'accepted';
      await invitation.save();

      return res.json(invitation);
    } catch (error) {
      console.error('Error accepting team invitation:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * @route PATCH /api/invitations/friend/:id/accept
   * @desc 接受好友邀请，添加双向关注
   * @access Private
   */
  acceptFriendInvitation: async (req, res) => {
    try {
      const currentUserId = req.user.userId;
      const invitationId = req.params.id;

      const invitation = await FriendInvitation.findByPk(invitationId);

      if (!invitation || invitation.invitee_id !== currentUserId) {
        return res.status(404).json({ message: 'Invitation not found.' });
      }

      if (invitation.expires_at < new Date()) {
        invitation.status = 'expired';
        await invitation.save();
        return res.status(400).json({ message: 'Invitation has expired.' });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: 'Invitation is not pending.' });
      }

      // 添加互相关注关系
      await UserFollows.create({
        follower_id: currentUserId,
        following_id: invitation.inviter_id
      });

      await UserFollows.create({
        follower_id: invitation.inviter_id,
        following_id: currentUserId
      });

      invitation.status = 'accepted';
      await invitation.save();

      return res.json(invitation);
    } catch (error) {
      console.error('Error accepting friend invitation:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * @route PATCH /api/invitations/team/:id/reject
   * @desc 拒绝队伍邀请
   * @access Private
   */
  rejectTeamInvitation: async (req, res) => {
    try {
      const currentUserId = req.user.userId;
      const invitationId = req.params.id;

      const invitation = await Invitation.findByPk(invitationId);

      if (!invitation || invitation.user_id !== currentUserId) {
        return res.status(404).json({ message: 'Invitation not found.' });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: 'Invitation is not pending.' });
      }

      invitation.status = 'rejected';
      await invitation.save();

      return res.json(invitation);
    } catch (error) {
      console.error('Error rejecting team invitation:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * @route PATCH /api/invitations/friend/:id/reject
   * @desc 拒绝好友邀请
   * @access Private
   */
  rejectFriendInvitation: async (req, res) => {
    try {
      const currentUserId = req.user.userId;
      const invitationId = req.params.id;

      const invitation = await FriendInvitation.findByPk(invitationId);

      if (!invitation || invitation.invitee_id !== currentUserId) {
        return res.status(404).json({ message: 'Invitation not found.' });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: 'Invitation is not pending.' });
      }

      invitation.status = 'rejected';
      await invitation.save();

      return res.json(invitation);
    } catch (error) {
      console.error('Error rejecting friend invitation:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  }
};