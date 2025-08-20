module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'lib/**/*.js',
    '!lib/utils/fs-utils.js',
    'serveVersionedAPI.js',
    'versionMiddleware.js',
    'runtimeLoader.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true
};