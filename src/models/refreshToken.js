const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    refresh_token: {
      type: DataTypes.STRING(512),
      allowNull: false,
      unique: true,
      field: 'refresh_token',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  }, {
    tableName: 'refresh_tokens',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  return RefreshToken;
};
