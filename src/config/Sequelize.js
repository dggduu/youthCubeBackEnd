import { Sequelize } from 'sequelize';
import UserModel from '../models/user.js';
import RefreshTokenModel from '../models/refreshToken.js';
import dotenv from 'dotenv';
import logger from './pino.js';
export { Op } from 'sequelize';

import postsModel from '../models/posts.js';
import commentsModel from '../models/comments.js';
import likesModel from '../models/likes.js';
import collectionsModel from '../models/collections.js';
import postMediaModel from '../models/postMedia.js';
import postTagsModel from '../models/postTags.js';
import tagsModel from '../models/tags.js';
import teamsModel from '../models/teams.js';
import userFollowsModel from '../models/userFollows.js';
// 加载环境变量
dotenv.config();

// 初始化 Sequelize 实例
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

// 导入模型
const User = UserModel(sequelize, Sequelize);
const RefreshToken = RefreshTokenModel(sequelize, Sequelize);
const Posts = postsModel(sequelize, Sequelize);
const Comments = commentsModel(sequelize, Sequelize);
const Likes = likesModel(sequelize, Sequelize);
const collections = collectionsModel(sequelize, Sequelize);
const PostMedia = postMediaModel(sequelize, Sequelize);
const PostTags = postTagsModel(sequelize, Sequelize);
const tags = tagsModel(sequelize, Sequelize);
const Team = teamsModel(sequelize, Sequelize);
const UserFollows = userFollowsModel(sequelize, Sequelize);

User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

const db = {
  sequelize,
  Sequelize,
  User,
  RefreshToken,
  Posts,
  Comments,
  Likes,
  collections,
  PostMedia,
  PostTags,
  tags,
  Team,
  UserFollows,
};

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

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
  Sequelize,
  User,
  RefreshToken,
  Posts,
  Comments,
  Likes,
  collections,
  PostMedia,
  PostTags,
  tags,
  Team,
  UserFollows,
  connectDB,
};