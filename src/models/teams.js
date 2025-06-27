const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
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
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "create_at"
    }
  }, {
    timestamps: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'teams',
  });

  return Team;
};