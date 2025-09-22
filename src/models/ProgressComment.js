import { DataTypes } from "sequelize";

export default (sequelize) => {
  const ProgressComment = sequelize.define("ProgressComment", {
    comment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    progress_id: {
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
      defaultValue: null,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at',
    tableName: 'progress_comments',
  });

  ProgressComment.associate = function(models) {
    // 关联到进度
    ProgressComment.belongsTo(models.TeamProgress, {
      foreignKey: 'progress_id',
      as: 'progress',
    });

    // 关联到用户
    ProgressComment.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'author',
    });

    // 父评论->子评论（回复）
    ProgressComment.belongsTo(models.ProgressComment, {
      foreignKey: 'parent_comment_id',
      as: 'parentComment',
    });

    ProgressComment.hasMany(models.ProgressComment, {
      foreignKey: 'parent_comment_id',
      as: 'replies',
    });
  };

  return ProgressComment;
};