module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupTestDB.js'],

  // Ignore disabled tests completely
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/tests_disabled/'
  ],

  // Explicit test match (prevents folder scanning issues)
  testMatch: ['**/?(*.)+(test).[jt]s'],

  // Required for ESM projects
  extensionsToTreatAsEsm: ['.js']
};

