import { DataTypes } from "sequelize";

export default (sequelize) => {
  const UserPayment = sequelize.define("UserPayment", {
    payment_id: {
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
    order_no: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    third_party_order_no: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'CNY',
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
      defaultValue: 'pending',
      allowNull: false,
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expired_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at',
    tableName: 'user_payments',
  });

  UserPayment.associate = function(models) {
    // 关联用户
    UserPayment.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });

    // 关联商品
    UserPayment.belongsTo(models.PaymentProduct, {
      foreignKey: 'product_id',
      as: 'product',
    });

    // 关联团队
    UserPayment.belongsTo(models.Team, {
      foreignKey: 'team_id',
      as: 'team',
    });

    // 关联项目/帖子
    UserPayment.belongsTo(models.Posts, {
      foreignKey: 'post_id',
      as: 'post',
    });

    // 一个支付订单可能对应一个订阅
    UserPayment.hasOne(models.UserSubscription, {
      foreignKey: 'payment_id',
      as: 'subscription',
    });

    // 一个支付订单可能对应多个消耗记录
    UserPayment.hasMany(models.TrafficBoostRecord, {
      foreignKey: 'payment_id',
      as: 'trafficRecords',
    });
  };

  return UserPayment;
};