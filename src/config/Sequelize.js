import { Sequelize } from 'sequelize';
import UserModel from '../models/user.js';
import RefreshTokenModel from '../models/refreshToken.js';
import dotenv from 'dotenv';
import logger from './pino.js';
export { Op } from 'sequelize';

// 导入模型
import postsModel from '../models/posts.js';
import commentsModel from '../models/comments.js';
import likesModel from '../models/likes.js';
import collectionsModel from '../models/collections.js';
import postMediaModel from '../models/postMedia.js';
import postTagsModel from '../models/postTags.js';
import tagsModel from '../models/tags.js';
import teamsModel from '../models/teams.js';
import userFollowsModel from '../models/userFollows.js';
import chatRoomsModel from '../models/ChatRoom.js';
import chatRoomMembersModel from '../models/ChatRoomMember.js';
import messagesModel from '../models/Message.js';
import teamTagsModel from '../models/TeamTag.js';
import projectResultsModel from '../models/ProjectResult.js';
import invitationModel from "../models/Invitation.js";
import friendInvitationsModel from "../models/FriendInvitation.js";
import PrivateChatModel from '../models/PrivateChat.js';

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
const ChatRoom = chatRoomsModel(sequelize, Sequelize);
const ChatRoomMember = chatRoomMembersModel(sequelize, Sequelize);
const Message = messagesModel(sequelize, Sequelize);
const TeamTag = teamTagsModel(sequelize, Sequelize);
const ProjectResult = projectResultsModel(sequelize, Sequelize);
const Invitation = invitationModel(sequelize, Sequelize);
const FriendInvitation = friendInvitationsModel(sequelize, Sequelize);
const PrivateChat = PrivateChatModel(sequelize, Sequelize);

// 建立模型关联
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.belongsTo(Team, {
  foreignKey: 'team_id',
  as: 'team',
});

Team.hasMany(User, {
  foreignKey: 'team_id',
  as: 'users',
});

User.hasMany(Posts, { foreignKey: 'user_id', as: 'posts' });
Posts.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

UserFollows.belongsTo(User, { foreignKey: 'follower_id', as: 'follower' });
UserFollows.belongsTo(User, { foreignKey: 'following_id', as: 'following' });

Team.hasMany(ChatRoom, { foreignKey: 'team_id', as: 'chatRooms' });
ChatRoom.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

ChatRoom.hasMany(Message, { foreignKey: 'room_id', as: 'messages' });
Message.belongsTo(ChatRoom, { foreignKey: 'room_id', as: 'chatRoom' });

ChatRoom.hasMany(ChatRoomMember, { foreignKey: 'room_id', as: 'members' });
ChatRoomMember.belongsTo(ChatRoom, { foreignKey: 'room_id', as: 'chatRoom' });

ChatRoomMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });


Team.belongsToMany(tags, {
  through: TeamTag,
  foreignKey: 'team_id',
  otherKey: 'tag_id',
  as: 'tags'
});
tags.belongsToMany(Team, {
  through: TeamTag,
  foreignKey: 'tag_id',
  otherKey: 'team_id',
  as: 'teams'
});


Team.hasMany(ProjectResult, { foreignKey: 'team_id', as: 'projectResults' });
ProjectResult.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

ProjectResult.belongsTo(Posts, { foreignKey: 'post_id', as: 'post' });

// 构建 db 对象
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
  ChatRoom,
  ChatRoomMember,
  Message,
  TeamTag,
  ProjectResult,
  Invitation,
  FriendInvitation,
  PrivateChat
};

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// 连接数据库
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
  ChatRoom,
  ChatRoomMember,
  Message,
  TeamTag,
  ProjectResult,
  Invitation,
  FriendInvitation,
  PrivateChat,
  connectDB,
};