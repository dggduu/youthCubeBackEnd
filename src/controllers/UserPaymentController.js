import { UserPayment, User, PaymentProduct } from "../config/Sequelize.js";
import { getPagination, getPagingData } from "../utils/pagination.js";
import { Op } from 'sequelize';
export const userPaymentController = {

  getAllUserPayments: async (req, res) => {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }

    try {
      const { page = 0, size = 10, order_by = 'created_at', direction = 'DESC', orderNo, userId, status } = req.query;
      const { limit, offset } = getPagination(page, size);

      const whereCondition = {};
      if (orderNo) {
        whereCondition.order_no = {
          [Op.like]: `%${orderNo}%`,
        };
      }
      if (userId) {
        whereCondition.user_id = userId;
      }
      if (status) {
        whereCondition.status = status;
      }

      const payments = await UserPayment.findAndCountAll({
        where: whereCondition,
        include: [
          { model: PaymentProduct, as: 'product', attributes: ['product_name', 'price'] },
        ],
        limit,
        offset,
        order: [[order_by, direction.toUpperCase()]],
      });

      const result = getPagingData(payments, page, limit);
      return res.json(result);
    } catch (error) {
      console.error('Error fetching all user payments:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  createUserPayment: async (req, res) => {
    try {
      const { user_id, product_id, amount, order_no, currency, team_id, post_id } = req.body;

      const newPayment = await UserPayment.create({
        user_id,
        product_id,
        amount,
        order_no,
        currency,
        team_id,
        post_id,
      });

      return res.status(201).json(newPayment);
    } catch (error) {
      console.error('Error creating user payment:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  getMyPayments: async (req, res) => {
    try {
      const currentUserId = req.user.userId;
      const { page = 0, size = 10 } = req.query;
      const { limit, offset } = getPagination(page, size);

      const payments = await UserPayment.findAndCountAll({
        where: { user_id: currentUserId },
        include: [
          { model: PaymentProduct, as: 'product', attributes: ['product_name', 'price'] },
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      const result = getPagingData(payments, page, limit);
      return res.json(result);
    } catch (error) {
      console.error('Error fetching user payments:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  getUserPaymentById: async (req, res) => {
    try {
      const { id } = req.params;
      const payment = await UserPayment.findByPk(id, {
        include: [
          { model: User, as: 'user', attributes: ['id', 'name'] },
          { model: PaymentProduct, as: 'product', attributes: ['product_name'] },
        ],
      });

      if (!payment) {
        return res.status(404).json({ message: 'Payment record not found.' });
      }

      return res.json(payment);
    } catch (error) {
      console.error('Error fetching user payment by ID:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  updateUserPaymentStatus: async (req, res) => {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }

    try {
      const { id } = req.params;
      const { status, third_party_order_no, paid_at } = req.body;
      
      const payment = await UserPayment.findByPk(id);

      if (!payment) {
        return res.status(404).json({ message: 'Payment record not found.' });
      }

      const updated = await payment.update({
        status,
        third_party_order_no,
        paid_at
      });

      return res.json(updated);
    } catch (error) {
      console.error('Error updating payment status:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  deleteUserPayment: async (req, res) => {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }

    try {
      const { id } = req.params;

      const payment = await UserPayment.findByPk(id);

      if (!payment) {
        return res.status(404).json({ message: 'Payment record not found.' });
      }

      if (payment.status === 'paid') {
        return res.status(400).json({ message: 'Cannot delete a paid payment record.' });
      }

      await payment.destroy();

      return res.status(200).json({ 
        message: 'Payment record deleted successfully.',
        id: id 
      });
    } catch (error) {
      console.error('Error deleting payment record:', error);
      
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ 
          message: 'Cannot delete this payment because it is referenced by other data.' 
        });
      }

      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  getAllPaymentsNoPaging: async (req, res) => {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }

    try {
      const { status } = req.query;
      const whereCondition = {};
      if (status) {
        whereCondition.status = status;
      }

      const payments = await UserPayment.findAll({
        where: whereCondition,
        order: [['created_at', 'ASC']],
      });

      return res.json(payments);
    } catch (error) {
      console.error('Error fetching all payments without pagination:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },
};