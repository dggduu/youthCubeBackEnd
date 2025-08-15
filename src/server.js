// src/server.js

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB, ProgressComment } from './config/Sequelize.js';
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
import ProgessRouters from "./routes/ProgessRouters.js";
import ThoughtBulletRouters from "./routes/ThoughtBulletRouters.js";
import http from 'http';
import { setupSocketIO } from './config/socket.js';
import session from 'express-session';
import { getFilter } from "./utils/sensitiveWordFilter.js";
import staticRouters from "./routes/staticRouters.js";
import TeamAnnouncementRouters from "./routes/TeamAnnouncementRouters.js";

// 加载环境变量
dotenv.config();

// 创建 Express 应用
const app = express();

// 速率限制
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   limit: 400,
//   standardHeaders: 'draft-8',
//   legacyHeaders: false,
// });

// const uploadLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 500,
//   standardHeaders: 'draft-8',
//   legacyHeaders: false,
// });

// const dlLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 500,
//   standardHeaders: 'draft-8',
//   legacyHeaders: false,
// });

// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   standardHeaders: 'draft-8',
//   legacyHeaders: false,
// });

const filter = getFilter();

// 使用session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 5 * 60 * 1000 } // 15分钟
}));
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
app.use("/v1", ProgessRouters);
app.use("/v1", staticRouters);
app.use("/v1", ThoughtBulletRouters);
app.use("/v1", TeamAnnouncementRouters);

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
const PORT = process.env.PORT || 3166;
server.listen(PORT, () => {
  logger.info(`服务正在此端口运行: http://localhost:${PORT}`);
});