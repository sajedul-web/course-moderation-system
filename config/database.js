require('dotenv').config();
const { Sequelize } = require('sequelize');

// When running under the test suite (NODE_ENV=test), use a separate
// "_test" database so tests never touch or wipe your real dev data.
const baseName = process.env.DB_NAME || 'course_moderation_system';
const dbName = process.env.NODE_ENV === 'test' ? `${baseName}_test` : baseName;

const sequelize = new Sequelize(
    dbName,
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false,
    }
);

module.exports = sequelize;
