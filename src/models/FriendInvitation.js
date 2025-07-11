import { DataTypes } from "sequelize";

export default (sequelize) => {
  const FriendInvitation = sequelize.define("FriendInvitation", {
    invitation_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    inviter_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    invitee_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'expired'),
      defaultValue: 'pending',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      onUpdate: DataTypes.NOW,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    }
  }, {
    timestamps: false,
    tableName: 'friend_invitations',
  });

  // 定义关联
  FriendInvitation.associate = function(models) {
    FriendInvitation.belongsTo(models.User, {
      foreignKey: 'inviter_id',
      as: 'inviter',
    });
    FriendInvitation.belongsTo(models.User, {
      foreignKey: 'invitee_id',
      as: 'invitee',
      allowNull: true,
    });
  };

  return FriendInvitation;
};