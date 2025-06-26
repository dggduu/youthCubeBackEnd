const { Sequelize } = require('sequelize');
const UserModel = require('../models/user.js');
const RefreshTokenModel = require('../models/refreshToken.js');
const dotenv = require('dotenv');
dotenv.config();
const logger = require("../config/pino.js");
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

module.exports = {
  sequelize,
  User,
  RefreshToken,
  connectDB,
};