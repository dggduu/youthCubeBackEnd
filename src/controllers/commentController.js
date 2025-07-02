import { Comments } from '../config/Sequelize.js';
import { Posts } from '../config/Sequelize.js';
import { User } from '../config/Sequelize.js';
import { Likes } from '../config/Sequelize.js';
import { Op } from '../config/Sequelize.js';

import { getPagination, getPagingData } from '../utils/pagination.js';

// 导出 commentController 对象
export const commentController = {
  /**
   * @route POST /api/posts/:postId/comments
   * @desc Add a comment to a post
   * @access Private
   */
  addCommentToPost: async (req, res) => {
    try {
      const { postId } = req.params;
      const { content, parent_comment_id } = req.body;
      const user_id = req.user.id; // Authenticated user ID

      if (!content) {
        return res.status(400).json({ message: 'Comment content cannot be empty.' });
      }

      const post = await Posts.findByPk(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found.' });
      }

      if (parent_comment_id) {
        const parentComment = await Comments.findByPk(parent_comment_id);
        if (!parentComment) {
          return res.status(404).json({ message: 'Parent comment not found.' });
        }
      }

      const newComment = await Comments.create({
        post_id: postId,
        user_id,
        content,
        parent_comment_id,
      });

      // Increment comments_count on the post
      await Posts.increment('comments_count', { by: 1, where: { post_id: postId } });

      const populatedComment = await Comments.findByPk(newComment.comment_id, {
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar_key'] }]
      });

      res.status(201).json({ message: 'Comment added successfully.', comment: populatedComment });
    } catch (error) {
      console.error('Add comment to post error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route GET /api/posts/:postId/comments
   * @desc Get comments for a specific post
   * @access Public
   */
  getCommentsForPost: async (req, res) => {
    try {
      const { postId } = req.params;
      const { page, size } = req.query;
      const { limit, offset } = getPagination(page, size);

      const post = await Posts.findByPk(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found.' });
      }

      const data = await Comments.findAndCountAll({
        where: { post_id: postId, parent_comment_id: { [Op.is]: null } }, // Fetch top-level comments
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'avatar_key'] },
          {
            model: Comments,
            as: 'replies',
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar_key'] }],
            order: [['created_at', 'ASC']],
            limit: 3 // Example: fetch initial replies
          }
        ],
        limit,
        offset,
        order: [['created_at', 'ASC']],
      });

      const response = getPagingData(data, page, limit);
      res.status(200).json(response);
    } catch (error) {
      console.error('Get comments for post error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route GET /api/comments/:commentId/replies
   * @desc Get replies for a specific comment
   * @access Public
   */
  getRepliesForComment: async (req, res) => {
    try {
      const { commentId } = req.params;
      const { page, size } = req.query;
      const { limit, offset } = getPagination(page, size);

      const parentComment = await Comments.findByPk(commentId);
      if (!parentComment) {
        return res.status(404).json({ message: 'Parent comment not found.' });
      }

      const data = await Comments.findAndCountAll({
        where: { parent_comment_id: commentId },
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar_key'] }],
        limit,
        offset,
        order: [['created_at', 'ASC']],
      });

      const response = getPagingData(data, page, limit);
      res.status(200).json(response);
    } catch (error) {
      console.error('Get replies for comment error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route PUT /api/comments/:id
   * @desc Update a comment
   * @access Private (Owner)
   */
  updateComment: async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const user_id = req.user.id;

      const comment = await Comments.findByPk(id);
      if (!comment) {
        return res.status(404).json({ message: 'Comment not found.' });
      }

      if (comment.user_id !== user_id) {
        return res.status(403).json({ message: 'Forbidden: You can only update your own comments.' });
      }

      const [updated] = await Comments.update({ content }, { where: { comment_id: id } });

      if (updated) {
        const updatedComment = await Comments.findByPk(id, {
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar_key'] }]
        });
        res.status(200).json({ message: 'Comment updated successfully.', comment: updatedComment });
      } else {
        res.status(200).json({ message: 'No changes made to the comment.' });
      }
    } catch (error) {
      console.error('Update comment error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route DELETE /api/comments/:id
   * @desc Delete a comment
   * @access Private (Owner or Admin)
   */
  deleteComment: async (req, res) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const comment = await Comments.findByPk(id);
      if (!comment) {
        return res.status(404).json({ message: 'Comment not found.' });
      }

      if (comment.user_id !== user_id /* && !req.user.isAdmin */) {
        return res.status(403).json({ message: 'Forbidden: You can only delete your own comments.' });
      }

      const postId = comment.post_id; // Get post_id before deleting

      const deleted = await Comments.destroy({ where: { comment_id: id } });

      if (deleted) {
        // Decrement comments_count on the post
        await Posts.decrement('comments_count', { by: 1, where: { post_id: postId, comments_count: { [Op.gt]: 0 } } });
        res.status(204).send(); // No content
      } else {
        res.status(404).json({ message: 'Comment not found.' });
      }
    } catch (error) {
      console.error('Delete comment error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route POST /api/comments/:id/like
   * @desc Like a comment
   * @access Private
   */
  likeComment: async (req, res) => {
    try {
      const { id: commentId } = req.params;
      const user_id = req.user.id;

      const existingLike = await Likes.findOne({
        where: { user_id, target_id: commentId, target_type: 'comment' },
      });

      if (existingLike) {
        return res.status(409).json({ message: 'Comment already liked by this user.' });
      }

      await Likes.create({ user_id, target_id: commentId, target_type: 'comment' });

      res.status(201).json({ message: 'Comment liked successfully.' });
    } catch (error) {
      console.error('Like comment error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route DELETE /api/comments/:id/unlike
   * @desc Unlike a comment
   * @access Private
   */
  unlikeComment: async (req, res) => {
    try {
      const { id: commentId } = req.params;
      const user_id = req.user.id;

      const deleted = await Likes.destroy({
        where: { user_id, target_id: commentId, target_type: 'comment' },
      });

      if (deleted) {
        res.status(204).send(); // No content
      } else {
        res.status(404).json({ message: 'Comment not liked by this user.' });
      }
    } catch (error) {
      console.error('Unlike comment error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },
};