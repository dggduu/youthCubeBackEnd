import { TrafficBoostRecord, UserPayment, Posts } from "../config/Sequelize.js";
import { getPagination, getPagingData } from "../utils/pagination.js";

export const trafficBoostRecordController = {
  /**
   * @route GET /api/traffic-boost-records/all
   * @desc Get all traffic boost records (Admin only)
   * @access Private/Admin
   */
  getAllTrafficBoostRecords: async (req, res) => {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }

    try {
      const { page = 0, size = 10, order_by = 'triggered_at', direction = 'DESC' } = req.query;
      const { limit, offset } = getPagination(page, size);

      const records = await TrafficBoostRecord.findAndCountAll({
        include: [
          { model: UserPayment, as: 'payment', attributes: ['user_id', 'order_no'] },
          { model: Posts, as: 'post' }
        ],
        limit,
        offset,
        order: [[order_by, direction.toUpperCase()]],
      });

      const result = getPagingData(records, page, limit);
      return res.json(result);
    } catch (error) {
      console.error('Error fetching all traffic boost records:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },
  /**
   * @route POST /api/traffic-boost-records
   * @desc Create a new traffic boost record
   * @access Private
   */
  createTrafficBoostRecord: async (req, res) => {
    try {
      const { payment_id, post_id, views_consumed, cost_amount, metadata } = req.body;

      const newRecord = await TrafficBoostRecord.create({
        payment_id,
        post_id,
        views_consumed,
        cost_amount,
        metadata
      });

      return res.status(201).json(newRecord);
    } catch (error) {
      console.error('Error creating traffic boost record:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * @route GET /api/traffic-boost-records/posts/:postId
   * @desc Get all traffic boost records for a specific post
   * @access Private
   */
  getTrafficBoostRecordsForPost: async (req, res) => {
    try {
      const { postId } = req.params;
      const { page = 0, size = 10 } = req.query;
      const { limit, offset } = getPagination(page, size);

      const records = await TrafficBoostRecord.findAndCountAll({
        where: { post_id: postId },
        include: [
          { model: UserPayment, as: 'payment', attributes: ['user_id', 'order_no'] },
        ],
        limit,
        offset,
        order: [['triggered_at', 'DESC']],
      });

      const result = getPagingData(records, page, limit);
      return res.json(result);
    } catch (error) {
      console.error('Error fetching traffic boost records:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * @route GET /api/traffic-boost-records/:id
   * @desc Get a single traffic boost record by ID
   * @access Private
   */
  getTrafficBoostRecordById: async (req, res) => {
    try {
      const { id } = req.params;
      const record = await TrafficBoostRecord.findByPk(id, {
        include: [
          { model: UserPayment, as: 'payment' },
          { model: Posts, as: 'post' }
        ],
      });

      if (!record) {
        return res.status(404).json({ message: 'Traffic boost record not found.' });
      }

      return res.json(record);
    } catch (error) {
      console.error('Error fetching traffic boost record by ID:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * @route DELETE /api/traffic-boost-records/:id
   * @desc Delete a traffic boost record
   * @access Private
   */
 deleteTrafficBoostRecord: async (req, res) => {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }

    try {
      const { id } = req.params;
      const deleted = await TrafficBoostRecord.destroy({
        where: { record_id: id },
      });

      if (deleted === 1) {
        return res.status(204).send();
      }

      return res.status(404).json({ message: 'Traffic boost record not found.' });
    } catch (error) {
      console.error('Error deleting traffic boost record:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },
};