import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Comments = sequelize.define("comments", {
    comment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    parent_comment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
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
    tableName: 'comments',
  });

  Comments.associate = function(models) {
    Comments.belongsTo(models.Posts, {
      foreignKey: "post_id",
      as: "post",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    });

    Comments.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    });

    Comments.belongsTo(Comments, {
      foreignKey: "parent_comment_id",
      as: "parentComment",
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    });

    Comments.hasMany(Comments, {
      foreignKey: "parent_comment_id",
      as: "replies",
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    });
  };

  return Comments;
};