/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  setupFiles: ['<rootDir>/test/setup-env.js'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }]
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 120000,
  maxWorkers: 1,
  clearMocks: true
};
