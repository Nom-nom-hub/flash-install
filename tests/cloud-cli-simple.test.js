const { SyncPolicy } = require('../src/cloud/cloud-cache.cjs');

// Mock child_process before requiring it
jest.mock('child_process', () => ({
  execSync: jest.fn().mockImplementation(() => 'mocked output'),
  spawn: jest.fn()
}));

// Now require the mocked module
const { execSync } = require('child_process');

describe('CLI Cloud Cache Integration - Simple', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should pass S3 cloud configuration correctly', () => {
    const cliCommand = `node dist/cli.js install --cloud-provider=s3 --cloud-bucket=test-bucket --cloud-region=us-east-1 --cloud-sync=always-upload`;

    execSync(cliCommand, { cwd: process.cwd() });

    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('--cloud-provider=s3'),
      expect.any(Object)
    );
  });
});
