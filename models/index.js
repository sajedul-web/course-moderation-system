const sequelize = require('../config/database');
const User = require('./User');
const Reviewer = require('./Reviewer');
const ApprovalStatus = require('./ApprovalStatus');
const Assessment = require('./Assessment');
const Feedback = require('./Feedback');
const AuditLog = require('./AuditLog');

// User <-> Reviewer (1:1) — a Reviewer record extends a User account
User.hasOne(Reviewer, { foreignKey: 'userId' });
Reviewer.belongsTo(User, { foreignKey: 'userId' });

// User (lecturer) -> Assessment (1:many) — who uploaded it
User.hasMany(Assessment, { foreignKey: 'uploadedBy', as: 'uploadedAssessments' });
Assessment.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

// Reviewer -> Assessment (1:many) — who it's assigned to
Reviewer.hasMany(Assessment, { foreignKey: 'reviewerId' });
Assessment.belongsTo(Reviewer, { foreignKey: 'reviewerId', as: 'reviewer' });

// ApprovalStatus -> Assessment (1:many) — current status
ApprovalStatus.hasMany(Assessment, { foreignKey: 'statusId' });
Assessment.belongsTo(ApprovalStatus, { foreignKey: 'statusId', as: 'status' });

// Assessment -> Feedback (1:many) — review history
Assessment.hasMany(Feedback, { foreignKey: 'assessmentId' });
Feedback.belongsTo(Assessment, { foreignKey: 'assessmentId' });

// Reviewer -> Feedback (1:many) — who wrote each piece of feedback
Reviewer.hasMany(Feedback, { foreignKey: 'reviewerId' });
Feedback.belongsTo(Reviewer, { foreignKey: 'reviewerId' });

// User -> AuditLog (1:many) — who performed each logged action
User.hasMany(AuditLog, { foreignKey: 'userId' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'actor' });

// Assessment -> AuditLog (1:many) — the audit trail for one assessment
Assessment.hasMany(AuditLog, { foreignKey: 'assessmentId' });
AuditLog.belongsTo(Assessment, { foreignKey: 'assessmentId' });

module.exports = { sequelize, User, Reviewer, ApprovalStatus, Assessment, Feedback, AuditLog };
