const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PostMedia = sequelize.define("postMedia", {
    media_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    media_url: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    media_type: {
      type: DataTypes.ENUM('image', 'video'),
      allowNull: false,
    },
    order_index: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    tableName: 'post_media',
  });

  PostMedia.associate = function(models) {
    PostMedia.belongsTo(models.posts, {
      foreignKey: "post_id",
      as: "post",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    });
  };

  return PostMedia;
};