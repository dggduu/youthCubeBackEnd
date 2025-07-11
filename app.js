import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './src/config/Sequelize.js';
import authRoutes from './src/routes/auth.js';
import { rateLimit } from 'express-rate-limit';
import logger from "./src/config/pino.js";
import uploadRoutes from './src/routes/uploadRoutes.js';
import downloadRoute from "./src/routes/downloadRoutes.js";

import CommentRoutes from "./src/routes/CommentRoutes.js";
import PostRoutes from "./src/routes/PostRouter.js";
import TagRoutes from "./src/routes/TagRoutes.js";
import TeamRoutes from "./src/routes/TeamRoutes.js";
import UserRoutes from "./src/routes/UserRoutes.js";
import InviteRouters from "./src/routes/InvitationRouter.js";
// 加载环境变量
dotenv.config();

const limiter = rateLimit({ // 接口速率限制
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

const app = express();

// 中间件
app.use(express.json());
app.use(cors({
  origin: '*',
}));
app.use(helmet());
app.use(morgan('dev'));
//app.use(limiter);

connectDB();

// 路由
app.use('/v1', authRoutes);
app.use('/v1', CommentRoutes);
app.use('/v1', PostRoutes);
app.use('/v1', TagRoutes);
app.use('/v1', TeamRoutes);
app.use('/v1', UserRoutes);
app.use('/v1/upload', uploadRoutes);
app.use('/v1/dl',downloadRoute);
app.use('/v1', InviteRouters);
// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`服务正在此端口运行: http://localhost:${PORT}`);
});