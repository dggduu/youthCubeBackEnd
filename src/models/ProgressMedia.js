import { DataTypes } from "sequelize";

export default (sequelize) => {
  const ProgressMedia = sequelize.define("ProgressMedia", {
    media_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    progress_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    media_url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    media_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'image',
    },
    order_index: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    }
  }, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'progress_media',
  });

  // 定义模型关联
  ProgressMedia.associate = function(models) {
    ProgressMedia.belongsTo(models.TeamProgress, {
      foreignKey: 'progress_id',
      as: 'progress',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return ProgressMedia;
};