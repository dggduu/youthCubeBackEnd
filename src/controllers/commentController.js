import { Comments } from '../config/Sequelize.js';
import { Posts } from '../config/Sequelize.js';
import { User } from '../config/Sequelize.js';
import { Likes } from '../config/Sequelize.js';
import { Op } from '../config/Sequelize.js';
import { Sequelize } from 'sequelize';
import { getPagination, getPagingData } from '../utils/pagination.js';
import { getFilter } from "../utils/sensitiveWordFilter.js";
// 导出 commentController 对象
export const commentController = {
  addCommentToPost: async (req, res) => {
    try {
      const { postId } = req.params;
      const { content, parent_comment_id } = req.body;
      const user_id = req.user.userId;
      if (!content) {
        return res.status(400).json({ message: '评论内容不能为空' });
      }
      const filter = getFilter();
      const result = filter.filter(content, { replace: false });
      if (result.words.length > 0) {
        return res.status(422).json({message : "含有敏感词"});
      }


      const post = await Posts.findByPk(postId);
      if (!post) {
        return res.status(404).json({ message: '未找到文章' });
      }

      if (parent_comment_id) {
        const parentComment = await Comments.findByPk(parent_comment_id);
        if (!parentComment) {
          return res.status(404).json({ message: '夫评论未找到' });
        }
      }

      const newComment = await Comments.create({
        post_id: postId,
        user_id,
        content,
        parent_comment_id,
      });

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

  getCommentsForPost: async (req, res) => {
      try {
        const { postId } = req.params;
        const { page, size } = req.query;
        const { limit, offset } = getPagination(page, size);
        console.log(page,size);
        const post = await Posts.findByPk(postId);
        if (!post) {
          return res.status(404).json({ message: 'Post not found.' });
        }

        const data = await Comments.findAndCountAll({
          where: { post_id: postId, parent_comment_id: { [Op.is]: null } },
          attributes: {
            include: [
              [
                Sequelize.literal(`(
                  SELECT COUNT(*)
                  FROM comments AS childComments
                  WHERE childComments.parent_comment_id = comments.comment_id
                )`),
                'SubReplyCount'
              ],
            ],
          },
          include: [{
              model: User,
              as: 'user',
              attributes: ['name']
            }],
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

  deleteComment: async (req, res) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const comment = await Comments.findByPk(id);
      if (!comment) {
        return res.status(404).json({ message: 'Comment not found.' });
      }

      if (comment.user_id !== user_id) {
        return res.status(403).json({ message: 'Forbidden: You can only delete your own comments.' });
      }

      const postId = comment.post_id;

      const deleted = await Comments.destroy({ where: { comment_id: id } });

      if (deleted) {
        await Posts.decrement('comments_count', { by: 1, where: { post_id: postId, comments_count: { [Op.gt]: 0 } } });
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Comment not found.' });
      }
    } catch (error) {
      console.error('Delete comment error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  likeComment: async (req, res) => {
    try {
      const { id: commentId } = req.params;
      const user_id = req.user.userId;

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

  unlikeComment: async (req, res) => {
    try {
      const { id: commentId } = req.params;
      const user_id = req.user.userId;

      const deleted = await Likes.destroy({
        where: { user_id, target_id: commentId, target_type: 'comment' },
      });

      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Comment not liked by this user.' });
      }
    } catch (error) {
      console.error('Unlike comment error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },
};