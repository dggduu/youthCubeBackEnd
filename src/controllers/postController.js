// 导入模型和操作符
import { Posts, User, PostMedia, PostTags, tags, Likes, Comments, collections, Team, ProjectResult } from '../config/Sequelize.js';
import { Op, sequelize } from '../config/Sequelize.js';
import logger from "../config/pino.js";
import { getPagination, getPagingData } from '../utils/pagination.js';
import { getFilter } from "../utils/sensitiveWordFilter.js";

/**
 * 检查用户是否有权限修改或删除文章。
 * @param {number} userId - 当前用户ID
 * @param {number} postId - 文章ID
 * @returns {boolean} - true 如果用户是文章所有者或管理员，否则 false
 */
const checkPermissions = async (userId, postId) => {
    const post = await Posts.findByPk(postId, {
        include: [{
            model: User,
            as: 'author',
            attributes: ['is_admin']
        }]
    });
    if (!post) {
        return { authorized: false, message: '文章未找到' };
    }
    const isOwner = post.user_id === userId;
    const isAdmin = post.author?.is_admin;
    if (isOwner || isAdmin) {
        return { authorized: true, post };
    }
    return { authorized: false, message: '你不是文章的所有者或管理员' };
};

/**
 * 敏感词过滤通用函数
 * @param {string} text - 需要检查的文本
 * @param {string} fieldName - 字段名（例如：'标题'）
 * @returns {object|null} - 返回错误对象或 null
 */
const validateSensitiveWords = (text, fieldName) => {
    if (!text) {
        return null; // 如果文本为空，跳过检查
    }
    const filter = getFilter();
    const result = filter.filter(text, { replace: false });
    if (result.words.length > 0) {
        return { status: 422, message: `${fieldName}含有敏感词` };
    }
    return null;
};

// 导出 postController 对象
export const postController = {
    /**
     * @route POST /api/posts
     * @desc Create a new post
     * @access Private
     */
    createPost: async (req, res) => {
        try {
            const { title, content, cover_image_url, tagIds, attachments } = req.body;
            const user_id = req.user.userId;

            if (!title || !content || !user_id) {
                return res.status(400).json({ message: '标题、内容和用户ID是必需的' });
            }

            const sensitiveError = validateSensitiveWords(title, '标题');
            if (sensitiveError) {
                return res.status(sensitiveError.status).json({ message: sensitiveError.message });
            }

            const newPost = await Posts.create({
                user_id,
                title,
                content,
                cover_image_url,
            });

            if (tagIds && tagIds.length > 0) {
                const postTagRecords = tagIds.map(tag_id => ({
                    post_id: newPost.post_id,
                    tag_id: tag_id,
                }));
                await PostTags.bulkCreate(postTagRecords);
            }

            if (attachments && attachments.length > 0) {
                const attachmentRecords = attachments.map(attachment => ({
                    post_id: newPost.post_id,
                    media_url: attachment.url,
                    media_type: attachment.type || 'application/octet-stream',
                    order_index: attachment.order || 0,
                }));
                await PostMedia.bulkCreate(attachmentRecords);
            }

            const populatedPost = await Posts.findByPk(newPost.post_id, {
                include: [
                    { model: User, as: 'author', attributes: ['id', 'name', 'avatar_key'] },
                    { model: tags, as: 'tags', attributes: ['tag_id', 'tag_name'], through: { attributes: [] } },
                    {
                        model: PostMedia,
                        as: 'media',
                        attributes: ['media_id', 'media_url', 'media_type', 'order_index'],
                        where: {
                            media_type: {
                                [Op.notIn]: ['image/jpeg', 'image/png', 'image/gif']
                            }
                        },
                        required: false
                    }
                ]
            });

            res.status(201).json({ message: '文章创建成功', post: populatedPost });
        } catch (error) {
            logger.error('创建文章时出错:', error);
            res.status(500).json({ message: '服务器内部错误', error: error.message });
        }
    },
    createTeamReport: async (req, res) => {
        const transaction = await Posts.sequelize.transaction();
        try {
            const { title, content, cover_image_url, tagIds, type, attachments } = req.body;
            const user_id = req.user.userId;
            const team_id = req.params.teamId;

            if (!title || !content || !user_id || !team_id || !type) {
                await transaction.rollback();
                return res.status(400).json({
                    message: '标题、内容、用户ID、团队ID和报告类型都是必填项'
                });
            }

            if (!['article', 'manual'].includes(type)) {
                await transaction.rollback();
                return res.status(400).json({
                    message: '报告类型必须是 article 或 manual'
                });
            }

            const sensitiveError = validateSensitiveWords(title, '标题');
            if (sensitiveError) {
                await transaction.rollback();
                return res.status(sensitiveError.status).json({ message: sensitiveError.message });
            }

            const newPost = await Posts.create({
                user_id,
                title,
                content,
                cover_image_url,
            }, { transaction });

            if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
                const postTagRecords = tagIds.map(tag_id => ({
                    post_id: newPost.post_id,
                    tag_id,
                }));
                await PostTags.bulkCreate(postTagRecords, { transaction });
            }

            if (attachments && attachments.length > 0) {
                const attachmentRecords = attachments.map(attachment => ({
                    post_id: newPost.post_id,
                    media_url: attachment.url,
                    media_type: attachment.type,
                    order_index: attachment.order || 0,
                }));
                await PostMedia.bulkCreate(attachmentRecords, { transaction });
            }

            const newReport = await ProjectResult.create({
                team_id,
                type,
                post_id: newPost.post_id,
                is_completed: false,
                completed_at: null
            }, { transaction });

            await transaction.commit();

            return res.status(201).json({
                message: '团队报告创建成功',
                report_id: newReport.result_id
            });
        } catch (error) {
            await transaction.rollback();
            logger.error('创建团队报告失败:', error);
            return res.status(500).json({
                message: '服务器内部错误',
                error: error.message
            });
        }
    },
    /**
     * @route GET /api/posts
     * @desc Get all posts with pagination, filtering, sorting
     * @access Public
     */
    getAllPosts: async (req, res) => {
        try {
            const { page, size, userId, search, sortBy, order, tagId } = req.query;
            const { limit, offset } = getPagination(page, size);
            let whereCondition = {};
            let includeOptions = [
                { model: User, as: 'author', attributes: ['id', 'name', 'avatar_key', 'is_admin'] },
                { model: PostMedia, as: 'media', attributes: ['media_url', 'media_type', 'order_index'] },
                { model: tags, as: 'tags', attributes: ['tag_id', 'tag_name'], through: { attributes: [] } }
            ];

            if (userId) {
                whereCondition.user_id = userId;
            }
            if (search) {
                whereCondition[Op.or] = [
                    { title: { [Op.like]: `%${search}%` } },
                    { content: { [Op.like]: `%${search}%` } },
                    { location: { [Op.like]: `%${search}%` } }
                ];
            }
            if (tagId) {
                includeOptions.push({
                    model: tags,
                    as: 'tags',
                    where: { tag_id: tagId },
                    through: { attributes: [] },
                    required: true
                });
            }

            let orderClause = [['created_at', 'DESC']];
            if (sortBy && ['views_count', 'likes_count', 'comments_count', 'collected_count', 'created_at'].includes(sortBy)) {
                orderClause = [[sortBy, order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']];
            }

            const data = await Posts.findAndCountAll({
                limit,
                offset,
                where: whereCondition,
                include: includeOptions,
                order: orderClause,
                distinct: true,
                col: 'post_id'
            });

            const response = getPagingData(data, page, limit);
            res.status(200).json(response);
        } catch (error) {
            logger.error('获取所有文章时出错:', error);
            res.status(500).json({ message: '服务器内部错误', error: error.message });
        }
    },
    getAllPostsNoPaging: async (req, res) => {
        try {
            const { id, title, page, size } = req.query;

            const whereCondition = {};
            if (id) {
            whereCondition.post_id = id;
            }
            if (title) {
            whereCondition.title = { [Op.like]: `%${title}%` };
            }

            const includeOptions = [
            { model: User, as: 'author', attributes: ['id', 'name', 'avatar_key', 'is_admin'] },
            { model: PostMedia, as: 'media', attributes: ['media_url', 'media_type', 'order_index'] },
            { model: tags, as: 'tags', attributes: ['tag_id', 'tag_name'], through: { attributes: [] } },
            ];

            const data = await Posts.findAndCountAll({
            where: whereCondition,
            include: includeOptions,
            order: [['created_at', 'DESC']],
            distinct: true,
            col: 'post_id',
            });

            res.status(200).json({
            rows: data.rows,
            total: data.count,
            });
        } catch (error) {
            console.error('Get all posts error:', error);
            res.status(500).json({ message: '服务器内部错误', error: error.message });
        }
    },

    /**
     * @route GET /api/posts/:id
     * @desc Get a single post by ID
     * @access Public
     */
    getPostById: async (req, res) => {
        try {
            const { id } = req.params;
            const post = await Posts.findByPk(id, {
                include: [
                    { model: User, as: 'author', attributes: ['id', 'name', 'avatar_key', 'is_admin'] },
                    { model: tags, as: 'tags', attributes: ['tag_id', 'tag_name'], through: { attributes: [] } },
                    {
                        model: Comments,
                        as: 'comments',
                        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar_key'] }],
                        order: [['created_at', 'ASC']],
                        limit: 5
                    },
                    {
                        model: PostMedia,
                        as: 'media',
                        attributes: ['media_id', 'media_url', 'media_type', 'order_index'],
                        where: {
                            media_type: {
                                [Op.notIn]: ['image/jpeg', 'image/png', 'image/gif']
                            }
                        },
                        required: false
                    }
                ]
            });

            if (!post) {
                return res.status(404).json({ message: '文章未找到' });
            }

            await post.increment('views_count', { silent: true });
            res.status(200).json(post);
        } catch (error) {
            logger.error('根据ID获取文章时出错:', error);
            res.status(500).json({ message: '服务器内部错误', error: error.message });
        }
    },

    /**
     * @route PUT /api/posts/:id
     * @desc Update a post by ID
     * @access Private (Owner or Admin)
     */
    updatePost: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const user_id = req.user.userId;

            const { authorized, message, post } = await checkPermissions(user_id, id);
            if (!authorized) {
                return res.status(403).json({ message });
            }

            const { title, content, cover_image_url, location, media, tagIds, attachments } = req.body;
            const updateFields = { title, content, cover_image_url, location };

            const sensitiveError = validateSensitiveWords(title, '标题');
            if (sensitiveError) {
                return res.status(sensitiveError.status).json({ message: sensitiveError.message });
            }

            await post.update(updateFields, { transaction });

            if (media) {
                await PostMedia.destroy({
                    where: { post_id: id, media_type: { [Op.in]: ['image/jpeg', 'image/png', 'image/gif'] } },
                    transaction
                });
                const mediaRecords = media.map(m => ({ post_id: id, media_url: m.url, media_type: m.type, order_index: m.order }));
                await PostMedia.bulkCreate(mediaRecords, { transaction });
            }

            if (attachments) {
                await PostMedia.destroy({
                    where: { post_id: id, media_type: { [Op.notIn]: ['image/jpeg', 'image/png', 'image/gif'] } },
                    transaction
                });
                const attachmentRecords = attachments.map(attachment => ({ post_id: id, media_url: attachment.url, media_type: attachment.type, order_index: attachment.order || 0 }));
                await PostMedia.bulkCreate(attachmentRecords, { transaction });
            }

            if (tagIds) {
                await PostTags.destroy({ where: { post_id: id }, transaction });
                const postTagRecords = tagIds.map(tag_id => ({ post_id: id, tag_id }));
                await PostTags.bulkCreate(postTagRecords, { transaction });
            }

            await transaction.commit();

            const updatedPost = await Posts.findByPk(id, {
                include: [
                    { model: User, as: 'author', attributes: ['id', 'name', 'avatar_key', 'is_admin'] },
                    { model: PostMedia, as: 'media', attributes: ['media_id', 'media_url', 'media_type', 'order_index'] },
                    { model: tags, as: 'tags', attributes: ['tag_id', 'tag_name'], through: { attributes: [] } }
                ]
            });
            res.status(200).json({ message: '文章更新成功', post: updatedPost });

        } catch (error) {
            await transaction.rollback();
            logger.error('更新文章时出错:', error);
            res.status(500).json({ message: '服务器内部错误', error: error.message });
        }
    },

    /**
     * @route DELETE /api/posts/:id
     * @desc Delete a post by ID
     * @access Private (Owner or Admin)
     */
    deletePost: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const user_id = req.user.userId;

            const { authorized, message } = await checkPermissions(user_id, id);
            if (!authorized) {
                return res.status(403).json({ message });
            }

            await Posts.destroy({ where: { post_id: id }, transaction });

            await transaction.commit();
            res.status(204).send();

        } catch (error) {
            await transaction.rollback();
            logger.error('删除文章时出错:', error);
            res.status(500).json({ message: '服务器内部错误', error: error.message });
        }
    },

    /**
     * @route POST /api/posts/:id/like
     * @desc Like a post
     * @access Private
     */
    likePost: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id: postId } = req.params;
            const user_id = req.user.userId;

            const existingLike = await Likes.findOne({
                where: { user_id, target_id: postId, target_type: 'post' },
                transaction
            });

            if (existingLike) {
                await transaction.rollback();
                return res.status(409).json({ message: '不要重复点赞' });
            }

            await Likes.create({ user_id, target_id: postId, target_type: 'post' }, { transaction });
            await Posts.increment('likes_count', { by: 1, where: { post_id: postId }, transaction, silent: true });

            await transaction.commit();
            res.status(201).json({ message: '用户点赞成功' });
        } catch (error) {
            await transaction.rollback();
            logger.error('点赞文章时出错:', error);
            res.status(500).json({ message: '服务器内部错误', error: error.message });
        }
    },

    /**
     * @route DELETE /api/posts/:id/unlike
     * @desc Unlike a post
     * @access Private
     */
    unlikePost: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id: postId } = req.params;
            const user_id = req.user.userId;

            const deleted = await Likes.destroy({
                where: { user_id, target_id: postId, target_type: 'post' },
                transaction
            });

            if (deleted) {
                await Posts.increment('likes_count', { by: -1, where: { post_id: postId }, transaction, silent: true });
                await transaction.commit();
                res.status(204).send();
            } else {
                await transaction.rollback();
                res.status(404).json({ message: '此用户尚未点赞此文章' });
            }
        } catch (error) {
            await transaction.rollback();
            logger.error('取消点赞时出错:', error);
            res.status(500).json({ message: '服务器内部错误', error: error.message });
        }
    },
    /**
     * @route GET /api/posts/:id/like/status
     * @desc Get like status of current user for a post
     * @access Private
     */
    getLikeStatus: async (req, res) => {
        try {
            const { id: postId } = req.params;
            const user_id = req.user.userId;

            const [existingLike, post] = await Promise.all([
                Likes.findOne({ where: { user_id, target_id: postId, target_type: 'post' } }),
                Posts.findByPk(postId, { attributes: ['likes_count'] })
            ]);

            if (!post) {
                return res.status(404).json({ message: '文章不存在' });
            }

            res.json({
                liked: !!existingLike,
                likeCount: post.likes_count || 0
            });
        } catch (error) {
            logger.error('获取点赞状态时出错:', error);
            res.status(500).json({ message: '服务器内部错误', error: error.message });
        }
    },
    /**
     * @route POST /api/posts/:id/collect
     * @desc 用户收藏一篇文章
     * @access Private
     */
    collectPost: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id: postId } = req.params;
            const userId = req.user.userId;

            const existingCollection = await collections.findOne({
                where: { user_id: userId, post_id: postId },
                transaction
            });

            if (existingCollection) {
                await transaction.rollback();
                return res.status(409).json({ message: '你已经收藏过这篇文章了' });
            }

            await collections.create({ user_id: userId, post_id: postId }, { transaction });
            await Posts.increment('collected_count', { by: 1, where: { post_id: postId }, transaction, silent: true });

            await transaction.commit();
            res.status(201).json({ message: '收藏成功' });
        } catch (error) {
            await transaction.rollback();
            logger.error('收藏文章失败:', error);
            res.status(500).json({ message: '服务器内部错误', error: error.message });
        }
    },
    /**
     * @route DELETE /api/posts/:id/uncollect
     * @desc 用户取消收藏一篇文章
     * @access Private
     */
    uncollectPost: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id: postId } = req.params;
            const userId = req.user.userId;

            const deleted = await collections.destroy({
                where: { user_id: userId, post_id: postId },
                transaction
            });

            if (!deleted) {
                await transaction.rollback();
                return res.status(404).json({ message: '你尚未收藏该文章' });
            }

            await Posts.increment('collected_count', { by: -1, where: { post_id: postId }, transaction, silent: true });

            await transaction.commit();
            res.status(204).send();
        } catch (error) {
            await transaction.rollback();
            logger.error('取消收藏失败:', error);
            res.status(500).json({ message: '服务器内部错误', error: error.message });
        }
    },
 /**
   * @route GET /api/posts/collected
   * @desc 获取当前用户收藏的所有文章
   * @access Private
   */
  getCollectedPosts: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { page = 1, size = 10 } = req.query;
      const { limit, offset } = getPagination(page, size);

      // 获取分页的收藏记录及总数
      const { count, rows: collectData } = await collections.findAndCountAll({
        where: { user_id: userId },
        include: [
          {
            model: Posts,
            as: 'post',
            include: [
              { model: User, as: 'author', attributes: ['id', 'name', 'avatar_key'] },
              { model: tags, as: 'tags', attributes: ['tag_id', 'tag_name'], through: { attributes: [] } },
            ]
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      if (count === 0) {
        return res.status(200).json({ 
          data: [],
          pagination: {
            total: 0,
            page: +page,
            size: +size
          },
          message: '暂无收藏文章' 
        });
      }

      const collectedPosts = collectData.map(collection => collection.post);
      
      res.status(200).json({
        data: collectedPosts,
        pagination: {
          total: count,
          page: +page,
          size: +size,
          totalPages: Math.ceil(count / size)
        }
      });

    } catch (error) {
      console.error('获取收藏文章错误:', error);
      res.status(500).json({ 
        message: '服务器错误',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  getMyPosts: async (req, res) => {
    try {
      const { page = 0, size = 10, search, sortBy, order, tagId } = req.query;
      const userId = req.user.userId;
      const { limit, offset } = getPagination(page, size);

      const whereCondition = { 
        user_id: userId 
      };

      if (search) {
        whereCondition[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { content: { [Op.like]: `%${search}%` } },
          { location: { [Op.like]: `%${search}%` } }
        ];
      }

      let orderClause = [['created_at', 'DESC']];
      if (sortBy && ['views_count', 'likes_count', 'comments_count', 'collected_count', 'created_at'].includes(sortBy)) {
        orderClause = [[sortBy, order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']];
      }

      const includeOptions = [
        { model: User, as: 'author', attributes: ['id', 'name', 'avatar_key'] },
        { model: tags, as: 'tags', attributes: ['tag_id', 'tag_name'], through: { attributes: [] } }
      ];

      if (tagId) {
        includeOptions.push({
          model: tags,
          as: 'tags',
          where: { tag_id: tagId },
          through: { attributes: [] },
          required: true
        });
      }

      const data = await Posts.findAndCountAll({
        limit,
        offset,
        where: whereCondition,
        include: includeOptions,
        order: orderClause,
        distinct: true,
        col: 'post_id'
      });

      const response = getPagingData(data, page, limit);
      res.status(200).json(response);

    } catch (error) {
      console.error('Get my posts error:', error);
      res.status(500).json({ 
        message: 'Server error.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  /**
   * @route GET /api/posts/:id/collect/status
   * @desc 获取当前用户对某篇文章的收藏状态
   * @access Private
   */
  getCollectStatus: async (req, res) => {
    try {
      const { id: postId } = req.params;
      const userId = req.user.userId;
      // 查询是否已收藏
      const collection = await collections.findOne({
        where: { user_id: userId, post_id: postId }
      });

      // 查询文章本身（获取收藏总数）
      const post = await Posts.findByPk(postId);
      if (!post) {
        return res.status(404).json({ message: '文章不存在' });
      }

      const collectedCount = post.collected_count || 0;

      res.json({
        collected: !!collection,
        collectedCount
      });
    } catch (error) {
      console.error('获取收藏状态失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  },
};