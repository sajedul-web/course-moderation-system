const { AuditLog, User, Assessment } = require('../models');

exports.listAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.findAll({
            include: [
                { model: User, as: 'actor', attributes: ['id', 'fullName', 'email', 'role'] },
                { model: Assessment, attributes: ['id', 'title', 'subjectCode'] },
            ],
            order: [['createdAt', 'DESC']],
            limit: 200, // most recent 200 entries — plenty for a capstone demo, keeps the response light
        });

        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
