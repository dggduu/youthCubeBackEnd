import { PaymentProduct } from "../config/Sequelize.js";
import { getPagination, getPagingData } from "../utils/pagination.js";

export const paymentProductController = {
  createPaymentProduct: async (req, res) => {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }

    try {
      const { product_name, product_type, description, price, unit, duration_days, metadata } = req.body;

      const newProduct = await PaymentProduct.create({
        product_name,
        product_type,
        description,
        price,
        unit,
        duration_days,
        metadata,
      });

      return res.status(201).json(newProduct);
    } catch (error) {
      console.error('Error creating payment product:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  getAllPaymentProducts: async (req, res) => {
    try {
      const { page = 0, size = 10 } = req.query;
      const { limit, offset } = getPagination(page, size);

      const products = await PaymentProduct.findAndCountAll({
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      const result = getPagingData(products, page, limit);
      return res.json(result);
    } catch (error) {
      console.error('Error fetching payment products:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },
  getAllPaymentProductsNoPaging: async (req, res) => {
    try {
      const { page = 0, size = 10 } = req.query;

      const products = await PaymentProduct.findAndCountAll({
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });
      return res.json(products);
    } catch (error) {
      console.error('Error fetching payment products:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  getPaymentProductById: async (req, res) => {
    try {
      const { id } = req.params;
      const product = await PaymentProduct.findByPk(id);

      if (!product) {
        return res.status(404).json({ message: 'Product not found.' });
      }

      return res.json(product);
    } catch (error) {
      console.error('Error fetching payment product by ID:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  updatePaymentProduct: async (req, res) => {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }

    try {
      const { id } = req.params;
      const [updated] = await PaymentProduct.update(req.body, {
        where: { product_id: id },
      });

      if (updated) {
        const updatedProduct = await PaymentProduct.findByPk(id);
        return res.json(updatedProduct);
      }

      return res.status(404).json({ message: 'Product not found.' });
    } catch (error) {
      console.error('Error updating payment product:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },

  deletePaymentProduct: async (req, res) => {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }

    try {
      const { id } = req.params;
      const updated = await PaymentProduct.update({ is_active: false }, {
        where: { product_id: id },
      });

      if (updated[0] === 1) {
        return res.status(204).json({ message: 'Product successfully deactivated.' });
      }

      return res.status(404).json({ message: 'Product not found.' });
    } catch (error) {
      console.error('Error deactivating payment product:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  },
};