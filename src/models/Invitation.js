import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Invitation = sequelize.define("Invitation", {
    invitation_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    team_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    invited_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
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
    tableName: 'invitations',
  });

  // 定义关联
  Invitation.associate = function(models) {
    Invitation.belongsTo(models.Team, { foreignKey: 'team_id' , as: "team" });
    Invitation.belongsTo(models.User, { foreignKey: 'invited_by', as: 'inviter' });
    Invitation.belongsTo(models.User, { foreignKey: 'user_id', as: 'invitee' });
  };

  return Invitation;
};