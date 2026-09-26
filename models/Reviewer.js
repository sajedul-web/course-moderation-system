const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * A Reviewer is a 1:1 extension of a User with role = 'reviewer' (or 'admin').
 * Kept as its own table (per the report's data plan) so reviewer-specific
 * fields (department, specialization, etc.) don't clutter the base User table.
 */
const Reviewer = sequelize.define(
    'Reviewer',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            field: 'user_id',
        },
        department: {
            type: DataTypes.STRING(150),
        },
    },
    {
        tableName: 'Reviewer',
        timestamps: true,
    }
);

module.exports = Reviewer;
