const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Feedback = sequelize.define(
    'Feedback',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        assessmentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'assessment_id',
        },
        reviewerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'reviewer_id',
        },
        comment: {
            type: DataTypes.TEXT,
        },
        score: {
            type: DataTypes.DECIMAL(5, 2), // e.g. 87.50 out of 100
            field: 'score',
        },
        decision: {
            type: DataTypes.ENUM('Approved', 'Changes Requested'),
            allowNull: true, // null while it's still a draft (no final decision yet)
        },
        isDraft: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'is_draft',
        },
    },
    {
        tableName: 'Feedback',
        timestamps: true,
    }
);

module.exports = Feedback;
