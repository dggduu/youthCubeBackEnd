const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connectDB } = require('./src/config/Sequelize.js');
const authRoutes = require('./src/routes/auth.js');

const logger = require("./src/config/pino.js");
//加载环境变量
dotenv.config();

const app = express();

//中间件
app.use(express.json());
app.use(cors({
  origin: '*',
}));
app.use(helmet());
app.use(morgan('dev'));

connectDB();
//路由
app.use('/v1/api', authRoutes);

//错误处理中间件
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`服务正在此端口运行: ${PORT}`);
});