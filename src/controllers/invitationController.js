import { Op } from '../config/Sequelize.js';
import { getPagination, getPagingData } from '../utils/pagination.js';
import { Invitation, Team, User, FriendInvitation, ChatRoomMember, UserFollows, ChatRoom } from "../config/Sequelize.js";

export const invitationController = {
  /**
   * @route GET /api/invitations/team
   * @desc 获取当前用户收到的所有队伍邀请
   * @access Private
   */
  getMyTeamInvitations: async (req, res) => {
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
  getMyFriendInvitations: async (req, res) => {
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
      const { team_id, user_id, email, description } = req.body;
      console.log(req.body);
      
      if (!team_id) {
        return res.status(400).json({ message: 'team_id is required.' });
      }

      if (!user_id && !email) {
        return res.status(400).json({ message: 'Either user_id or email is required.' });
      }

      if (!description) {
        return res.status(400).json({ message: 'Description is required.' });
      }

      if (user_id) {
        const userToInvite = await User.findOne({
          where: {
            id: user_id
          }
        });

        if (!userToInvite) {
          return res.status(404).json({ message: 'User not found.' });
        }

        if (userToInvite.team_id !== null) {
          return res.status(400).json({ message: 'User is already in a team and cannot be invited.' });
        }
      }


      const existing = await Invitation.findOne({
        where: {
          team_id,
          invited_by: currentUserId,
          [Op.or]: [
            { user_id: user_id || null },
            { email: email || null }
          ],
          status: 'pending'
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
        description,
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
      const { user_id, email,desciption } = req.body;
      console.log(req.body,currentUserId);
      if (!user_id && !email) {
        return res.status(400).json({ message: 'Either user_id or email is required.' });
      }

      if(user_id == currentUserId) {
        return res.status(400).json({ message: "不能向自己发送好友申请" });
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
        expires_at: expiresAt,
        desciption
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
    const transaction = await Invitation.sequelize.transaction();
    try {
      const currentUserId = req.user.userId;
      const invitationId = req.params.id;

      // 查找邀请记录
      const invitation = await Invitation.findByPk(invitationId, {
        transaction,
      });

      if (!invitation) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Invitation not found.' });
      }

      // 检查当前用户是否是邀请的接收者或者是团队管理员
      const chatRoom = await ChatRoom.findOne({
        where: { team_id: invitation.team_id },
        transaction
      });

      if (!chatRoom) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Team chat room not found.' });
      }

      const currentUserRole = await ChatRoomMember.findOne({
        where: {
          room_id: chatRoom.room_id,
          user_id: currentUserId,
          role: { [Op.in]: ['owner', 'co_owner'] }
        },
        transaction
      });

      // 如果不是管理员且不是被邀请者，拒绝操作
      if (!currentUserRole && invitation.user_id !== currentUserId) {
        await transaction.rollback();
        return res.status(403).json({ message: 'Unauthorized to accept this invitation.' });
      }

      // 如果是管理员接受其他人的邀请
      const targetUserId = currentUserRole ? invitation.user_id : currentUserId;

      const targetUser = await User.findByPk(targetUserId, { transaction });

      if (!targetUser) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Target user not found.' });
      }

      if (targetUser.team_id !== null) {
        await transaction.rollback();
        return res.status(409).json({ 
          message: 'User already belongs to a team and cannot accept this invitation.' 
        });
      }

      // 检查用户是否已经是成员
      const existingMember = await ChatRoomMember.findOne({
        where: {
          room_id: chatRoom.room_id,
          user_id: targetUserId,
        },
        transaction
      });

      if (existingMember) {
        await transaction.rollback();
        return res.status(409).json({ message: 'User is already a member.' });
      }

      // 将用户加入聊天室
      await ChatRoomMember.create({
        room_id: chatRoom.room_id,
        user_id: targetUserId,
        role: 'member',
        joined_at: new Date(),
      }, { transaction });

      // 更新team_id到user表
      await User.update(
        { team_id: invitation.team_id },
        { 
          where: { id: targetUserId },
          transaction 
        }
      );

      // 更新邀请状态为 accepted
      invitation.status = 'accepted';
      await invitation.save({ transaction });

      await transaction.commit();
      return res.json({ message: 'Successfully joined the team and chat room.' });
    } catch (error) {
      await transaction.rollback();
      console.error('Error accepting invitation:', error);
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
      if (currentUserId === invitation.inviter_id) {
        return res.status(400).json({ message: '不能与自己互粉' });
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
  },
  /**
   * @route GET /api/invitations/team/:team_id
   * @desc 获取队伍的所有邀请信息（仅限管理员）
   * @access Private
   */
  getTeamInvitations: async (req, res) => {
    const transaction = await Invitation.sequelize.transaction();
    try {
      const currentUserId = req.user.userId;
      const teamId = req.params.teamId;
      const { page = 0, size = 10 } = req.query;
      const { limit, offset } = getPagination(page, size);

      // 1. 检查当前用户是否是团队管理员
      const chatRoom = await ChatRoom.findOne({
        where: { team_id: teamId },
        transaction
      });

      if (!chatRoom) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Team chat room not found.' });
      }

      const member = await ChatRoomMember.findOne({
        where: {
          room_id: chatRoom.room_id,
          user_id: currentUserId,
          role: { [Op.in]: ['owner', 'co_owner'] } // 必须是owner或co_owner
        },
        transaction
      });

      if (!member) {
        await transaction.rollback();
        return res.status(403).json({ message: 'Only team admins can view invitations.' });
      }

      // 2. 获取该团队的所有邀请
      const invitations = await Invitation.findAndCountAll({
        where: { team_id: teamId },
        include: [
          { 
            model: User, 
            as: 'invitee', 
            attributes: ['id', 'name', 'email'] 
          },
          { 
            model: User, 
            as: 'inviter', 
            attributes: ['id', 'name'] 
          }
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
        transaction
      });

      await transaction.commit();
      const result = getPagingData(invitations, page, limit);
      return res.json(result);
    } catch (error) {
      await transaction.rollback();
      console.error('Error fetching team invitations:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },
};