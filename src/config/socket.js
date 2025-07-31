import { getFilter } from '../utils/sensitiveWordFilter.js';
import { Message, ChatRoom, ChatRoomMember, User } from './Sequelize.js';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import { Server } from 'socket.io';
import logger from "../config/pino.js";

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

export const onlineUsers = {};

export function setupSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // 认证中间件
  io.use(async (socket, next) => {
    try {
      const { token, room_id } = socket.handshake.auth;

      if (!token || !room_id) {
        logger.warn('认证失败：缺少 token 或 room_id');
        return next(new Error('缺少 token 或 room_id'));
      }

      // 验证 JWT
      const decoded = await promisify(jwt.verify)(token, JWT_SECRET);
      const userId = decoded.userId;

      // 挂载到 socket 上供后续使用
      socket.userId = userId;
      socket.room_id = room_id;

      // 查询房间是否存在
      const chatRoom = await ChatRoom.findOne({
        where: { room_id },
      });

      if (!chatRoom) {
        logger.warn(`认证失败：房间 ${room_id} 不存在`);
        return next(new Error('房间不存在'));
      }

      // 权限校验（私聊或团队）
      const isPrivateOrTeam = ['private', 'team'].includes(chatRoom.type);
      if (isPrivateOrTeam) {
        const isMember = await ChatRoomMember.findOne({
          where: { room_id, user_id: userId },
        });

        if (!isMember) {
          logger.warn(`用户 ${userId} 无权限访问房间 ${room_id}`);
          return next(new Error('无权访问该房间'));
        }
      }

      next();
    } catch (error) {
      logger.error('Socket 认证失败:', error.message);
      next(new Error('认证失败'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const room_id = socket.room_id;

    logger.info(`用户 ${userId} 连接并加入房间 ${room_id}`);

    // 加入房间
    socket.join(room_id);

    // 更新在线用户列表
    onlineUsers[userId] = socket.id;

    // 接收消息
    socket.on('send:message', async (payload) => {
      const { content } = payload;

      try {
        const filter = getFilter();
        const result = filter.filter(content, { replace: false });

        if (result.words.length > 0) {
          return socket.emit('message:error', {
            message: '消息包含敏感词，请修改后再发送',
            forbiddenWords: result.words,
            firstWord: result.words[0],
          });
        }

        // 存储消息到数据库
        const message = await Message.create({
          room_id,
          sender_id: userId,
          content,
        });

        const savedMessage = await Message.findByPk(message.message_id, {
          include: [{
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'avatar_key', 'sex']
          }]
        });
        const messageData = savedMessage.toJSON();

        logger.info(`用户 ${userId} 发送消息至房间 ${room_id}`);

        // 广播给房间里所有人（包括发送者自己）
        io.to(room_id).emit('receive:message', messageData);

      } catch (error) {
        logger.error(`发送消息失败:`, error.message);
        socket.emit('message:error', { message: '服务器错误' });
      }
    });

    // 用户断开连接
    socket.on('disconnect', () => {
      delete onlineUsers[userId];
      logger.info(`用户 ${userId} 断开连接`);
    });
  });

  return io;
}