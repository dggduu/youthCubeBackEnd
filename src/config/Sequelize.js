// src/config/Sequelize.js

import { Sequelize } from 'sequelize';
import UserModel from '../models/user.js';
import RefreshTokenModel from '../models/refreshToken.js';
import dotenv from 'dotenv';
import logger from './pino.js';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
  }
);

const User = UserModel(sequelize);
const RefreshToken = RefreshTokenModel(sequelize);

User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('数据库连接成功');
  } catch (error) {
    logger.error('无法连接数据库');
    process.exit(1);
  }
};

export {
  sequelize,
  User,
  RefreshToken,
  connectDB,
};