// CommonJS wrapper for provider-factory.js
// This file is used by Jest tests to import the ES Module

// Export a mock version of the module for testing
module.exports = {
  // Export cloudProviderFactory
  cloudProviderFactory: {
    createProvider: jest.fn().mockImplementation((config) => {
      // Create a mock provider based on the type
      switch (config.type) {
        case 's3':
          const { S3Provider } = require('./s3-provider.cjs');
          return new S3Provider(config);
        case 'azure':
          const { AzureProvider } = require('./azure-provider.cjs');
          return new AzureProvider(config);
        case 'gcp':
          const { GCPProvider } = require('./gcp-provider.cjs');
          return new GCPProvider(config);
        default:
          // Default mock provider
          return {
            init: jest.fn().mockResolvedValue(undefined),
            uploadFile: jest.fn().mockResolvedValue(undefined),
            downloadFile: jest.fn().mockResolvedValue(undefined),
            fileExists: jest.fn().mockResolvedValue(false),
            listFiles: jest.fn().mockResolvedValue([]),
            deleteFile: jest.fn().mockResolvedValue(undefined),
            getFileMetadata: jest.fn().mockResolvedValue(null)
          };
      }
    })
  }
};
