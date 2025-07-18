import { DataTypes } from "sequelize";

export default (sequelize) => {
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
    // created_at: {
    //   type: DataTypes.DATE,
    //   allowNull: false,
    //   defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    // }
  }, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'post_tags',
  });

  PostTags.associate = function(models) {
    PostTags.belongsTo(models.Posts, {
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