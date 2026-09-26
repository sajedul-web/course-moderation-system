const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        fullName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'full_name',
        },
        email: {
            type: DataTypes.STRING(150),
            allowNull: false,
            unique: true,
        },
        passwordHash: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'password_hash',
        },
        role: {
            type: DataTypes.ENUM('lecturer', 'reviewer', 'admin'),
            allowNull: false,
            defaultValue: 'lecturer',
        },
    },
    {
        tableName: 'User',
        timestamps: true,
    }
);

module.exports = User;
