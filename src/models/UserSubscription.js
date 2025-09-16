import { DataTypes } from "sequelize";

export default (sequelize) => {
  const UserSubscription = sequelize.define("UserSubscription", {
    subscription_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    payment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'cancelled'),
      defaultValue: 'active',
      allowNull: false,
    },
    start_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    auto_renew: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    team_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    current_value: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  }, {
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at',
    tableName: 'user_subscriptions',
  });

  UserSubscription.associate = function(models) {
    // 关联用户
    UserSubscription.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });

    // 关联商品
    UserSubscription.belongsTo(models.PaymentProduct, {
      foreignKey: 'product_id',
      as: 'product',
    });

    // 关联支付订单
    UserSubscription.belongsTo(models.UserPayment, {
      foreignKey: 'payment_id',
      as: 'payment',
    });

    // 关联团队
    UserSubscription.belongsTo(models.Team, {
      foreignKey: 'team_id',
      as: 'team',
    });
  };

  return UserSubscription;
};