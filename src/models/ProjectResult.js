import { DataTypes } from "sequelize";

export default (sequelize) => {
  const ProjectResult = sequelize.define("ProjectResult", {
    result_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    team_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('article', 'manual'),
      allowNull: false,
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      // 可选：添加外键约束（推荐）
      // references: {
      //   model: 'posts',
      //   key: 'post_id'
      // }
    },
    is_completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    }
  }, {
    timestamps: false,
    tableName: 'project_results',
  });

  ProjectResult.associate = function(models) {
    ProjectResult.belongsTo(models.Posts, {
      foreignKey: 'post_id',
      as: 'postPR',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    ProjectResult.belongsTo(models.Team, {
      foreignKey: 'team_id',
      as: 'teamPR',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return ProjectResult;
};