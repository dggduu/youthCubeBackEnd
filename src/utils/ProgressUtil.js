import { TeamProgress, User, ProgressComment } from "../config/Sequelize.js";

// 获取进度并检查是否存在
const getProgressOr404 = async (progressId, res) => {
  const progress = await TeamProgress.findByPk(progressId, {
    include: [{ model: User, as: 'submitter', attributes: ['id', 'name', 'avatar_key'] }]
  });
  if (!progress) {
    res.status(404).json({ message: '进度不存在。' });
    return null;
  }
  return progress;
};

// 获取评论并检查是否存在
const getCommentOr404 = async (commentId, res) => {
  const comment = await ProgressComment.findByPk(commentId);
  if (!comment) {
    res.status(404).json({ message: '评论不存在。' });
    return null;
  }
  return comment;
};

// 权限检查
const checkPermission = (res, ownerId, userId) => {
  if (ownerId !== userId) {
    res.status(403).json({ message: '没有权限执行此操作。' });
    return false;
  }
  return true;
};

export {
    getProgressOr404,
    getCommentOr404,
    checkPermission
};