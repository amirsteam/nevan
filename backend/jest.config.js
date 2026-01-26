module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  testMatch: ['**/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['./tests/setup.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
