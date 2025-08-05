import { DataTypes } from "sequelize";
import { Team } from "../config/Sequelize.js";

export default (sequelize) => {
  const ThoughtBullet = sequelize.define("ThoughtBullet", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    }
  }, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'thought_bullets'
  });

  ThoughtBullet.associate = function(models) {
    ThoughtBullet.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'author',
    });
  };

  return ThoughtBullet;
};