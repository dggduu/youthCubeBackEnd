import { ChatRoom } from '../config/Sequelize.js';
import { ChatRoomMember, PrivateChat, UserFollows, Op, User, Message, sequelize } from '../config/Sequelize.js';
import logger from "../config/pino.js";
import { getPagination, getPagingData } from "../utils/pagination.js";
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

      // 确保 user1_id < user2_id
      const user1_id = Math.min(userId, targetUserId);
      const user2_id = Math.max(userId, targetUserId);

      try {
          const existingPrivateChat = await PrivateChat.findOne({
              where: { user1_id, user2_id }
          });

          if (existingPrivateChat) {
              // 已有私聊房间，直接返回
              return res.status(200).json({
                  message: '私聊房间已存在',
                  chatRoomId: existingPrivateChat.room_id,
                  users: [user1_id, user2_id]
              });
          }

          // 2创建聊天室
          const chatRoom = await ChatRoom.create({
              type: 'private',
              name: `私聊_${user1_id}_和_${user2_id}`,
              created_at: new Date()
          });

          const roomId = chatRoom.room_id;

          // 添加两个用户到聊天室成员表
          await ChatRoomMember.bulkCreate([
              {
                  room_id: roomId,
                  user_id: user1_id,
                  role: 'member'
              },
              {
                  room_id: roomId,
                  user_id: user2_id,
                  role: 'member'
              }
          ]);

          // 插入私聊映射表
          await PrivateChat.create({
              user1_id,
              user2_id,
              room_id: roomId
          });

          return res.status(201).json({
              message: '私聊聊天室已创建',
              chatRoomId: roomId,
              users: [user1_id, user2_id]
          });

      } catch (error) {
          logger.error('创建私聊失败:', error);
          return res.status(500).json({ message: '服务器内部错误' });
      }
  },
  getTeamChatRoom: async (req, res) => {
      const { team_id } = req.params;

      if (!team_id || isNaN(team_id)) {
          return res.status(400).json({ message: '请提供有效的团队ID' });
      }

      try {
          const teamChatRoom = await ChatRoom.findOne({
              where: { 
                  team_id: parseInt(team_id),
                  type: 'team' 
              }
          });

          if (!teamChatRoom) {
              return res.status(404).json({ message: '未找到该团队的聊天室' });
          }

          return res.status(200).json({
              message: '成功获取团队聊天室',
              chatRoomId: teamChatRoom.room_id,
              teamId: teamChatRoom.team_id,
              name: teamChatRoom.name
          });

      } catch (error) {
          logger.error('获取团队聊天室失败:', error);
          return res.status(500).json({ message: '服务器内部错误' });
      }
  },

  getPrivateChatRoom: async (req, res) => {
      const userId = req.user.userId;
      const { targetUserId } = req.params;

      if (!targetUserId || isNaN(targetUserId)) {
          return res.status(400).json({ message: '请提供有效的目标用户ID' });
      }

      if (userId === parseInt(targetUserId)) {
          return res.status(400).json({ message: '不能与自己私聊' });
      }

      // 确保 user1_id < user2_id
      const user1_id = Math.min(userId, parseInt(targetUserId));
      const user2_id = Math.max(userId, parseInt(targetUserId));

      try {
          const existingPrivateChat = await PrivateChat.findOne({
              where: { user1_id, user2_id }
          });

          if (!existingPrivateChat) {
              return res.status(404).json({ message: '未找到私聊房间' });
          }

          // 获取聊天室详细信息
          const chatRoom = await ChatRoom.findByPk(existingPrivateChat.room_id);

          return res.status(200).json({
              message: '成功获取私聊房间',
              chatRoomId: existingPrivateChat.room_id,
              users: [user1_id, user2_id],
              name: chatRoom.name,
              createdAt: chatRoom.created_at
          });

      } catch (error) {
          logger.error('获取私聊房间失败:', error);
          return res.status(500).json({ message: '服务器内部错误' });
      }
  },
listPrivateChatRooms: async (req, res) => {
    const userId = req.user.userId;
    const { page = 0, size = 10 } = req.query;
    
    try {
        const { limit, offset } = getPagination(page, size);
        
        const privateChats = await PrivateChat.findAndCountAll({
            where: {
                [Op.or]: [
                    { user1_id: userId },
                    { user2_id: userId }
                ]
            },
            include: [
                {
                    model: User,
                    as: 'PrivateChatUser1',
                    attributes: ['id', 'name', 'avatar_key']
                },
                {
                    model: User,
                    as: 'PrivateChatUser2',
                    attributes: ['id', 'name', 'avatar_key']
                },
                {
                    model: ChatRoom,
                    as: 'PrivateChatRoom',
                    attributes: ['room_id', 'updated_at']
                }
            ],
            limit,
            offset,
            order: [
                [{ model: ChatRoom, as: 'PrivateChatRoom' }, 'updated_at', 'DESC']
            ]
        });

        const roomIds = privateChats.rows.map(chat => chat.PrivateChatRoom.room_id);
        
        const lastMessages = await Message.findAll({
            where: {
                room_id: roomIds
            },
            attributes: [
                'room_id',
                [sequelize.fn('MAX', sequelize.col('timestamp')), 'latest_timestamp']
            ],
            group: ['room_id'],
            raw: true
        });

        const latestMessages = await Message.findAll({
            where: {
                [Op.and]: lastMessages.map(msg => ({
                    room_id: msg.room_id,
                    timestamp: msg.latest_timestamp
                }))
            },
            attributes: ['room_id', 'content', 'timestamp'],
            raw: true
        });

        const results = await Promise.all(privateChats.rows.map(async (chat) => {
            const otherUser = chat.user1_id === userId ? chat.PrivateChatUser2 : chat.PrivateChatUser1;
            const roomInfo = chat.PrivateChatRoom;
            
            const followStatus = await UserFollows.findOne({
                where: {
                    follower_id: userId,
                    following_id: otherUser.id
                }
            });

            const lastMessage = latestMessages.find(msg => msg.room_id === roomInfo.room_id);

            return {
                room_id: roomInfo.room_id,
                other_user: {
                    id: otherUser.id,
                    name: otherUser.name,
                    avatar: otherUser.avatar_key,
                    is_following: !!followStatus
                },
                last_message: lastMessage?.content || null,
                updated_at: roomInfo.updated_at
            };
        }));

        const response = getPagingData({
            count: privateChats.count,
            rows: results
        }, page, limit);

        res.status(200).json(response);
    } catch (error) {
        console.error('Error listing private chat rooms:', error);
        res.status(500).json({ 
            message: 'Failed to list private chat rooms',
            error: error.message
        });
    }
}
};