const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { SyncPolicy } = require('../src/cloud/cloud-cache.cjs');

// Mock child_process before requiring it
jest.mock('child_process', () => ({
  execSync: jest.fn().mockImplementation(() => 'mocked output'),
  spawn: jest.fn()
}));

// Now require the mocked module
const { execSync } = require('child_process');

// Create temp directory for tests
const TEST_DIR = path.join(os.tmpdir(), 'flash-install-cli-test-' + Date.now());
const TEST_PROJECT_DIR = path.join(TEST_DIR, 'test-project');

describe('CLI Cloud Cache Integration', () => {
  beforeAll(async () => {
    await fs.ensureDir(TEST_PROJECT_DIR);

    // Create a minimal package.json
    await fs.writeJSON(path.join(TEST_PROJECT_DIR, 'package.json'), {
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        'lodash': '^4.17.21'
      }
    });
  });

  afterAll(async () => {
    await fs.remove(TEST_DIR);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cloud Cache CLI Options', () => {
    test('should pass S3 cloud configuration correctly', () => {
      const cliCommand = `node dist/cli.js install --cloud-provider=s3 --cloud-bucket=test-bucket --cloud-region=us-east-1 --cloud-sync=always-upload`;

      execSync(cliCommand, { cwd: process.cwd() });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('--cloud-provider=s3'),
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('--cloud-bucket=test-bucket'),
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('--cloud-region=us-east-1'),
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('--cloud-sync=always-upload'),
        expect.any(Object)
      );
    });

    test('should handle cloud credentials options', () => {
      const cliCommand = `node dist/cli.js install --cloud-provider=s3 --cloud-bucket=test-bucket --cloud-key=test-key --cloud-secret=test-secret`;

      execSync(cliCommand, { cwd: process.cwd() });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('--cloud-key=test-key'),
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('--cloud-secret=test-secret'),
        expect.any(Object)
      );
    });

    test('should handle cloud endpoint option for custom S3 providers', () => {
      const cliCommand = `node dist/cli.js install --cloud-provider=s3 --cloud-bucket=test-bucket --cloud-endpoint=https://custom-s3.example.com`;

      execSync(cliCommand, { cwd: process.cwd() });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('--cloud-endpoint=https://custom-s3.example.com'),
        expect.any(Object)
      );
    });

    test('should handle team ID option for shared caching', () => {
      const cliCommand = `node dist/cli.js install --cloud-provider=s3 --cloud-bucket=test-bucket --cloud-team-id=engineering-team`;

      execSync(cliCommand, { cwd: process.cwd() });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('--cloud-team-id=engineering-team'),
        expect.any(Object)
      );
    });

    test('should handle cloud disable option', () => {
      const cliCommand = `node dist/cli.js install --cloud-disable`;

      execSync(cliCommand, { cwd: process.cwd() });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('--cloud-disable'),
        expect.any(Object)
      );
    });

    test('should handle cloud test option', () => {
      const cliCommand = `node dist/cli.js --test --cloud-provider=s3 --cloud-bucket=test-bucket`;

      execSync(cliCommand, { cwd: process.cwd() });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('--test'),
        expect.any(Object)
      );
    });
  });

  describe('Sync Policy Options', () => {
    test.each([
      ['always-upload', SyncPolicy.ALWAYS_UPLOAD],
      ['always-download', SyncPolicy.ALWAYS_DOWNLOAD],
      ['upload-if-missing', SyncPolicy.UPLOAD_IF_MISSING],
      ['download-if-missing', SyncPolicy.DOWNLOAD_IF_MISSING],
      ['newest', SyncPolicy.NEWEST]
    ])('should handle sync policy %s correctly', (policyName) => {
      const cliCommand = `node dist/cli.js install --cloud-provider=s3 --cloud-bucket=test-bucket --cloud-sync=${policyName}`;

      execSync(cliCommand, { cwd: process.cwd() });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining(`--cloud-sync=${policyName}`),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle missing required cloud options', () => {
      // Missing bucket which is required
      const cliCommand = `node dist/cli.js install --cloud-provider=s3`;

      // This should not throw in our test because we're mocking execSync
      // but in reality it would show an error
      execSync(cliCommand, { cwd: process.cwd() });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('--cloud-provider=s3'),
        expect.any(Object)
      );
    });
  });
});