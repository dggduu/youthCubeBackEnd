// models/Team.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Team = sequelize.define("Team", {
    team_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    team_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    create_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW, 
      field: "create_at"
    },
    grade: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'mature',
      validate: {
        isIn: [
          [
            'child',
            'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6',
            'junior_1', 'junior_2', 'junior_3',
            'senior_1', 'senior_2', 'senior_3',
            'undergraduate', 'master', 'phd',
            'mature'
          ]
        ]
      }
    },
    parent_team_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'teams',
        key: 'team_id'
      },
      field: 'parent_team_id'
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
  }, {
    timestamps: false,
    tableName: 'teams',
    underscored: false,
  });

  Team.associate = function(models) {
    // 团队 → 公告
    if (models.TeamAnnouncement) {
      Team.hasMany(models.TeamAnnouncement, {
        foreignKey: 'team_id',
        as: 'announcements'
      });
    }

    // 团队 → 聊天室
    if (models.ChatRoom) {
      Team.hasOne(models.ChatRoom, {
        foreignKey: 'team_id',
        as: 'chatRoom'
      });
    }

    // 团队 → 项目成果
    if (models.ProjectResult) {
      Team.hasMany(models.ProjectResult, {
        foreignKey: 'team_id',
        as: 'projectResults'
      });
    }

    // 自关联：团队 → 子团队
    Team.hasMany(models.Team, {
      foreignKey: 'parent_team_id',
      as: 'subTeams'
    });

    // 团队 ← 父团队
    Team.belongsTo(models.Team, {
      foreignKey: 'parent_team_id',
      as: 'parentTeam'
    });
  };

  return Team;
};