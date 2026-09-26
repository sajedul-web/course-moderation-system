const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Lookup table for assessment statuses: Pending, Under Review,
 * Approved, Changes Requested. Referenced by Assessment.statusId.
 */
const ApprovalStatus = sequelize.define(
    'ApprovalStatus',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        statusName: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            field: 'status_name',
        },
    },
    {
        tableName: 'ApprovalStatus',
        timestamps: false,
    }
);

module.exports = ApprovalStatus;
