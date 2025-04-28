/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Map ES modules to CommonJS wrappers for tests
    '^../dist/cloud/cloud-cache.js$': '<rootDir>/src/cloud/cloud-cache.cjs',
    '^../dist/cloud/provider-factory.js$': '<rootDir>/src/cloud/provider-factory.cjs',
    '^../dist/cloud/s3-provider.js$': '<rootDir>/src/cloud/s3-provider.cjs',
    '^../dist/install.js$': '<rootDir>/src/install.cjs',
    '^../dist/cache.js$': '<rootDir>/src/cache.cjs',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: [
    // Don't transform node_modules except for our own package
    '/node_modules/(?!@flash-install)/'
  ],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/types/**/*.ts',
  ],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts', '**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/\\._/'],
};

export default config;
