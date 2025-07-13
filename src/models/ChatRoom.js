import { DataTypes } from "sequelize";

export default (sequelize) => {
  const ChatRoom = sequelize.define("ChatRoom", {
    room_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('team', 'private'),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    team_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
    }
  }, {
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at',
    tableName: 'chat_rooms',
  });

  ChatRoom.associate = function(models) {
      ChatRoom.hasMany(models.Message, {
          foreignKey: 'room_id',
          as: 'all_messages'
      });
      
      ChatRoom.hasOne(models.Message, {
          foreignKey: 'room_id',
          as: 'last_message',
          order: [['timestamp', 'DESC']]
      });
  };

  return ChatRoom;
};