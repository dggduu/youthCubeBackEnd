import { DataTypes } from "sequelize";

export default (sequelize) => {
  const tags = sequelize.define("tags", {
    tag_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    tag_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    }
  }, {
    tableName: "tags",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  });

  return tags;
}