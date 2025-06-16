module.exports = {
  testRegex: '\\.spec\\.js$',
  testEnvironment: 'jsdom',

  collectCoverageFrom: ['src/**/*.js'],
  coverageReporters: ['cobertura', 'lcov', 'text-summary'],
  coverageDirectory: '<rootDir>/coverage',
  setupFilesAfterEnv: ['./jest/setupTestFramework.js'],
  roots: ['<rootDir>/src'],
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
}
