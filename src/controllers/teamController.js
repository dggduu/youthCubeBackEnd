import { Team, TeamTag, tags } from '../config/Sequelize.js';
import { Op } from '../config/Sequelize.js';


import { getPagination, getPagingData } from '../utils/pagination.js';

export const teamController = {
  /**
   * @route POST /api/teams
   * @desc Create a new team
   * @access Private (Admin or specific role)
   */
  createTeam: async (req, res) => {
    try {
      const { team_name, description, tagIds } = req.body;

      if (!team_name) {
        return res.status(400).json({ message: '需要队伍名称' });
      }

      // 检查队名是否已存在
      const existingTeam = await Team.findOne({ where: { team_name } });
      if (existingTeam) {
        return res.status(409).json({ message: '存在相同的队名' });
      }

      // 创建队伍
      const newTeam = await Team.create({
        team_name,
        description,
      });

      // 如果有 tags，写入中间表 team_tags
      if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        const teamTagRecords = tagIds.map(tag_id => ({
          team_id: newTeam.team_id,
          tag_id,
          created_at: new Date(),
          updated_at: new Date()
        }));
        await TeamTag.bulkCreate(teamTagRecords);
      }

      // 查询完整数据（包含 tags）
      const populatedTeam = await Team.findByPk(newTeam.team_id, {
        include: [
          {
            model: tags,
            as: 'tags',
            attributes: ['tag_id', 'tag_name'],
            through: { attributes: [] }
          }
        ]
      });

      res.status(201).json({ message: '队伍成功创建', team: populatedTeam });
    } catch (error) {
      console.error('创建队伍时遇到问题:', error);
      res.status(500).json({ message: '内部错误：', error: error.message });
    }
  },

  /**
   * @route GET /api/teams
   * @desc Get all teams with pagination and search
   * @access Public
   */
  getAllTeams : async (req, res) => {
    try {
      const { page, size, search } = req.query;
      const { limit, offset } = getPagination(page, size);

      const whereCondition = search ? { team_name: { [Op.like]: `%${search}%` } } : {};

      const data = await Team.findAndCountAll({
        attributes: { exclude: ['description'] },
        where: whereCondition,
        limit,
        offset,
        order: [['create_at', 'DESC']],
        include: [{
          model: tags,
          as: 'tags',
          attributes: ['tag_id', 'tag_name'],
          through: { attributes: [] },
          required: false
        }]
      });

      const teams = data.rows;
      teams.forEach(team => {
        if (team.tags && team.tags.length > 3) {
          team.tags = team.tags.slice(0, 3);
        }
      });

      const response = getPagingData(data, page, limit);
      res.status(200).json(response);
    } catch (error) {
      console.error('Get all teams error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route GET /api/teams/:id
   * @desc Get a team by ID
   * @access Public
   */
  getTeamById: async (req, res) => {
    try {
      const { id } = req.params;

      const team = await Team.findByPk(id, {
        attributes: { exclude: ['description'] },
        include: [{
          model: tags,
          as: 'tags',
          attributes: ['tag_id', 'tag_name'],
          through: { attributes: [] }
        }]
      });

      if (!team) {
        return res.status(404).json({ message: 'Team not found.' });
      }

      res.status(200).json(team);
    } catch (error) {
      console.error('Get team by ID error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route PUT /api/teams/:id
   * @desc Update a team by ID
   * @access Private (Admin or team owner/manager)
   */
  updateTeam: async (req, res) => {
    try {
      const { id } = req.params;
      const { team_name, description } = req.body;

      if (!team_name) {
        return res.status(400).json({ message: 'Team name is required.' });
      }

      const [updated] = await Team.update(
        { team_name, description },
        { where: { team_id: id } }
      );

      if (updated) {
        const updatedTeam = await Team.findByPk(id);
        return res.status(200).json({ message: 'Team updated successfully.', team: updatedTeam });
      }

      res.status(404).json({ message: 'Team not found or no changes made.' });
    } catch (error) {
      console.error('Update team error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route DELETE /api/teams/:id
   * @desc Delete a team by ID
   * @access Private (Admin or team owner/manager)
   */
  deleteTeam: async (req, res) => {
    try {
      const { id } = req.params;

      const deleted = await Team.destroy({ where: { team_id: id } });

      if (deleted) {
        return res.status(204).send(); // No content
      }

      res.status(404).json({ message: 'Team not found.' });
    } catch (error) {
      console.error('Delete team error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  }
};