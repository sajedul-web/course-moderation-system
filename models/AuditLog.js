const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define(
    'AuditLog',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id', // who performed the action
        },
        action: {
            type: DataTypes.ENUM(
                'UPLOAD',
                'EDIT',
                'ASSIGN',
                'REASSIGN',
                'APPROVE',
                'REQUEST_CHANGES'
            ),
            allowNull: false,
        },
        assessmentId: {
            type: DataTypes.INTEGER,
            field: 'assessment_id',
        },
        details: {
            type: DataTypes.TEXT, // short human-readable description, e.g. "Reassigned from Sulav to Ram"
        },
    },
    {
        tableName: 'AuditLog',
        timestamps: true,
        updatedAt: false, // an audit entry is never edited after creation
    }
);

module.exports = AuditLog;
