import { DataTypes } from "sequelize";

export default (sequelize) => {
  const PrivateChat = sequelize.define("PrivateChat", {
    user1_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'User',
        key: 'id'
      },
      comment: '用户ID较小的一方（user1_id < user2_id）'
    },
    user2_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'User',
        key: 'id'
      },
      comment: '用户ID较大的一方（user2_id > user1_id）'
    },
    room_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'ChatRoom',
        key: 'room_id'
      }
    }
  }, {
    timestamps: false,
    tableName: 'private_chats',
    primaryKey: ['user1_id', 'user2_id'],
  });

PrivateChat.associate = function(models) {
    PrivateChat.belongsTo(models.User, { 
        as: 'PrivateChatUser1',
        foreignKey: 'user1_id' 
    });
    PrivateChat.belongsTo(models.User, { 
        as: 'PrivateChatUser2', 
        foreignKey: 'user2_id' 
    });
    PrivateChat.belongsTo(models.ChatRoom, { 
        foreignKey: 'room_id',
        as: 'PrivateChatRoom'
    });
};

  return PrivateChat;
};