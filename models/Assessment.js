const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Assessment = sequelize.define(
    'Assessment',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        subjectCode: {
            type: DataTypes.STRING(20),
            allowNull: false,
            field: 'subject_code',
        },
        assessmentType: {
            type: DataTypes.ENUM('Assignment', 'Quiz', 'Exam'),
            allowNull: false,
            field: 'assessment_type',
        },
        semester: {
            type: DataTypes.STRING(50),
            field: 'semester', // e.g. "Semester 1 2026"
        },
        filePath: {
            type: DataTypes.STRING(255),
            field: 'file_path',
        },
        uploadedBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'uploaded_by', // FK -> User.id
        },
        reviewerId: {
            type: DataTypes.INTEGER,
            field: 'reviewer_id', // FK -> Reviewer.id
        },
        statusId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'status_id', // FK -> ApprovalStatus.id
        },
    },
    {
        tableName: 'Assessment',
        timestamps: true,
    }
);

module.exports = Assessment;
