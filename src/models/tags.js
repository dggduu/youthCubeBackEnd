const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const tags = sequelize.define("tags", {
        "tag_id": {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true,
        },
        "tag_name": {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        "create_at": {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        },
    },{
        tableName: "tags",
        timestamps: true,
        createdAt: "create_at",
        updatedAt: false,
    });
    return tags;
}