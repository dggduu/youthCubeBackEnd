import { DataTypes } from "sequelize";

export default (sequelize) => {
  const TeamTag = sequelize.define("TeamTag", {
    team_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    tag_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    }
  }, {
    timestamps: false,
    tableName: 'team_tags',
  });

  return TeamTag;
};