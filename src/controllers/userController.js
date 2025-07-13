import { User } from '../config/Sequelize.js';
import { Posts } from '../config/Sequelize.js';
import { UserFollows } from '../config/Sequelize.js';
import { Team } from '../config/Sequelize.js';
import { Op } from '../config/Sequelize.js';
import { getPagination, getPagingData } from '../utils/pagination.js';

export const userController = {
  /**
   * @route GET /api/users
   * @desc Get all users with pagination and optional name search
   * @access Public (or Private if needed)
   */
  getAllUsers: async (req, res) => {
    try {
      const { page = 0, size = 10, name } = req.query;
      const { limit, offset } = getPagination(page, size);

      const whereCondition = name ? { name: { [Op.like]: `%${name}%` } } : {};

      const data = await User.findAndCountAll({
        where: whereCondition,
        attributes: { exclude: ['password', 'created_at', 'updated_at'] },
        order: [['created_at', 'DESC']],
        limit,
        offset,
      });

      const response = getPagingData(data, page, limit);
      return res.status(200).json(response);
    } catch (error) {
      console.error('Get all users error:', error);
      return res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route GET /api/users/:id
   * @desc Get a user by ID with posts and optionally team info if team_id is not null
   * @access Public
   */
  getUserById: async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, {
        attributes: { exclude: ['password', 'created_at', 'updated_at'] },
        include: [
          {
            model: Posts,
            as: 'posts',
            attributes: ['post_id', 'title', 'cover_image_url', 'likes_count', 'comments_count', 'collected_count'],
          },
          {
            model: Team,
            as: 'team',
            attributes: ['team_id', 'team_name', 'description'],
          },
        ],
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      return res.status(200).json(user);
    } catch (error) {
      console.error('Get user by ID error:', error);
      return res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route PUT /api/users/:id
   * @desc Update a user by ID
   * @access Private (Owner or Admin)
   */
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user.userId;
      // console.log("test:",id,currentUserId,req.user);
      
      if (currentUserId !== parseInt(id)) {
        return res.status(403).json({ message: 'Forbidden: You can only update your own profile.' });
      }

      const { name, birth_date, learn_stage, email, sex, avatar_key, is_member, password, team_id, bio } = req.body;

      const [updated] = await User.update(
        { name, birth_date, learn_stage, email, sex, avatar_key, is_member, password, team_id, bio },
        {
          where: { id },
          individualHooks: true,
        }
      );

      if (updated) {
        const updatedUser = await User.findByPk(id, {
          attributes: { exclude: ['password'] },
          include: [
            {
              model: Team,
              as: 'team',
              attributes: ['team_id', 'team_name']
            }
          ]
        });
        return res.status(200).json({ message: 'User updated successfully.', user: updatedUser });
      }

      return res.status(404).json({ message: 'User not found or no changes made.' });
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route DELETE /api/users/:id
   * @desc Delete a user by ID
   * @access Private (Owner or Admin)
   */
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;

      if (currentUserId !== parseInt(id)) {
        return res.status(403).json({ message: 'Forbidden: You can only delete your own profile.' });
      }

      const deleted = await User.destroy({ where: { id } });

      if (deleted) {
        return res.status(204).send();
      }

      return res.status(404).json({ message: 'User not found.' });
    } catch (error) {
      console.error('Delete user error:', error);
      return res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route POST /api/users/:id/follow
   * @desc Follow a user
   * @access Private
   */
  followUser: async (req, res) => {
    try {
      const followingId = parseInt(req.params.id);
      const followerId = req.user.id;

      if (followingId === followerId) {
        return res.status(400).json({ message: 'You cannot follow yourself.' });
      }

      const existingFollow = await UserFollows.findOne({
        where: { follower_id: followerId, following_id: followingId },
      });

      if (existingFollow) {
        return res.status(409).json({ message: 'Already following this user.' });
      }

      await UserFollows.create({ follower_id: followerId, following_id: followingId });

      return res.status(201).json({ message: 'Successfully followed user.' });
    } catch (error) {
      console.error('Follow user error:', error);
      return res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route DELETE /api/users/:id/unfollow
   * @desc Unfollow a user
   * @access Private
   */
  unfollowUser: async (req, res) => {
    try {
      const followingId = parseInt(req.params.id);
      const followerId = req.user.id;

      const deleted = await UserFollows.destroy({
        where: { follower_id: followerId, following_id: followingId },
      });

      if (deleted) {
        return res.status(204).send();
      }

      return res.status(404).json({ message: 'Not following this user.' });
    } catch (error) {
      console.error('Unfollow user error:', error);
      return res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route GET /api/users/:id/followers
   * @desc Get followers of a user
   * @access Public
   */
  getUserFollowers: async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 0, size = 10 } = req.query;
      const { limit, offset } = getPagination(page, size);

      const data = await UserFollows.findAndCountAll({
        where: { following_id: id },
        include: [{
          model: User,
          as: 'follower',
          attributes: ['id', 'name', 'avatar_key'],
        }],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      const response = getPagingData(data, page, limit);
      return res.status(200).json(response);
    } catch (error) {
      console.error('Get user followers error:', error);
      return res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route GET /api/users/:id/following
   * @desc Get users that the user is following
   * @access Public
   */
  getUserFollowing: async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 0, size = 10 } = req.query;
      const { limit, offset } = getPagination(page, size);

      const data = await UserFollows.findAndCountAll({
        where: { follower_id: id },
        include: [{
          model: User,
          as: 'following',
          attributes: ['id', 'name', 'avatar_key'],
        }],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      const response = getPagingData(data, page, limit);
      return res.status(200).json(response);
    } catch (error) {
      console.error('Get user following error:', error);
      return res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },
};