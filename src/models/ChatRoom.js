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
    timestamps: false,
    tableName: 'chat_rooms',
  });

  return ChatRoom;
};