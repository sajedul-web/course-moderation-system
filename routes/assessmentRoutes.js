const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadAssessment, listAssessments, getAssessment, updateAssessment, assignReviewer } = require('../controllers/assessmentController');

// GET /api/assessments        -> list all visible to this user (filtered by role)
router.get('/', authenticate, listAssessments);

// GET /api/assessments/:id    -> single assessment + feedback history (filtered by role)
router.get('/:id', authenticate, getAssessment);

// POST /api/assessments       -> upload (lecturer/admin only), multipart/form-data, field name "file"
router.post('/', authenticate, authorize('lecturer', 'admin'), upload.single('file'), uploadAssessment);

// PUT /api/assessments/:id    -> edit & resubmit (owner or admin only; blocked once Approved)
router.put('/:id', authenticate, authorize('lecturer', 'admin'), upload.single('file'), updateAssessment);

// PATCH /api/assessments/:id/assign -> assign a reviewer (owner lecturer or admin), body: { reviewerUserId }
router.patch('/:id/assign', authenticate, authorize('lecturer', 'admin'), assignReviewer);

module.exports = router;
