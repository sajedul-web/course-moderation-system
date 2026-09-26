module.exports = {
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/tests/env.js'],
    globalSetup: '<rootDir>/tests/globalSetup.js',
    globalTeardown: '<rootDir>/tests/globalTeardown.js',
    testTimeout: 15000,
};
