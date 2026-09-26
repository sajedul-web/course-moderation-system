const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { submitReview, saveDraft, getDraft, assessmentHistory } = require('../controllers/reviewController');

// POST /api/reviews               -> submit final feedback + Approve/Request Changes (reviewer/admin only)
router.post('/', authenticate, authorize('reviewer', 'admin'), submitReview);

// POST /api/reviews/draft         -> save/update a draft (score + comment, no final decision yet)
router.post('/draft', authenticate, authorize('reviewer', 'admin'), saveDraft);

// GET  /api/reviews/:id/draft     -> fetch the logged-in reviewer's own draft for an assessment
router.get('/:id/draft', authenticate, authorize('reviewer', 'admin'), getDraft);

// GET  /api/reviews/:id/history   -> finalized feedback history for one assessment
router.get('/:id/history', authenticate, assessmentHistory);

module.exports = router;
