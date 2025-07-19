// 导入模型和操作符
import { Posts } from '../config/Sequelize.js';
import { User } from '../config/Sequelize.js';
import { PostMedia } from '../config/Sequelize.js';
import { PostTags } from '../config/Sequelize.js';
import { tags } from '../config/Sequelize.js';
import { Likes } from '../config/Sequelize.js';
import { Comments } from '../config/Sequelize.js';
import { collections } from '../config/Sequelize.js';
import { Op } from '../config/Sequelize.js';
import logger from "../config/pino.js";
import { getPagination, getPagingData } from '../utils/pagination.js';

// 导出 postController 对象
export const postController = {
  /**
   * @route POST /api/posts
   * @desc Create a new post
   * @access Private
   */
  createPost: async (req, res) => {
    try {
      const { title, content, cover_image_url,tagIds } = req.body;
      const user_id = req.user.userId;
      console.log(user_id,title,content,tagIds);
      if (!title || !content || !user_id) {
        return res.status(400).json({ message: 'Title, content, and user ID are required.' });
      }

      const newPost = await Posts.create({
        user_id,
        title,
        content,
        cover_image_url,
      });

      // Handle tags
      if (tagIds && tagIds.length > 0) {
        const postTagRecords = tagIds.map(tag_id => ({
          post_id: newPost.post_id,
          tag_id: tag_id,
          created_at: new Date(),
          updated_at: new Date(),
        }));
        await PostTags.bulkCreate(postTagRecords);
      }

      const populatedPost = await Posts.findByPk(newPost.post_id, {
        include: [
          { model: User, as: 'author', attributes: ['id', 'name', 'avatar_key'] },
          { model: tags, as: 'tags', attributes: ['tag_id', 'tag_name'], through: { attributes: [] } }
        ]
      });

      res.status(201).json({ message: 'Post created successfully.', post: populatedPost });
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
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

      let orderClause = [['created_at', 'DESC']];
      if (sortBy && ['views_count', 'likes_count', 'comments_count', 'collected_count', 'created_at'].includes(sortBy)) {
        orderClause = [[sortBy, order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']];
      }

      let includeOptions = [
        { model: User, as: 'author', attributes: ['id', 'name', 'avatar_key'] },
        { model: PostMedia, as: 'media', attributes: ['media_url', 'media_type', 'order_index'] },
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
      console.error('Get all posts error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
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
          { model: User, as: 'author', attributes: ['id', 'name', 'avatar_key'] },
          { model: tags, as: 'tags', attributes: ['tag_id', 'tag_name'], through: { attributes: [] } },
          {
            model: Comments,
            as: 'comments',
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar_key'] }],
            order: [['created_at', 'ASC']],
            limit: 5
          }
        ]
      });

      if (!post) {
        return res.status(404).json({ message: '文章未找到' });
      }

      await post.increment('views_count', { silent: true });

      res.status(200).json(post);
    } catch (error) {
      console.error('Get post by ID error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route PUT /api/posts/:id
   * @desc Update a post by ID
   * @access Private (Owner)
   */
  updatePost: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, cover_image_url, location, media, tagIds } = req.body;
      const user_id = req.user.id;

      const post = await Posts.findByPk(id);
      if (!post) {
        return res.status(404).json({ message: '文章未找到' });
      }

      if (post.user_id !== user_id) {
        return res.status(403).json({ message: '你不是文章的所有者' });
      }

      const [updated] = await Posts.update(
        { title, content, cover_image_url, location },
        { where: { post_id: id } }
      );

      if (media) {
        await PostMedia.destroy({ where: { post_id: id } });
        const mediaRecords = media.map(m => ({
          post_id: id,
          media_url: m.url,
          media_type: m.type,
          order_index: m.order,
        }));
        await PostMedia.bulkCreate(mediaRecords);
      }

      if (tagIds) {
        await PostTags.destroy({ where: { post_id: id } });
        const postTagRecords = tagIds.map(tag_id => ({
          post_id: id,
          tag_id: tag_id,
        }));
        await PostTags.bulkCreate(postTagRecords);
      }

      if (updated) {
        const updatedPost = await Posts.findByPk(id, {
          include: [
            { model: User, as: 'author', attributes: ['id', 'name', 'avatar_key'] },
            { model: PostMedia, as: 'media', attributes: ['media_url', 'media_type', 'order_index'] },
            { model: tags, as: 'tags', attributes: ['tag_id', 'tag_name'], through: { attributes: [] } }
          ]
        });
        res.status(200).json({ message: '文章更新成功', post: updatedPost });
      } else {
        res.status(200).json({ message: '文章无需要更新的地方' });
      }
    } catch (error) {
      console.error('Update post error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route DELETE /api/posts/:id
   * @desc Delete a post by ID
   * @access Private (Owner or Admin)
   */
  deletePost: async (req, res) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const post = await Posts.findByPk(id);
      if (!post) {
        return res.status(404).json({ message: '未找到文章' });
      }

      if (post.user_id !== user_id /* && !req.user.isAdmin */) {
        return res.status(403).json({ message: '你不是文章所有者，无法删除文章' });
      }

      const deleted = await Posts.destroy({ where: { post_id: id } });

      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: '找不到文章' });
      }
    } catch (error) {
      console.error('Delete post error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route POST /api/posts/:id/like
   * @desc Like a post
   * @access Private
   */
  likePost: async (req, res) => {
    try {
      const { id: postId } = req.params;
      const user_id = req.user.userId;

      const existingLike = await Likes.findOne({
        where: { user_id, target_id: postId, target_type: 'post' },
      });

      if (existingLike) {
        return res.status(409).json({ message: '不要重复点赞' });
      }

      await Likes.create({ user_id, target_id: postId, target_type: 'post' });

      await Posts.increment('likes_count', { by: 1, where: { post_id: postId }, silent: true });

      res.status(201).json({ message: '用户点赞成功' });
    } catch (error) {
      console.error('Like post error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route DELETE /api/posts/:id/unlike
   * @desc Unlike a post
   * @access Private
   */
  unlikePost: async (req, res) => {
    try {
      const { id: postId } = req.params;
      const user_id = req.user.userId;

      const deleted = await Likes.destroy({
        where: { user_id, target_id: postId, target_type: 'post' },
      });
      await Posts.increment('likes_count', { by: -1, where: { post_id: postId }, silent: true });
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: '此用户取消此文章的点赞' });
      }
    } catch (error) {
      console.error('Unlike post error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
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

      const existingLike = await Likes.findOne({
        where: {
          user_id,
          target_id: postId,
          target_type: 'post'
        }
      });

      const post = await Posts.findByPk(postId);
      if (!post) {
        return res.status(404).json({ message: '文章不存在' });
      }

      const likeCount = post.likes_count || 0;

      res.json({
        liked: !!existingLike,
        likeCount
      });

    } catch (error) {
      console.error('Get like status error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },
  /**
  * @route POST /api/posts/:id/collect
  * @desc 用户收藏一篇文章
  * @access Private
  */
  collectPost: async (req, res) => {
    try {
      const { id: postId } = req.params;
      const userId = req.user.userId;
      // 检查是否已经收藏
      const existingCollection = await collections.findOne({
        where: { user_id: userId, post_id: postId }
      });

      if (existingCollection) {
        return res.status(409).json({ message: '你已经收藏过这篇文章了' });
      }

      // 创建收藏记录
      await collections.create({ user_id: userId, post_id: postId });

      // 更新文章的收藏数 +1
      await Posts.increment('collected_count', {
        by: 1,
        where: { post_id: postId },
        silent: true
      });

      res.status(201).json({ message: '收藏成功' });
    } catch (error) {
      console.error('收藏文章失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  },
  /**
   * @route DELETE /api/posts/:id/uncollect
   * @desc 用户取消收藏一篇文章
   * @access Private
   */
  uncollectPost: async (req, res) => {
    try {
      const { id: postId } = req.params;
      const userId = req.user.userId;

      // 查找收藏记录
      const deleted = await collections.destroy({
        where: { user_id: userId, post_id: postId }
      });

      if (!deleted) {
        return res.status(404).json({ message: '你尚未收藏该文章' });
      }

      // 减少文章的收藏数 -1
      await Posts.increment('collected_count', {
        by: -1,
        where: { post_id: postId },
        silent: true
      });

      res.status(204).send();
    } catch (error) {
      console.error('取消收藏失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
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
  }
};