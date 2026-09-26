module.exports = async () => {
    // Nothing to do here — each test file closes its own Sequelize connection
    // in its own afterAll(). This file exists so jest.config.js has a matching
    // teardown step alongside globalSetup.
};
