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

  return ProjectResult;
};