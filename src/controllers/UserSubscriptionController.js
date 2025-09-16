import { UserSubscription, PaymentProduct, UserPayment } from "../config/Sequelize.js";
import { getPagination, getPagingData } from "../utils/pagination.js";

export const userSubscriptionController = {
  /**
   * @route GET /api/subscriptions/all
   * @desc Get all user subscriptions (Admin only)
   * @access Private/Admin
   */
  getAllUserSubscriptions: async (req, res) => {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }

    try {
      const { page = 0, size = 10, order_by = 'start_at', direction = 'DESC' } = req.query;
      const { limit, offset } = getPagination(page, size);

      const subscriptions = await UserSubscription.findAndCountAll({
        include: [
          { model: PaymentProduct, as: 'product', attributes: ['product_name', 'product_type'] },
          { model: UserPayment, as: 'payment', attributes: ['order_no'] },
        ],
        limit,
        offset,
        order: [[order_by, direction.toUpperCase()]],
      });

      const result = getPagingData(subscriptions, page, limit);
      return res.json(result);
    } catch (error) {
      console.error('Error fetching all user subscriptions:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },
  /**
   * @route POST /api/subscriptions
   * @desc Create a new user subscription
   * @access Private
   */
  createUserSubscription: async (req, res) => {
    try {
      const { user_id, product_id, payment_id, start_at, end_at, auto_renew, team_id, current_value } = req.body;

      const newSubscription = await UserSubscription.create({
        user_id,
        product_id,
        payment_id,
        status: 'active',
        start_at,
        end_at,
        auto_renew,
        team_id,
        current_value
      });

      return res.status(201).json(newSubscription);
    } catch (error) {
      console.error('Error creating user subscription:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * @route GET /api/subscriptions/me
   * @desc Get current user's subscription history
   * @access Private
   */
  getMySubscriptions: async (req, res) => {
    try {
      const currentUserId = req.user.userId;
      const { page = 0, size = 10, status } = req.query;
      const { limit, offset } = getPagination(page, size);

      const where = { user_id: currentUserId };
      if (status) {
        where.status = status;
      }

      const subscriptions = await UserSubscription.findAndCountAll({
        where,
        include: [
          { model: PaymentProduct, as: 'product', attributes: ['product_name', 'product_type'] },
          { model: UserPayment, as: 'payment', attributes: ['order_no'] },
        ],
        limit,
        offset,
        order: [['start_at', 'DESC']],
      });

      const result = getPagingData(subscriptions, page, limit);
      return res.json(result);
    } catch (error) {
      console.error('Error fetching user subscriptions:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * @route GET /api/subscriptions/:id
   * @desc Get a single user subscription by ID
   * @access Private
   */
  getUserSubscriptionById: async (req, res) => {
    try {
      const { id } = req.params;
      const subscription = await UserSubscription.findByPk(id, {
        include: [
          { model: PaymentProduct, as: 'product' },
          { model: UserPayment, as: 'payment' },
        ],
      });

      if (!subscription) {
        return res.status(404).json({ message: 'Subscription not found.' });
      }

      return res.json(subscription);
    } catch (error) {
      console.error('Error fetching user subscription by ID:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * @route PUT /api/subscriptions/:id/cancel
   * @desc Cancel an active user subscription
   * @access Private
   */
  cancelUserSubscription: async (req, res) => {
    try {
      const { id } = req.params;
      const subscription = await UserSubscription.findByPk(id);

      if (!subscription) {
        return res.status(404).json({ message: 'Subscription not found.' });
      }

      if (subscription.status !== 'active') {
        return res.status(400).json({ message: 'Subscription is not active and cannot be cancelled.' });
      }

      const updated = await subscription.update({
        status: 'cancelled',
        end_at: new Date()
      });

      return res.json(updated);
    } catch (error) {
      console.error('Error cancelling user subscription:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },
  /**
   * @route GET /api/subscriptions/all/nopaging
   * @desc Get all user subscriptions without pagination (Admin only)
   * @access Private/Admin
   */
  getAllSubscriptionsNoPaging: async (req, res) => {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }

    try {
      const { status } = req.query;
      const whereCondition = {};
      if (status) {
        whereCondition.status = status;
      }

      const subscriptions = await UserSubscription.findAll({
        where: whereCondition,
        order: [['created_at', 'ASC']],
      });

      return res.json(subscriptions);
    } catch (error) {
      console.error('Error fetching all subscriptions without pagination:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },
};