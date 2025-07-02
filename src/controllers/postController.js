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
      const { title, content, cover_image_url, location, media, tagIds } = req.body;
      const user_id = req.user.id;

      if (!title || !content || !user_id) {
        return res.status(400).json({ message: 'Title, content, and user ID are required.' });
      }

      const newPost = await Posts.create({
        user_id,
        title,
        content,
        cover_image_url,
        location,
      });

      if (media && media.length > 0) {
        const mediaRecords = media.map(m => ({
          post_id: newPost.post_id,
          media_url: m.url,
          media_type: m.type,
          order_index: m.order,
        }));
        await PostMedia.bulkCreate(mediaRecords);
      }

      // Handle tags
      if (tagIds && tagIds.length > 0) {
        const postTagRecords = tagIds.map(tag_id => ({
          post_id: newPost.post_id,
          tag_id: tag_id,
        }));
        await PostTags.bulkCreate(postTagRecords);
      }

      const populatedPost = await Posts.findByPk(newPost.post_id, {
        include: [
          { model: User, as: 'author', attributes: ['id', 'name', 'avatar_key'] },
          { model: PostMedia, as: 'media', attributes: ['media_url', 'media_type', 'order_index'] },
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
          { model: PostMedia, as: 'media', attributes: ['media_id', 'media_url', 'media_type', 'order_index'] },
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
      console.log('req.user:', req.user);
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

      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: '此用户取消此文章的点赞' });
      }
    } catch (error) {
      console.error('Unlike post error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  }
};