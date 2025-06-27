const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const collections = sequelize.define("collections", {
    collection_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'unique_collection',
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'unique_collection',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    }
  }, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    tableName: 'collections',
  });

  collections.belongsTo(sequelize.models.users, {
    foreignKey: 'user_id',
    as: 'user',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  collections.belongsTo(sequelize.models.posts, {
    foreignKey: 'post_id',
    as: 'post',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  return collections;
};