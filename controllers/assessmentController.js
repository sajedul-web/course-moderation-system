const { Assessment, User, Reviewer, ApprovalStatus, Feedback } = require('../models');
const { logAction } = require('../utils/auditLogger');

exports.uploadAssessment = async (req, res) => {
    try {
        const { title, subjectCode, assessmentType, semester } = req.body;

        if (!title || !subjectCode || !assessmentType) {
            return res.status(400).json({ error: 'title, subjectCode and assessmentType are required.' });
        }

        const pendingStatus = await ApprovalStatus.findOne({ where: { statusName: 'Pending' } });
        if (!pendingStatus) {
            return res.status(500).json({ error: 'ApprovalStatus lookup table is not seeded. Run npm run seed.' });
        }

        const assessment = await Assessment.create({
            title,
            subjectCode: subjectCode.toUpperCase(),
            assessmentType,
            semester: semester || null,
            filePath: req.file ? `uploads/${req.file.filename}` : null,
            uploadedBy: req.user.id,
            reviewerId: null, // explicit, so it appears in the JSON response instead of being omitted entirely
            statusId: pendingStatus.id,
        });

        await logAction(req.user.id, 'UPLOAD', assessment.id, `Uploaded "${assessment.title}" (${assessment.subjectCode})`);

        res.status(201).json(assessment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.listAssessments = async (req, res) => {
    try {
        const assessments = await Assessment.findAll({
            include: [
                { model: User, as: 'uploader', attributes: ['id', 'fullName', 'email'] },
                {
                    model: Reviewer,
                    as: 'reviewer',
                    include: [{ model: User, attributes: ['id', 'fullName'] }],
                },
                { model: ApprovalStatus, as: 'status' },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(assessments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAssessment = async (req, res) => {
    try {
        const assessment = await Assessment.findByPk(req.params.id, {
            include: [
                { model: User, as: 'uploader', attributes: ['id', 'fullName', 'email'] },
                {
                    model: Reviewer,
                    as: 'reviewer',
                    include: [{ model: User, attributes: ['id', 'fullName'] }],
                },
                { model: ApprovalStatus, as: 'status' },
                { model: Feedback },
            ],
        });

        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found.' });
        }

        res.json(assessment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateAssessment = async (req, res) => {
    try {
        const assessment = await Assessment.findByPk(req.params.id, {
            include: [{ model: ApprovalStatus, as: 'status' }],
        });

        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found.' });
        }

        // Only the original uploader (or an admin) can edit it.
        const isOwner = assessment.uploadedBy === req.user.id;
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'You can only edit assessments you uploaded.' });
        }

        // Once approved, it's locked — resubmitting after approval would need a new upload.
        if (assessment.status?.statusName === 'Approved') {
            return res.status(400).json({ error: 'This assessment has already been approved and can no longer be edited.' });
        }

        const { title, subjectCode, assessmentType, semester } = req.body;

        if (title) assessment.title = title;
        if (subjectCode) assessment.subjectCode = subjectCode.toUpperCase();
        if (assessmentType) assessment.assessmentType = assessmentType;
        if (semester !== undefined) assessment.semester = semester;
        if (req.file) assessment.filePath = `uploads/${req.file.filename}`;

        // Editing puts it back in the review queue.
        const pendingStatus = await ApprovalStatus.findOne({ where: { statusName: 'Pending' } });
        assessment.statusId = pendingStatus.id;

        await assessment.save();
        await assessment.reload({ include: [{ model: ApprovalStatus, as: 'status' }] });

        await logAction(req.user.id, 'EDIT', assessment.id, `Edited and resubmitted "${assessment.title}"`);

        res.json(assessment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.assignReviewer = async (req, res) => {
    try {
        const { reviewerUserId } = req.body;

        if (!reviewerUserId) {
            return res.status(400).json({ error: 'reviewerUserId is required.' });
        }

        const assessment = await Assessment.findByPk(req.params.id, {
            include: [
                { model: ApprovalStatus, as: 'status' },
                { model: Reviewer, as: 'reviewer', include: [{ model: User, attributes: ['fullName'] }] },
            ],
        });
        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found.' });
        }

        // The lecturer who uploaded it (or an admin) can assign a reviewer.
        const isOwner = assessment.uploadedBy === req.user.id;
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'You can only assign a reviewer to assessments you uploaded.' });
        }

        // A lecturer can't touch an already-approved assessment — but an admin
        // can, specifically so they can reassign to a different reviewer even
        // after a decision has already been made (e.g. to correct a mistake
        // or get a second opinion).
        if (assessment.status?.statusName === 'Approved' && !isAdmin) {
            return res.status(400).json({ error: 'This assessment has already been approved.' });
        }

        const reviewer = await Reviewer.findOne({
            where: { userId: reviewerUserId },
            include: [{ model: User, attributes: ['fullName'] }],
        });
        if (!reviewer) {
            return res.status(404).json({ error: 'That user is not registered as a reviewer.' });
        }

        const previousReviewerName = assessment.reviewer?.User?.fullName;
        const isReassignment = !!assessment.reviewerId;

        const underReviewStatus = await ApprovalStatus.findOne({ where: { statusName: 'Under Review' } });

        assessment.reviewerId = reviewer.id;
        assessment.statusId = underReviewStatus.id;
        await assessment.save();
        await assessment.reload({ include: [{ model: ApprovalStatus, as: 'status' }] });

        const newReviewerName = reviewer.User.fullName;
        const details = isReassignment
            ? `Reassigned from ${previousReviewerName || 'a previous reviewer'} to ${newReviewerName}`
            : `Assigned to ${newReviewerName}`;

        await logAction(req.user.id, isReassignment ? 'REASSIGN' : 'ASSIGN', assessment.id, details);

        res.json(assessment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
