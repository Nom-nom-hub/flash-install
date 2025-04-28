const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { S3Provider } = require('../src/cloud/s3-provider.cjs');

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockImplementation((command) => {
        if (command.constructor.name === 'ListObjectsV2Command') {
          return Promise.resolve({ Contents: [{ Key: 'test/file1.txt' }, { Key: 'test/file2.txt' }] });
        } else if (command.constructor.name === 'HeadObjectCommand') {
          return Promise.resolve({});
        } else if (command.constructor.name === 'GetObjectCommand') {
          return Promise.resolve({
            Body: {
              pipe: jest.fn((writable) => {
                writable.end('test content');
              })
            }
          });
        }
        return Promise.resolve({});
      })
    })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    HeadObjectCommand: jest.fn(),
    ListObjectsV2Command: jest.fn(),
    DeleteObjectCommand: jest.fn()
  };
});

jest.mock('@aws-sdk/lib-storage', () => {
  return {
    Upload: jest.fn().mockImplementation(() => ({
      done: jest.fn().mockResolvedValue({})
    }))
  };
});

// Create temp directory for tests
const TEST_DIR = path.join(os.tmpdir(), 'flash-install-s3-test-' + Date.now());

describe('S3Provider', () => {
  beforeAll(async () => {
    await fs.ensureDir(TEST_DIR);
    // Create a test file
    await fs.writeFile(path.join(TEST_DIR, 'test-file.txt'), 'This is a test file');
  });

  afterAll(async () => {
    await fs.remove(TEST_DIR);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with valid config', async () => {
      const provider = new S3Provider({
        type: 's3',
        bucket: 'test-bucket',
        region: 'us-east-1'
      });

      await provider.init();
      // No error means success
    });

    test('should initialize with custom endpoint', async () => {
      const provider = new S3Provider({
        type: 's3',
        bucket: 'test-bucket',
        region: 'us-east-1',
        endpoint: 'https://custom-s3.example.com'
      });

      await provider.init();
      // No error means success
    });

    test('should initialize with credentials', async () => {
      const provider = new S3Provider({
        type: 's3',
        bucket: 'test-bucket',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret'
        }
      });

      await provider.init();
      // No error means success
    });
  });

  describe('File Operations', () => {
    let provider;

    beforeEach(async () => {
      provider = new S3Provider({
        type: 's3',
        bucket: 'test-bucket',
        region: 'us-east-1'
      });

      await provider.init();
    });

    test('should upload a file', async () => {
      const localPath = path.join(TEST_DIR, 'test-file.txt');
      const remotePath = 'test/test-file.txt';

      await provider.uploadFile(localPath, remotePath);
      // No error means success
    });

    test('should download a file', async () => {
      const localPath = path.join(TEST_DIR, 'downloaded-file.txt');
      const remotePath = 'test/test-file.txt';

      await provider.downloadFile(remotePath, localPath);
      // No error means success
    });

    test('should check if a file exists', async () => {
      const remotePath = 'test/test-file.txt';

      const exists = await provider.fileExists(remotePath);
      expect(exists).toBe(true);
    });

    test('should list files with a prefix', async () => {
      const files = await provider.listFiles('test/');
      expect(files).toHaveLength(2);
      expect(files).toContain('test/file1.txt');
      expect(files).toContain('test/file2.txt');
    });

    test('should delete a file', async () => {
      const remotePath = 'test/test-file.txt';

      await provider.deleteFile(remotePath);
      // No error means success
    });
  });

  describe('Error Handling', () => {
    let provider;

    beforeEach(async () => {
      provider = new S3Provider({
        type: 's3',
        bucket: 'test-bucket',
        region: 'us-east-1'
      });

      await provider.init();
    });

    test('should handle upload errors', async () => {
      // Mock S3Client to throw an error
      const originalSend = provider['client'].send;
      provider['client'].send = jest.fn().mockRejectedValue(new Error('Upload failed'));

      const localPath = path.join(TEST_DIR, 'test-file.txt');
      const remotePath = 'test/test-file.txt';

      await expect(provider.uploadFile(localPath, remotePath)).rejects.toThrow('Upload failed');

      // Restore original implementation
      provider['client'].send = originalSend;
    });

    test('should handle download errors', async () => {
      // Mock S3Client to throw an error
      const originalSend = provider['client'].send;
      provider['client'].send = jest.fn().mockRejectedValue(new Error('Download failed'));

      const localPath = path.join(TEST_DIR, 'downloaded-file.txt');
      const remotePath = 'test/test-file.txt';

      await expect(provider.downloadFile(remotePath, localPath)).rejects.toThrow('Download failed');

      // Restore original implementation
      provider['client'].send = originalSend;
    });

    test('should handle fileExists errors gracefully', async () => {
      // Mock S3Client to throw an error
      const originalSend = provider['client'].send;
      provider['client'].send = jest.fn().mockRejectedValue(new Error('Head request failed'));

      const remotePath = 'test/test-file.txt';

      const exists = await provider.fileExists(remotePath);
      expect(exists).toBe(false); // Should return false instead of throwing

      // Restore original implementation
      provider['client'].send = originalSend;
    });
  });
});