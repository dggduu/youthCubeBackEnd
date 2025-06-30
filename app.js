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
app.use(limiter);

connectDB();

// 路由
app.use('/v1/api', authRoutes);
app.use('/upload', uploadRoutes);
// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`服务正在此端口运行: http://localhost:${PORT}`);
});