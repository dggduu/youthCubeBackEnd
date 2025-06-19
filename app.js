const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/auth');
//加载环境变量
dotenv.config();

const app = express();

//中间件
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

//初始化数据库
const db = require('./config/db');

//测试数据库连接
db.query("SELECT 1")
  .then(() => console.log('Database connected successfully'))
  .catch(err => console.error('Database connection error:', err));

//路由
app.use('/api/auth', authRoutes);

//错误处理中间件
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

//启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});