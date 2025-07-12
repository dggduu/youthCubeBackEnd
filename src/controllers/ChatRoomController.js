import { ChatRoom } from '../config/Sequelize.js';
import { ChatRoomMember } from '../config/Sequelize.js';
import logger from "../config/pino.js";

export const chatRoomController = {
  /**
   * @route PUT /api/chatrooms/:room_id
   * @desc 修改聊天室名称
   * @access Private（需权限为 owner 或 co_owner）
   */
  updateChatRoomName: async (req, res) => {
    const { room_id } = req.params;
    const { name } = req.body;
    const currentUserId = req.user.userId;
    try {
      // 检查用户是否有权限修改聊天室名称
      const member = await ChatRoomMember.findOne({
        where: {
          room_id,
          user_id: currentUserId
        }
      });
      if (!member) {
        return res.status(403).json({ message: '您不是该聊天室成员' });
      }
      if (!['owner', 'co_owner'].includes(member.role)) {
        return res.status(403).json({ message: '无权限操作' });
      }

      // 更新聊天室名称
      const chatRoom = await ChatRoom.findByPk(room_id);
      if (!chatRoom) {
        return res.status(404).json({ message: '聊天室不存在' });
      }

      chatRoom.name = name;
      await chatRoom.save();

      return res.json({ message: '聊天室名称已更新', chatRoom });
    } catch (error) {
      logger.error('更新聊天室名称失败:', error);
      console.error('完整错误堆栈:', error.stack);
      return res.status(500).json({ message: '服务器内部错误' });
    }
  },

  /**
   * @route PUT /api/chatrooms/:room_id/members/:user_id/role
   * @desc 更改用户在聊天室中的权限（owner/co_owner/member）
   * @access Private（仅限 owner 或 co_owner）
   */
  updateChatRoomMemberRole: async (req, res) => {
    const { room_id, user_id } = req.params;
    const { role } = req.body;
    const currentUserId = req.user.userId;

    const validRoles = ['owner', 'co_owner', 'member'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: '无效的角色类型' });
    }

    try {
      // 检查操作者权限
      const operator = await ChatRoomMember.findOne({
        where: {
          room_id,
          user_id: currentUserId
        }
      });

      if (!operator || !['owner', 'co_owner'].includes(operator.role)) {
        return res.status(403).json({ message: '无权限操作' });
      }

      // 如果是设为 owner，必须保证只有一个 owner
      if (role === 'owner') {
        const currentOwner = await ChatRoomMember.findOne({
          where: {
            room_id,
            role: 'owner'
          }
        });

        if (currentOwner && currentOwner.user_id !== user_id) {
          return res.status(400).json({ message: '一个队伍只能有一个队长' });
        }
      }

      // 修改成员角色
      const member = await ChatRoomMember.findOne({
        where: {
          room_id,
          user_id
        }
      });

      if (!member) {
        return res.status(404).json({ message: '该用户不是聊天室成员' });
      }

      // 如果是降级 owner，必须确保还有其他 owner
      if (member.role === 'owner' && role !== 'owner') {
        const otherOwners = await ChatRoomMember.findAll({
          where: {
            room_id,
            role: 'owner',
            user_id: { [Op.ne]: user_id }
          }
        });

        if (otherOwners.length === 0) {
          return res.status(400).json({ message: '不能移除最后一个队长' });
        }
      }

      member.role = role;
      await member.save();

      return res.json({ message: '权限已更新', member });
    } catch (error) {
      logger.error('更改用户权限失败:', error);
      return res.status(500).json({ message: '服务器内部错误' });
    }
  },

  /**
   * @route POST /api/chatrooms/:room_id/transfer-owner
   * @desc 转让队长权限给另一个成员
   * @access Private（仅限当前 owner）
   */
  transferOwner: async (req, res) => {
    const { room_id } = req.params;
    const { newOwnerId } = req.body;
    const currentUserId = req.user.userId;

    try {
      // 检查当前用户是否是 owner
      const currentOwner = await ChatRoomMember.findOne({
        where: {
          room_id,
          user_id: currentUserId,
          role: 'owner'
        }
      });

      if (!currentOwner) {
        return res.status(403).json({ message: '只有队长可以转让权限' });
      }

      // 检查目标用户是否是成员
      const newOwner = await ChatRoomMember.findOne({
        where: {
          room_id,
          user_id: newOwnerId
        }
      });

      if (!newOwner) {
        return res.status(404).json({ message: '目标用户不是成员' });
      }

      if (newOwner.role === 'owner') {
        return res.status(400).json({ message: '该用户已经是队长' });
      }

      // 确保目标用户不是 co_owner 或 member，可以设为 owner
      const existingOwner = await ChatRoomMember.findOne({
        where: {
          room_id,
          role: 'owner'
        }
      });

      // 设置新 owner
      newOwner.role = 'owner';
      await newOwner.save();

      // 当前用户降级为 co_owner
      currentOwner.role = 'co_owner';
      await currentOwner.save();

      return res.json({
        message: '队长权限已转让',
        newOwner: newOwner,
        oldOwner: currentOwner
      });
    } catch (error) {
      logger.error('转让队长权限失败:', error);
      return res.status(500).json({ message: '服务器内部错误' });
    }
  },
    createPrivateChat: async (req, res) => {
        const userId = req.user.userId;
        const { targetUserId } = req.body;

        if (!targetUserId || typeof targetUserId !== 'number') {
        return res.status(400).json({ message: '请提供有效的目标用户ID' });
        }

        if (userId === targetUserId) {
        return res.status(400).json({ message: '不能与自己私聊' });
        }

        try {
        const chatRoom = await ChatRoom.create({
            type: 'private',
            name: `用户${userId}和用户${targetUserId}`,
            created_at: new Date()
        });

        await ChatRoomMember.bulkCreate([
            {
            room_id: chatRoom.room_id,
            user_id: userId,
            role: 'member'
            },
            {
            room_id: chatRoom.room_id,
            user_id: targetUserId,
            role: 'member'
            }
        ]);

        return res.status(201).json({
            message: '私聊聊天室已创建',
            chatRoomId: chatRoom.room_id,
            users: [userId, targetUserId]
        });
        } catch (error) {
        logger.error('创建私聊失败:', error);
        return res.status(500).json({ message: '服务器内部错误' });
        }
    }
};