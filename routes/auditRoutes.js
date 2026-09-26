const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { listAuditLogs } = require('../controllers/auditController');

// GET /api/audit-logs -> admin-only, most recent 200 actions across the system
router.get('/', authenticate, authorize('admin'), listAuditLogs);

module.exports = router;
