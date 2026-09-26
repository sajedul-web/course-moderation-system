const { Reviewer, User } = require('../models');

exports.listReviewers = async (req, res) => {
    try {
        const reviewers = await Reviewer.findAll({
            include: [{ model: User, attributes: ['id', 'fullName', 'email'] }],
        });

        res.json(reviewers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
