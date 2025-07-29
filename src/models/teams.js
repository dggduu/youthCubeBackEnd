import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Team = sequelize.define("Team", {
    team_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    team_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    create_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "create_at"
    },
    grade: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'mature',
      validate: {
        isIn: [
          [
            'child',
            'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6',
            'junior_1', 'junior_2', 'junior_3',
            'senior_1', 'senior_2', 'senior_3',
            'undergraduate', 'master', 'phd',
            'mature'
          ]
        ]
      }
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
  }, {
    timestamps: false,
    tableName: 'teams',
  });
  Team.associate = function(models) {
    Team.hasMany(models.ChatRoomMember, {
      foreignKey: 'room_id',
      as: 'members'
    });

    Team.hasOne(models.ChatRoom, {
      foreignKey: 'team_id',
      as: 'chatRoom'
    });
    Team.hasMany(models.ProjectResult, {
      foreignKey: 'team_id',
      as: 'projectResults'
    });
  };

  return Team;
};