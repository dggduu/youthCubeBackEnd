const { Sequelize } = require('sequelize');
const UserModel = require('../models/user');
const RefreshTokenModel = require('../models/refreshToken.js');
const dotenv = require('dotenv');
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
    console.log('数据库连接成功');
  } catch (error) {
    console.error('无法连接数据库:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  User,
  RefreshToken,
  connectDB,
};