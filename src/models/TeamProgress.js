import { DataTypes } from "sequelize";
import { Team } from "../config/Sequelize.js";

export default (sequelize) => {
  const TeamProgress = sequelize.define("TeamProgress", {
    progress_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    team_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    timeline_type: {
      type: DataTypes.ENUM('meeting', 'deadline', 'competition', 'progress_report'),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    event_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    submit_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'accept', 'reject'),
      defaultValue: 'pending',
    }
  }, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'team_progress'
  });

  TeamProgress.associate = function(models) {
    TeamProgress.belongsTo(models.User, {
      foreignKey: 'submit_user_id',
      as: 'submitter',
    });
    TeamProgress.belongsTo(models.Team, {
      foreignKey: 'team_id',
      as: 'team',
    });
  TeamProgress.hasOne(models.ProgressMedia, {
    foreignKey: 'progress_id',
    as: 'media',
    onDelete: 'CASCADE'
  });
  };

  return TeamProgress;
};