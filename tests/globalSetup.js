process.env.NODE_ENV = 'test';

module.exports = async () => {
    const { sequelize, ApprovalStatus } = require('../models');

    // Fresh tables every test run — this is the TEST database (course_moderation_system_test),
    // never the real dev database, thanks to config/database.js switching on NODE_ENV.
    await sequelize.sync({ force: true });

    await ApprovalStatus.bulkCreate([
        { statusName: 'Pending' },
        { statusName: 'Under Review' },
        { statusName: 'Approved' },
        { statusName: 'Changes Requested' },
    ]);

    await sequelize.close();
};
