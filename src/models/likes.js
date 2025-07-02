import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Likes = sequelize.define("likes", {
    like_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'unique_like',
    },
    target_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'unique_like',
    },
    target_type: {
      type: DataTypes.ENUM('post', 'comment'),
      allowNull: false,
      unique: 'unique_like',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    }
  }, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    tableName: 'likes',
  });

  Likes.associate = function(models) {
    Likes.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    });

  };
  return Likes;
};