import { getFilter } from '../utils/sensitiveWordFilter.js';
import { Message, ChatRoom, ChatRoomMember } from './Sequelize.js';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import { Server } from 'socket.io';
import { constrainedMemory } from 'process';
import logger from "../config/pino.js";
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

let onlineUsers = {}; // { userId: socketId }

export function setupSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    try {
      // console.log(socket.handshake); //调试用
      const token = socket.handshake.auth.token;
      const room_id = socket.handshake.auth.room_id;
      // const token = socket.handshake.query.token;
      // const room_id = socket.handshake.query.room_id;
      
      if (!token || !room_id) {
        return next(new Error('缺少 token 或 room_id'));
      }

      // 解析 JWT
      const decoded = await promisify(jwt.verify)(token, JWT_SECRET);
      const userId = decoded.userId;

      // 将解析结果挂载到 socket 上供后续使用
      socket.userId = userId;
      socket.room_id = room_id;

      // 检查用户是否有权限加入该房间
      const chatRoom = await ChatRoom.findOne({
        where: { room_id },
      });

      if (!chatRoom) {
        return next(new Error('房间不存在'));
      }

      if (chatRoom.type === 'private') {
        // 私聊房间-必须是成员之一
        const isMember = await ChatRoomMember.findOne({
          where: { room_id, user_id: userId },
        });
        if (!isMember) {
          return next(new Error('无权访问私聊房间'));
        }
      } else if (chatRoom.type === 'team') {
        // 团队房间-必须是团队成员
        const isMember = await ChatRoomMember.findOne({
          where: { room_id, user_id: userId },
        });
        if (!isMember) {
          return next(new Error('无权访问团队房间'));
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

    logger.debug(`用户 ${userId} 连接并加入房间 ${room_id}`);

    // 加入房间
    socket.join(room_id);

    // 设置在线状态
    onlineUsers[userId] = socket.id;

    // 接收消息
    socket.on('send:message', async (payload) => {
      const { content } = payload;
      try {
        const filter = getFilter();
        const result = filter.filter(content, { replace: false });
        // console.log(result);
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
        const saveMessage = await Message.findByPk(message.message_id);
        const messageData = saveMessage.toJSON();

        // 向房间内所有其他用户广播消息(除自己)
        socket.to(room_id).emit('receive:message', messageData);
      } catch (error) {
        logger.error('发送消息失败:', error);
        socket.emit('message:error', { message: '服务器错误' });
      }
    });

    // 用户断开连接
    socket.on('disconnect', () => {
      delete onlineUsers[userId];
      logger.debug(`用户 ${userId} 断开连接`);
    });
  });

  return io;
}