import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Posts = sequelize.define("Posts", {
    post_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    cover_image_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    views_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    likes_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    comments_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    collected_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
    }
  }, {
    timestamps: true,
    createdAt: 'created_at', 
    updatedAt: 'updated_at', 
    tableName: 'posts',
  });

Posts.associate = function(models) {
  Posts.belongsTo(models.User, {
    foreignKey: "user_id",
    as: "author",
    onDelete: "CASCADE",
    onUpdate: "CASCADE"
  });

  models.User.hasMany(Posts, {
    foreignKey: "user_id",
    as: "posts"
  });

  Posts.hasMany(models.PostMedia, {
    foreignKey: "post_id",
    as: "media"
  });

  Posts.hasMany(models.Likes, {
    foreignKey: "target_id",
    constraints: false,
    scope: {
      target_type: 'post'
    },
    as: "likes"
  });

  Posts.hasMany(models.Comments, {
    foreignKey: "post_id",
    as: "comments"
  });

  Posts.belongsToMany(models.tags, {
    through: models.PostTags,
    foreignKey: "post_id",
    otherKey: "tag_id",
    as: "tags"
  });
};

return Posts;
};