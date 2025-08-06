// models/TeamAnnouncement.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const TeamAnnouncement = sequelize.define("TeamAnnouncement", {
    announcement_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    team_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'teams',
        key: 'team_id'
      },
      field: 'team_id'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'created_by'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      onUpdate: 'CURRENT_TIMESTAMP',
      field: 'updated_at'
    },
    is_pinned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_pinned'
    },
    status: {
      type: DataTypes.ENUM('active', 'deleted'),
      allowNull: false,
      defaultValue: 'active'
    }
  }, {
    timestamps: false,
    tableName: 'team_announcements',
    underscored: false,
  });

  TeamAnnouncement.associate = function(models) {
    // 关联：公告 → 团队
    TeamAnnouncement.belongsTo(models.Team, {
      foreignKey: 'team_id',
      as: 'team'
    });

    // 关联：公告 → 用户（发布人）
    TeamAnnouncement.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'author'
    });
  };

  return TeamAnnouncement;
};