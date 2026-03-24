'use strict';

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // Discover all test files across backend services
  testMatch: [
    '<rootDir>/backend/services/**/*.test.js',
  ],
  // Each test file gets a fresh module registry (critical for per-service mocks)
  resetModules: true,
  // Timeout per test — agents do some internal logic
  testTimeout: 15000,
  // Show individual test names in output
  verbose: true,
  // Collect coverage from all service source files when --coverage is passed
  collectCoverageFrom: [
    'backend/services/**/!(*.test).js',
    '!backend/services/**/node_modules/**',
    '!backend/services/**/Dockerfile',
  ],
};
