import { where } from 'sequelize';
import { ThoughtBullet, User } from '../config/Sequelize.js';
import logger from "../config/pino.js";
import { getPagination, getPagingData } from '../utils/pagination.js';

export const thoughtBulletController = {
  createThoughtBullet: async (req, res) => {
    try {
      const { message } = req.body;
      const user_id = req.user.userId;

      if (!message || !user_id) {
        return res.status(400).json({ message: 'Message and user ID are required.' });
      }

      const newThoughtBullet = await ThoughtBullet.create({
        user_id,
        message,
      });

      res.status(201).json({ message: 'Thought bullet created successfully.', thoughtBullet: newThoughtBullet });
    } catch (error) {
      console.error('Create thought bullet error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  getThoughtBullets: async (req, res) => {
    try {
      const { page, size } = req.query;
      const { limit, offset } = getPagination(page, size);

      const data = await ThoughtBullet.findAndCountAll({
        order: [['created_at', 'DESC']],
        limit,
        offset,
        include: [
          { model: User, as: 'author', attributes: ['id', 'name'] },
        ]
      });

      const response = getPagingData(data, page, limit);

      res.status(200).json(response);
    } catch (error) {
      console.error('Retrieve thought bullets error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  getMyThoughtBullets: async (req, res) => {
    try {
      const { page, size } = req.query;
      const { limit, offset } = getPagination(page, size);
      const user_id = req.user.userId;
      const data = await ThoughtBullet.findAndCountAll({
        order: [['created_at', 'DESC']],
        limit,
        offset,
        include: [
          { model: User, as: 'author', attributes: ['id', 'name'] },
        ],
        where: {
            user_id: user_id,
        },
      });

      const response = getPagingData(data, page, limit);

      res.status(200).json(response);
    } catch (error) {
      console.error('Retrieve thought bullets error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  updateThoughtBullet: async (req, res) => {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const user_id = req.user.userId;

      const thoughtBullet = await ThoughtBullet.findByPk(id);

      if (!thoughtBullet) {
        return res.status(404).json({ message: 'Thought bullet not found.' });
      }

      if (thoughtBullet.user_id !== user_id) {
        return res.status(403).json({ message: 'Forbidden. You can only edit your own thought bullets.' });
      }

      await thoughtBullet.update({ message });

      res.status(200).json({ message: 'Thought bullet updated successfully.', thoughtBullet });
    } catch (error) {
      console.error('Update thought bullet error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  deleteThoughtBullet: async (req, res) => {
    try {
      const { id } = req.params;
      const user_id = req.user.userId;

      const thoughtBullet = await ThoughtBullet.findByPk(id);

      if (!thoughtBullet) {
        return res.status(404).json({ message: 'Thought bullet not found.' });
      }

      if (thoughtBullet.user_id !== user_id) {
        return res.status(403).json({ message: 'Forbidden. You can only delete your own thought bullets.' });
      }

      await thoughtBullet.destroy();

      res.status(200).json({ message: 'Thought bullet deleted successfully.' });
    } catch (error) {
      console.error('Delete thought bullet error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },
};