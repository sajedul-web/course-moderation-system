const { AuditLog } = require('../models');

/**
 * Records one audit log entry. Call this right after an action succeeds —
 * never lets a logging failure break the actual request (logs a warning
 * and moves on instead of throwing).
 */
async function logAction(userId, action, assessmentId, details) {
    try {
        await AuditLog.create({ userId, action, assessmentId, details });
    } catch (err) {
        console.error('Failed to write audit log entry:', err.message);
    }
}

module.exports = { logAction };
