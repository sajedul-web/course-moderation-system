const { Assessment, Feedback, ApprovalStatus, Reviewer } = require('../models');
const { logAction } = require('../utils/auditLogger');

const DECISION_MAP = {
    approve: { decisionLabel: 'Approved', statusName: 'Approved', auditAction: 'APPROVE' },
    request_changes: { decisionLabel: 'Changes Requested', statusName: 'Changes Requested', auditAction: 'REQUEST_CHANGES' },
};

exports.submitReview = async (req, res) => {
    try {
        const { assessmentId, comment, decision } = req.body;

        if (!assessmentId || !DECISION_MAP[decision]) {
            return res.status(400).json({
                error: 'assessmentId and a valid decision ("approve" or "request_changes") are required.',
            });
        }

        // The logged-in user must have a linked Reviewer record.
        const reviewer = await Reviewer.findOne({ where: { userId: req.user.id } });
        if (!reviewer) {
            return res.status(403).json({ error: 'Only registered reviewers can submit reviews.' });
        }

        const assessment = await Assessment.findByPk(assessmentId);
        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found.' });
        }

        // Must actually be the reviewer this assessment was assigned to (admins can override).
        if (req.user.role !== 'admin') {
            if (!assessment.reviewerId) {
                return res.status(403).json({ error: 'This assessment has not been assigned to a reviewer yet.' });
            }
            if (assessment.reviewerId !== reviewer.id) {
                return res.status(403).json({ error: 'This assessment is not assigned to you.' });
            }
        }

        const { decisionLabel, statusName, auditAction } = DECISION_MAP[decision];
        const status = await ApprovalStatus.findOne({ where: { statusName } });

        // If a draft already exists for this reviewer/assessment, finalize it
        // instead of creating a duplicate row.
        const existingDraft = await Feedback.findOne({
            where: { assessmentId, reviewerId: reviewer.id, isDraft: true },
        });

        let feedback;
        if (existingDraft) {
            existingDraft.comment = comment ?? existingDraft.comment;
            existingDraft.decision = decisionLabel;
            existingDraft.isDraft = false;
            await existingDraft.save();
            feedback = existingDraft;
        } else {
            feedback = await Feedback.create({
                assessmentId,
                reviewerId: reviewer.id,
                comment: comment || '',
                decision: decisionLabel,
                isDraft: false,
            });
        }

        await assessment.update({ statusId: status.id });

        await logAction(req.user.id, auditAction, assessment.id, `${decisionLabel} "${assessment.title}"`);

        res.status(201).json({ feedback, assessment });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Save (or update) a draft comment — kept in progress, no final decision
// yet and the assessment's status is left untouched. Note: no scoring/
// grading here — reviewers approve or request changes, they don't assign
// a numeric grade.
exports.saveDraft = async (req, res) => {
    try {
        const { assessmentId, comment } = req.body;

        if (!assessmentId) {
            return res.status(400).json({ error: 'assessmentId is required.' });
        }

        const reviewer = await Reviewer.findOne({ where: { userId: req.user.id } });
        if (!reviewer) {
            return res.status(403).json({ error: 'Only registered reviewers can save a draft.' });
        }

        const assessment = await Assessment.findByPk(assessmentId);
        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found.' });
        }

        if (req.user.role !== 'admin') {
            if (!assessment.reviewerId || assessment.reviewerId !== reviewer.id) {
                return res.status(403).json({ error: 'This assessment is not assigned to you.' });
            }
        }

        // One draft per reviewer per assessment — update it if it already exists.
        let draft = await Feedback.findOne({
            where: { assessmentId, reviewerId: reviewer.id, isDraft: true },
        });

        if (draft) {
            draft.comment = comment ?? draft.comment;
            await draft.save();
        } else {
            draft = await Feedback.create({
                assessmentId,
                reviewerId: reviewer.id,
                comment: comment || '',
                decision: null,
                isDraft: true,
            });
        }

        res.status(200).json(draft);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Fetch the logged-in reviewer's own draft for an assessment, so the
// review page can pre-fill the comment field on load.
exports.getDraft = async (req, res) => {
    try {
        const reviewer = await Reviewer.findOne({ where: { userId: req.user.id } });
        if (!reviewer) {
            return res.json(null);
        }

        const draft = await Feedback.findOne({
            where: { assessmentId: req.params.id, reviewerId: reviewer.id, isDraft: true },
        });

        res.json(draft || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.assessmentHistory = async (req, res) => {
    try {
        const feedback = await Feedback.findAll({
            where: { assessmentId: req.params.id, isDraft: false },
            order: [['createdAt', 'DESC']],
        });

        res.json(feedback);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
