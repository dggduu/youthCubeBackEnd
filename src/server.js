// src/server.js

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/Sequelize.js';
import authRoutes from './routes/auth.js';
import { rateLimit } from 'express-rate-limit';
import logger from "./config/pino.js";
import uploadRoutes from './routes/uploadRoutes.js';
import downloadRoute from "./routes/downloadRoutes.js";
import CommentRoutes from "./routes/CommentRoutes.js";
import PostRoutes from "./routes/PostRouter.js";
import TagRoutes from "./routes/TagRoutes.js";
import TeamRoutes from "./routes/TeamRoutes.js";
import UserRoutes from "./routes/UserRoutes.js";
import InviteRouters from "./routes/InvitationRouter.js";
import ChatRoomRouters from "./routes/ChatRoomRouters.js";
import http from 'http';
import { setupSocketIO } from './config/socket.js';

import { getFilter } from "./utils/sensitiveWordFilter.js";

// 加载环境变量
dotenv.config();

// 创建 Express 应用
const app = express();

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

const filter = getFilter();

// 中间件
app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(helmet());
app.use(morgan('dev'));
// app.use(limiter);

// 连接数据库
connectDB();

// 路由
app.use('/v1', authRoutes);
app.use('/v1', CommentRoutes);
app.use('/v1', PostRoutes);
app.use('/v1', TagRoutes);
app.use('/v1', TeamRoutes);
app.use('/v1', UserRoutes);
app.use('/v1/upload', uploadRoutes);
app.use('/v1/dl', downloadRoute);
app.use('/v1', InviteRouters);
app.use("/v1", ChatRoomRouters);
app.post("/test", (req, res) => {
  try {
    const { message } = req.body;
    const filter = getFilter();

    const { words: forbiddenWords } = filter.filter(message, { replace: false });
    
    if (forbiddenWords.length > 0) {
      return res.status(200).json({
        containsSensitiveWords: true,
        forbiddenWords,
        firstWord: forbiddenWords[0]
      });
    }

    return res.json({ containsSensitiveWords: false });
  } catch (e) {
    logger.error('检测异常:', e);
    return res.status(500).json({ error: '检测服务异常' });
  }
});
// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 创建 HTTP Server
const server = http.createServer(app);

// 初始化 Socket.IO
const io = setupSocketIO(server);

// 启动服务
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`服务正在此端口运行: http://localhost:${PORT}`);
});