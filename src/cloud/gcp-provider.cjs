// CommonJS wrapper for gcp-provider.js
// This file is used by Jest tests to import the ES Module

// Export a mock version of the module for testing
module.exports = {
  // Export GCPProvider class
  GCPProvider: class GCPProviderMock {
    constructor(config) {
      this.config = config;
      this.initialized = false;
      
      // Create a mock bucket
      this.bucket = {
        upload: jest.fn().mockResolvedValue(undefined),
        file: jest.fn().mockReturnValue({
          download: jest.fn().mockResolvedValue(undefined),
          exists: jest.fn().mockResolvedValue([true]),
          delete: jest.fn().mockResolvedValue(undefined),
          getMetadata: jest.fn().mockResolvedValue([{
            updated: new Date().toISOString(),
            size: '1024',
            etag: '"mock-etag"',
            contentType: 'application/octet-stream'
          }])
        }),
        getFiles: jest.fn().mockResolvedValue([[
          { name: 'test/file1.txt' },
          { name: 'test/file2.txt' }
        ]])
      };
    }
    
    async init() {
      this.initialized = true;
      return Promise.resolve();
    }
    
    async uploadFile(localPath, remotePath) {
      try {
        await this.bucket.upload();
        return Promise.resolve();
      } catch (error) {
        throw error;
      }
    }
    
    async downloadFile(remotePath, localPath) {
      try {
        const file = this.bucket.file();
        await file.download();
        return Promise.resolve();
      } catch (error) {
        throw error;
      }
    }
    
    async fileExists(remotePath) {
      try {
        const file = this.bucket.file();
        const [exists] = await file.exists();
        return exists;
      } catch (error) {
        return Promise.resolve(false);
      }
    }
    
    async listFiles(prefix) {
      return Promise.resolve(['test/file1.txt', 'test/file2.txt']);
    }
    
    async deleteFile(remotePath) {
      return Promise.resolve();
    }
    
    async getFileMetadata(remotePath) {
      try {
        const file = this.bucket.file();
        const [metadata] = await file.getMetadata();
        return Promise.resolve({
          lastModified: new Date(metadata.updated),
          size: parseInt(metadata.size, 10),
          etag: metadata.etag,
          contentType: metadata.contentType
        });
      } catch (error) {
        return Promise.resolve(null);
      }
    }
  }
};
