import { User } from '../config/Sequelize.js';
import { Posts } from '../config/Sequelize.js';
import { UserFollows } from '../config/Sequelize.js';
import { Team } from '../config/Sequelize.js';
import { Op } from '../config/Sequelize.js';
import { getPagination, getPagingData } from '../utils/pagination.js';
import { getFilter } from "../utils/sensitiveWordFilter.js";

const isAdmin = (req) => {
  console.log("test:",req.user);
  return req.user && req.user.is_admin === true;
};

export const userController = {
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

  getAllUsersNoPaging: async (req, res) => {
    try {
      const { id, name, page, size } = req.query;
      const limit = parseInt(size, 10) || 10;
      const offset = (parseInt(page, 10) || 0) * limit;

      const whereCondition = {};
      if (id) {
        whereCondition.id = id;
      }
      if (name) {
        whereCondition.name = { [Op.like]: `%${name}%` };
      }

      const data = await User.findAndCountAll({
        where: whereCondition,
        attributes: { exclude: ['password'] },
        order: [['created_at', 'DESC']],
        limit,
        offset,
      });

      return res.status(200).json({
        rows: data.rows,
        total: data.count,
      });
    } catch (error) {
      console.error('Get all users error:', error);
      return res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  getUserById: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: Posts,
            as: 'posts',
            attributes: ['post_id', 'title', 'cover_image_url'],
            separate: true,
            order: [['created_at', 'DESC']],
          },
        ],
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const followerCount = await UserFollows.count({ where: { following_id: id } });
      const followingCount = await UserFollows.count({ where: { follower_id: id } });

      const userData = user.toJSON();
      userData.followerCount = followerCount;
      userData.followingCount = followingCount;

      if (user.team_id) {
        const team = await Team.findOne({
          where: {
            team_id: user.team_id,
            is_public: 1,
          },
          attributes: ['team_id', 'team_name', 'description'],
          raw: true,
        });
        if (team) {
          userData.team = team;
        } else {
          userData.team_id = null;
        }
      }

      return res.status(200).json(userData);
    } catch (error) {
      console.error('Get user by ID error:', error);
      return res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

    updateUser: async (req, res) => {
      try {
        const { id } = req.params;
        const currentUserId = req.user.userId;
        const isCurrentUserAdmin = isAdmin(req);

        // 权限检查：只有自己或是管理员才能编辑
        if (currentUserId !== parseInt(id) && !isCurrentUserAdmin) {
          return res.status(403).json({ message: '只有自己或是管理员才能编辑' });
        }

        const { name, birth_date, learn_stage, email, sex, avatar_key, is_member, password, bio, is_admin } = req.body;

        const filter = getFilter();
        
        const nameToFilter = name || '';
        const bioToFilter = bio || '';

        const nameResult = filter.filter(nameToFilter, { replace: false });
        if (nameResult.words.length > 0) {
          return res.status(422).json({ message: '名称含有敏感词' });
        }

        const bioResult = filter.filter(bioToFilter, { replace: false });
        if (bioResult.words.length > 0) {
          return res.status(422).json({ message: '简介含有敏感词' });
        }

        const updateData = {
            name, birth_date, learn_stage, email, sex, avatar_key, is_member, password, bio
        };

        if (is_admin !== undefined) {
          if (isCurrentUserAdmin) {
            updateData.is_admin = is_admin;
          } else {
            console.warn(`非管理员用户 ${currentUserId} 试图修改 is_admin 字段，操作被忽略。`);
          }
        }
        
        const [updated] = await User.update(
          updateData,
          {
            where: { id },
            individualHooks: true,
          }
        );

        if (updated) {
          const updatedUser = await User.findByPk(id, {
            attributes: { exclude: ['password'] },
            include: [{ model: Team, as: 'team', attributes: ['team_id', 'team_name'] }]
          });
          return res.status(200).json({ message: 'User updated successfully.', user: updatedUser });
        }

        return res.status(404).json({ message: 'User not found or no changes made.' });
      } catch (error) {
        console.error('Update user error:', error);
        return res.status(500).json({ message: 'Server error.', error: error.message });
      }
    },

  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;
      
      if (currentUserId !== parseInt(id) && !isAdmin(req)) {
        return res.status(403).json({ message: 'Forbidden: You can only delete your own profile or be an admin.' });
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