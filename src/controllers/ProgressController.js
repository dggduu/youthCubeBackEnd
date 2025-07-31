import { TeamProgress } from '../config/Sequelize.js';
import { ProgressComment} from '../config/Sequelize.js';
import { User } from '../config/Sequelize.js';
import { Op } from 'sequelize';
import { getPagination, getPagingData } from '../utils/pagination.js';
import {
    getProgressOr404,
    getCommentOr404,
    checkPermission
  } from "../utils/ProgressUtil.js";
import { Sequelize } from 'sequelize';
import { getFilter } from "../utils/sensitiveWordFilter.js";
export const progressController = {
  /**
   * @route POST /api/team/:teamId/progress
   * @desc 创建一条团队进度条目
   * @access Private (仅团队成员)
   */
  createTeamProgress: async (req, res) => {
    try {
      const { teamId } = req.params;
      const { description, status = 'pending', timeline_type, title, event_time } = req.body;
      const submit_user_id = req.user.userId;

      // 校验必填字段
      if (!description) {
        return res.status(400).json({ message: '描述内容不能为空。' });
      }
      if (!timeline_type) {
        return res.status(400).json({ message: '时间线类型(timeline_type)不能为空。' });
      }
      if (!title) {
        return res.status(400).json({ message: '标题(title)不能为空。' });
      }
      if (!event_time) {
        return res.status(400).json({ message: '事件时间(event_time)不能为空。' });
      }
      
      const result = filter.filter(title, { replace: false });
      if (result.words.length > 0) {
        return res.status(422).json({message : "标题含有敏感词"});
      }
      const filter = getFilter();
      const DesResult = filter.filter(description, { replace: false });
      if (DesResult.words.length > 0) {
        return res.status(422).json({message : "内容含有敏感词"});
      }

      const newProgress = await TeamProgress.create({
        team_id: teamId,
        submit_user_id,
        description,
        content: description,
        status,
        timeline_type,
        title,
        event_time,
      });

      res.status(201).json({ message: '进度创建成功', progress: newProgress });
    } catch (error) {
      console.error('创建进度失败:', error);
      res.status(500).json({ message: '服务器错误。', error: error.message });
    }
  },

  /**
   * @route GET /api/team/:teamId/progress
   * @desc 获取某个团队的所有进度条目（分页）
   * @access Private
   */
  getTeamProgressList: async (req, res) => {
    try {
      const { teamId } = req.params;
      const { page, size } = req.query;
      const { limit, offset } = getPagination(page, size);

      const data = await TeamProgress.findAndCountAll({
        where: { team_id: teamId },
        include: [{
          model: User,
          as: 'submitter',
          attributes: ['id', 'name', 'avatar_key']
        }],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      const response = getPagingData(data, page, limit);
      res.status(200).json(response);
    } catch (error) {
      console.error('获取团队进度失败:', error);
      res.status(500).json({ message: '服务器错误。', error: error.message });
    }
  },

  getTeamProgressByYear: async (req, res) => {
    try {
      const { teamId, year } = req.params;
      const { page, size } = req.query;

      // 获取当前时间
      const today = new Date();
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      // 设置时间为当天的 00:00:00
      oneYearAgo.setHours(0, 0, 0, 0);
      today.setHours(23, 59, 59, 999);

      const progressList = await TeamProgress.findAll({
        where: {
          team_id: teamId,
          event_time: {
            [Op.between]: [oneYearAgo, today]
          }
        },
        attributes: ['event_time', 'timeline_type'],
        order: [['event_time', 'ASC']]
      });

      res.status(200).json({
        success: true,
        data: progressList
      });
    } catch (error) {
      console.error('按年份获取团队进度失败:', error);
      res.status(500).json({ 
        success: false,
        message: '按年份获取团队进度失败',
        error: error.message 
      });
    }
  },

  /**
   * @route GET /api/progress/:progressId
   * @desc 获取单条进度详情 + 提交人信息
   * @access Public
   */
  getProgressById: async (req, res) => {
    try {
      const progress = await getProgressOr404(req.params.progressId, res);
      if (!progress) return;
      res.status(200).json({ progress });
    } catch (error) {
      console.error('获取进度失败:', error);
      res.status(500).json({ message: '服务器错误。', error: error.message });
    }
  },

  /**
   * @route PUT /api/progress/:id
   * @desc 修改一条进度条目
   * @access Private (仅创建者或管理员)
   */
  updateProgress: async (req, res) => {
    try {
      const { id } = req.params;
      const { description, status } = req.body;
      const user_id = req.user.userId;

      const progress = await getProgressOr404(id, res);
      if (!progress) return;

      if (!checkPermission(res, progress.submit_user_id, user_id)) return;

      await progress.update({ description, status });

      const updatedProgress = await TeamProgress.findByPk(id, {
        include: [{ model: User, as: 'submitter', attributes: ['id', 'name', 'avatar_key'] }]
      });

      res.status(200).json({ message: '进度更新成功', progress: updatedProgress });
    } catch (error) {
      console.error('更新进度失败:', error);
      res.status(500).json({ message: '服务器错误。', error: error.message });
    }
  },

  /**
   * @route DELETE /api/progress/:id
   * @desc 删除一条进度条目
   * @access Private (仅创建者或管理员)
   */
  deleteProgress: async (req, res) => {
    try {
      const { id } = req.params;
      const user_id = req.user.userId;

      const progress = await getProgressOr404(id, res);
      if (!progress) return;

      if (!checkPermission(res, progress.submit_user_id, user_id)) return;

      await progress.destroy();
      res.status(204).send();
    } catch (error) {
      console.error('删除进度失败:', error);
      res.status(500).json({ message: '服务器错误。', error: error.message });
    }
  },


  // ========== 评论相关接口 ==========


  /**
   * @route POST /api/progress/:progressId/comments
   * @desc 给进度添加评论
   * @access Private
   */
  addCommentToProgress: async (req, res) => {
    try {
      const { progressId } = req.params;
      const { content, parent_comment_id } = req.body;
      const user_id = req.user.userId;

      if (!content) {
        return res.status(400).json({ message: '评论内容不能为空。' });
      }

      const progress = await TeamProgress.findByPk(progressId);
      if (!progress) {
        return res.status(404).json({ message: '进度不存在。' });
      }

      if (parent_comment_id) {
        const parentComment = await ProgressComment.findByPk(parent_comment_id);
        if (!parentComment || parentComment.progress_id !== parseInt(progressId)) {
          return res.status(404).json({ message: '父评论不存在或不属于此进度。' });
        }
      }
      const filter = getFilter();
      const result = filter.filter(content, { replace: false });
      if (result.words.length > 0) {
        return res.status(422).json({message : "含有敏感词"});
      }
      const newComment = await ProgressComment.create({
        progress_id: progressId,
        user_id,
        content,
        parent_comment_id,
      });

      const populatedComment = await ProgressComment.findByPk(newComment.comment_id, {
        include: [{ model: User, as: 'author', attributes: ['id', 'name', 'avatar_key'] }]
      });

      res.status(201).json({ message: '评论已添加', comment: populatedComment });
    } catch (error) {
      console.error('添加评论失败:', error);
      res.status(500).json({ message: '服务器错误。', error: error.message });
    }
  },


  /**
   * @route GET /api/progress/:progressId/comments
   * @desc 获取某条进度下的一级评论
   * @access Public
   */
  getCommentsForProgress : async (req, res) => {
    try {
      const { progressId } = req.params;
      const { page, size } = req.query;
      const { limit, offset } = getPagination(page, size);

      // 检查进度是否存在
      const progress = await TeamProgress.findByPk(progressId);
      if (!progress) {
        return res.status(404).json({ message: '进度未找到' });
      }

    const data = await ProgressComment.findAndCountAll({
        where: {
          progress_id: progressId,
          parent_comment_id: { [Op.is]: null }, // 顶级评论
        },
        attributes: {
          include: [
            [
              Sequelize.literal(`(
                SELECT COUNT(*)
                FROM progress_comments AS childComments
                WHERE childComments.parent_comment_id = \`ProgressComment\`.\`comment_id\`
              )`),
              'reply_count',
            ],
          ],
        },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'name', 'avatar_key'],
          },
        ],
        limit,
        offset,
        order: [['created_at', 'ASC']],
        subQuery: false, // 避免嵌套子查询
      });

      const response = getPagingData(data, page, limit);
      res.status(200).json(response);
    } catch (error) {
      console.error('获取进度评论失败:', error);
      res.status(500).json({
        message: '服务器错误',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },


  /**
   * @route GET /api/progress/comments/:commentId/replies
   * @desc 获取某条评论的子评论（回复）
   * @access Public
   */
  getRepliesForProgressComment: async (req, res) => {
    try {
      const { commentId } = req.params;
      const { page, size } = req.query;
      const { limit, offset } = getPagination(page, size);

      const parentComment = await ProgressComment.findByPk(commentId);
      if (!parentComment) {
        return res.status(404).json({ message: '父评论不存在。' });
      }

      const data = await ProgressComment.findAndCountAll({
        where: { parent_comment_id: commentId },
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'avatar_key']
        }],
        limit,
        offset,
        order: [['created_at', 'ASC']]
      });

      const response = getPagingData(data, page, limit);
      res.status(200).json(response);
    } catch (error) {
      console.error('获取评论回复失败:', error);
      res.status(500).json({ message: '服务器错误。', error: error.message });
    }
  },
};