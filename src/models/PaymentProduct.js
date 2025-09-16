import { DataTypes } from "sequelize";

export default (sequelize) => {
  const PaymentProduct = sequelize.define("PaymentProduct", {
    product_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    product_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    product_type: {
      type: DataTypes.ENUM('membership', 'resource_pack', 'storage_quota', 'team_size', 'traffic_boost'),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    duration_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at',
    tableName: 'payment_products',
  });

  PaymentProduct.associate = function(models) {
    // 一个商品可以被多个支付订单引用
    PaymentProduct.hasMany(models.UserPayment, {
      foreignKey: 'product_id',
      as: 'payments',
    });

    // 一个商品可以有多个订阅记录
    PaymentProduct.hasMany(models.UserSubscription, {
      foreignKey: 'product_id',
      as: 'subscriptions',
    });
  };

  return PaymentProduct;
};