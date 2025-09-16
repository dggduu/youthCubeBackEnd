import { DataTypes } from "sequelize";

export default (sequelize) => {
  const TrafficBoostRecord = sequelize.define("TrafficBoostRecord", {
    record_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    payment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    views_consumed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    cost_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    triggered_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  }, {
    timestamps: false,
    tableName: 'traffic_boost_records',
  });

  TrafficBoostRecord.associate = function(models) {
    // 关联支付订单
    TrafficBoostRecord.belongsTo(models.UserPayment, {
      foreignKey: 'payment_id',
      as: 'payment',
    });

    // 关联项目/帖子
    TrafficBoostRecord.belongsTo(models.Posts, {
      foreignKey: 'post_id',
      as: 'post',
    });
  };

  return TrafficBoostRecord;
};