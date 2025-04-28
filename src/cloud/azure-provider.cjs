// CommonJS wrapper for azure-provider.js
// This file is used by Jest tests to import the ES Module

// Export a mock version of the module for testing
module.exports = {
  // Export AzureProvider class
  AzureProvider: class AzureProviderMock {
    constructor(config) {
      this.config = config;
      this.initialized = false;
      
      // Create a mock client
      this.containerClient = {
        listBlobsFlat: jest.fn().mockReturnValue({
          next: jest.fn().mockResolvedValue({ done: true })
        }),
        getBlockBlobClient: jest.fn().mockReturnValue({
          uploadFile: jest.fn().mockResolvedValue(undefined),
          downloadToFile: jest.fn().mockResolvedValue(undefined),
          exists: jest.fn().mockResolvedValue(true),
          delete: jest.fn().mockResolvedValue(undefined),
          getProperties: jest.fn().mockResolvedValue({
            lastModified: new Date(),
            contentLength: 1024,
            etag: '"mock-etag"',
            contentType: 'application/octet-stream'
          })
        })
      };
    }
    
    async init() {
      this.initialized = true;
      return Promise.resolve();
    }
    
    async uploadFile(localPath, remotePath) {
      try {
        const blockBlobClient = this.containerClient.getBlockBlobClient();
        await blockBlobClient.uploadFile();
        return Promise.resolve();
      } catch (error) {
        throw error;
      }
    }
    
    async downloadFile(remotePath, localPath) {
      try {
        const blockBlobClient = this.containerClient.getBlockBlobClient();
        await blockBlobClient.downloadToFile();
        return Promise.resolve();
      } catch (error) {
        throw error;
      }
    }
    
    async fileExists(remotePath) {
      try {
        const blockBlobClient = this.containerClient.getBlockBlobClient();
        return await blockBlobClient.exists();
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
        const blockBlobClient = this.containerClient.getBlockBlobClient();
        const properties = await blockBlobClient.getProperties();
        return Promise.resolve({
          lastModified: properties.lastModified,
          size: properties.contentLength,
          etag: properties.etag,
          contentType: properties.contentType
        });
      } catch (error) {
        return Promise.resolve(null);
      }
    }
  }
};
