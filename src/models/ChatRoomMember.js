import { DataTypes } from "sequelize";

export default (sequelize) => {
  const ChatRoomMember = sequelize.define("ChatRoomMember", {
    room_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
    },
    role: {
        type: DataTypes.ENUM('owner', 'co_owner', 'member'),
        allowNull: false,
        defaultValue: 'member'
    }
  }, {
    timestamps: false,
    tableName: 'chat_room_members',
  });
  ChatRoomMember.associate = function(models) {
    ChatRoomMember.belongsTo(models.Team, {
      foreignKey: 'room_id',
      as: 'team'
    });
    
    ChatRoomMember.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'member'
    });
  };
  return ChatRoomMember;
};