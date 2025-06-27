const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PostTags = sequelize.define("PostTags", {
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    tag_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
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
    tableName: 'post_tags',
  });

  PostTags.associate = function(models) {
    PostTags.belongsTo(models.posts, {
      foreignKey: "post_id",
      as: "post",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    });

    PostTags.belongsTo(models.tags, {
      foreignKey: "tag_id",
      as: "tag",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    });
  };

  return PostTags;
};