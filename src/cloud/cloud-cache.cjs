// CommonJS wrapper for cloud-cache.js
// This file is used by Jest tests to import the ES Module

// Export a mock version of the module for testing
module.exports = {
  // Export SyncPolicy enum
  SyncPolicy: {
    ALWAYS_UPLOAD: "always-upload",
    ALWAYS_DOWNLOAD: "always-download",
    UPLOAD_IF_MISSING: "upload-if-missing",
    DOWNLOAD_IF_MISSING: "download-if-missing",
    NEWEST: "newest"
  },

  // Export CloudCache class
  CloudCache: class CloudCacheMock {
    constructor() {
      this.initialized = false;
      this.config = null;
      this.provider = null;
    }

    async init(config) {
      this.config = config;
      this.initialized = true;

      if (config && config.enabled) {
        this.provider = {
          uploadFile: jest.fn().mockResolvedValue(undefined),
          downloadFile: jest.fn().mockResolvedValue(undefined),
          fileExists: jest.fn().mockResolvedValue(false),
          listFiles: jest.fn().mockResolvedValue([]),
          deleteFile: jest.fn().mockResolvedValue(undefined)
        };
      }

      return Promise.resolve();
    }

    isInitialized() {
      return this.initialized;
    }

    isEnabled() {
      return this.config?.enabled || false;
    }

    getProvider() {
      if (!this.provider) {
        throw new Error('Cloud provider not initialized');
      }
      return this.provider;
    }

    getConfig() {
      return this.config;
    }

    async syncPackage(name, version, localPath) {
      if (!this.initialized || !this.provider || !this.config || !this.config.enabled) {
        return false;
      }
      return true;
    }

    async uploadPackage(name, version, localPath) {
      if (!this.initialized || !this.provider || !this.config || !this.config.enabled) {
        return false;
      }
      return true;
    }

    async downloadPackage(name, version, localPath) {
      if (!this.initialized || !this.provider || !this.config || !this.config.enabled) {
        return false;
      }
      return true;
    }

    async syncDependencyTree(dependencies, localPath) {
      if (!this.initialized || !this.provider || !this.config || !this.config.enabled) {
        return false;
      }
      return true;
    }

    async uploadDependencyTree(dependencies, localPath) {
      if (!this.initialized || !this.provider || !this.config || !this.config.enabled) {
        return false;
      }
      return true;
    }

    async downloadDependencyTree(dependencies, localPath) {
      if (!this.initialized || !this.provider || !this.config || !this.config.enabled) {
        return false;
      }
      return true;
    }

    getPackagePath(name, version) {
      return `packages/${name}/${version}.tgz`;
    }

    getDependencyTreePath(dependencies) {
      return `trees/hash/tree.tgz`;
    }
  },

  // Export cloudCache instance
  cloudCache: {
    init: jest.fn().mockResolvedValue(undefined),
    isInitialized: jest.fn().mockReturnValue(true),
    isEnabled: jest.fn().mockReturnValue(true),
    getProvider: jest.fn().mockReturnValue({
      uploadFile: jest.fn().mockResolvedValue(undefined),
      downloadFile: jest.fn().mockResolvedValue(undefined),
      fileExists: jest.fn().mockResolvedValue(false),
      listFiles: jest.fn().mockResolvedValue([]),
      deleteFile: jest.fn().mockResolvedValue(undefined)
    }),
    syncPackage: jest.fn().mockResolvedValue(true),
    uploadPackage: jest.fn().mockResolvedValue(true),
    downloadPackage: jest.fn().mockResolvedValue(true),
    syncDependencyTree: jest.fn().mockResolvedValue(true),
    uploadDependencyTree: jest.fn().mockResolvedValue(true),
    downloadDependencyTree: jest.fn().mockResolvedValue(true),
    getPackagePath: jest.fn().mockReturnValue('test-package-path'),
    getDependencyTreePath: jest.fn().mockReturnValue('test-tree-path')
  }
};
