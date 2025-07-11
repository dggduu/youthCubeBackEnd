import { DataTypes } from "sequelize";

export default (sequelize) => {
  const UserFollows = sequelize.define("UserFollows", {
    follow_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    follower_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'unique_follow',
    },
    following_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'unique_follow',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      onUpdate: sequelize.literal("CURRENT_TIMESTAMP")
    }
  }, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    tableName: 'user_follows',
  });

  return UserFollows;
};