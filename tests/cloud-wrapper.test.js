const { SyncPolicy } = require('../src/cloud/cloud-cache.cjs');

describe('Cloud Cache CommonJS Wrapper', () => {
  test('SyncPolicy enum is properly exported', () => {
    expect(SyncPolicy.ALWAYS_UPLOAD).toBe('always-upload');
    expect(SyncPolicy.ALWAYS_DOWNLOAD).toBe('always-download');
    expect(SyncPolicy.UPLOAD_IF_MISSING).toBe('upload-if-missing');
    expect(SyncPolicy.DOWNLOAD_IF_MISSING).toBe('download-if-missing');
    expect(SyncPolicy.NEWEST).toBe('newest');
  });
});
