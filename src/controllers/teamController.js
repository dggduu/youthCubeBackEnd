import { Team } from '../config/Sequelize.js';
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
      const { team_name, description } = req.body;

      if (!team_name) {
        return res.status(400).json({ message: 'Team name is required.' });
      }

      const existingTeam = await Team.findOne({ where: { team_name } });
      if (existingTeam) {
        return res.status(409).json({ message: 'Team with this name already exists.' });
      }

      const newTeam = await Team.create({ team_name, description });
      res.status(201).json({ message: 'Team created successfully.', team: newTeam });
    } catch (error) {
      console.error('Create team error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route GET /api/teams
   * @desc Get all teams with pagination and search
   * @access Public
   */
  getAllTeams: async (req, res) => {
    try {
      const { page, size, search } = req.query;
      const { limit, offset } = getPagination(page, size);

      const whereCondition = search ? { team_name: { [Op.like]: `%${search}%` } } : {};

      const data = await Team.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [['createdAt', 'DESC']], // 更标准的字段名
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
      const team = await Team.findByPk(id);

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