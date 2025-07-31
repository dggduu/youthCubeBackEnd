import { tags } from '../config/Sequelize.js';
import { Posts, Team, ChatRoom, ChatRoomMember } from '../config/Sequelize.js';
import { Op } from '../config/Sequelize.js';

import { getPagination, getPagingData } from '../utils/pagination.js';
import { getFilter } from "../utils/sensitiveWordFilter.js";
export const tagController = {
  /**
   * @route POST /api/tags
   * @desc Create a new tag
   * @access Private (Admin only)
   */
  createTag: async (req, res) => {
    try {
      const { tag_name } = req.body;

      if (!tag_name) {
        return res.status(400).json({ message: 'Tag name is required.' });
      }

      const existingTag = await tags.findOne({ where: { tag_name } });
      if (existingTag) {
        return res.status(409).json({ message: 'Tag with this name already exists.' });
      }

      const filter = getFilter();
      const result = filter.filter(tag_name, { replace: false });
      if (result.words.length > 0) {
        return res.status(422).json({message : "标签含有敏感词"});
      }

      const newTag = await tags.create({ tag_name });
      res.status(201).json({ message: 'Tag created successfully.', tag: newTag });
    } catch (error) {
      console.error('Create tag error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route GET /api/tags
   * @desc Get all tags
   * @access Public
   */
  getAllTags: async (req, res) => {
    try {
      const { page, size } = req.query;
      const { limit, offset } = getPagination(page, size);

      const data = await tags.findAndCountAll({
        attributes: ['tag_id', 'tag_name', 'created_at'],
        order: [['tag_name', 'ASC']],
        limit,
        offset
      });

      const response = getPagingData(data, page, limit);
      res.status(200).json(response);
    } catch (error) {
      console.error('Get all tags error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route GET /api/tags/:id
   * @desc Get a tag by ID
   * @access Public
   */
  getTagById: async (req, res) => {
    try {
      const { id: tagId } = req.params;

      const tag = await tags.findByPk(tagId, {
        attributes: ['tag_id', 'tag_name', 'created_at']
      });

      if (!tag) {
        return res.status(404).json({ message: 'Tag not found.' });
      }

      res.status(200).json(tag);
    } catch (error) {
      console.error('Get tag by ID error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route GET /api/tags/:id/posts
   * @desc Get all posts associated with a specific tag
   * @access Public
   */
  getPostsByTag: async (req, res) => {
    try {
      const { id: tagId } = req.params;
      const { page, size } = req.query;
      const { limit, offset } = getPagination(page, size);

      const tag = await tags.findByPk(tagId);
      if (!tag) {
        return res.status(404).json({ message: 'Tag not found.' });
      }

      const data = await Posts.findAndCountAll({
        include: [
          {
            model: tags,
            as: 'tags',
            where: { tag_id: tagId },
            attributes: [],
            through: { attributes: [] },
            required: true
          }
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
        distinct: true,
        col: 'post_id'
      });

      const response = getPagingData(data, page, limit);
      res.status(200).json(response);
    } catch (error) {
      console.error('Get posts by tag error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },
  getTeamsByTagId : async (req, res) => {
    try {
      const { page, size } = req.query;
      const { tagId } = req.params;
      const { limit, offset } = getPagination(page, size);

      const whereCondition = {
        is_public: true
      };

      const data = await Team.findAndCountAll({
        attributes: { exclude: ['description'] },
        where: whereCondition,
        limit,
        offset,
        order: [['create_at', 'DESC']],
        include: [
          {
            model: tags,
            as: 'tags',
            attributes: ['tag_id', 'tag_name'],
            through: { attributes: [] },
            where: { tag_id: tagId },
            required: true
          },
          {
            model: ChatRoom,
            as: 'chatRoom',
            attributes: ['room_id', 'name'],
            include: [{
              model: ChatRoomMember,
              as: 'members',
              attributes: ['user_id'],
              required: false
            }]
          }
        ]
      });

      const teams = data.rows.map(team => {
      const memberCount = team.chatRoom?.members?.length || 0;
        
      return {
          team_id: team.team_id,
          team_name: team.team_name,
          create_at: team.create_at,
          grade: team.grade,
          is_public: team.is_public,
          tags: team.tags,
          member_count: memberCount
        };
      });

      const response = getPagingData({
        count: data.count,
        rows: teams
      }, page, limit);

      res.status(200).json(response);
    } catch (error) {
      console.error('Get teams by tag error:', error);
      res.status(500).json({ 
        message: 'Server error while fetching teams by tag.', 
        error: error.message 
      });
    }
  }
};