const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { listReviewers } = require('../controllers/reviewerController');

// GET /api/reviewers -> list all reviewers, for the "assign" dropdown
router.get('/', authenticate, authorize('lecturer', 'admin'), listReviewers);

module.exports = router;
