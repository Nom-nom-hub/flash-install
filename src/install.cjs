// CommonJS wrapper for install.js
// This file is used by Jest tests to import the ES Module

// Get the cache mock to call its methods
const cacheMock = require('./cache.cjs');

// Export a mock version of the module for testing
module.exports = {
  // Export PackageManager enum
  PackageManager: {
    NPM: 'npm',
    YARN: 'yarn',
    PNPM: 'pnpm',
    BUN: 'bun'
  },

  // Export Installer class
  Installer: class InstallerMock {
    constructor(options) {
      this.options = options;
      this.initialized = false;
    }

    async init() {
      this.initialized = true;

      // Call the cache.init method with the cloud config
      if (this.options && this.options.cloud) {
        await cacheMock.cache.init({ cloud: this.options.cloud });
      } else {
        await cacheMock.cache.init();
      }

      return Promise.resolve();
    }

    async install(projectDir) {
      return Promise.resolve(true);
    }

    async parseLockfile(projectDir) {
      return Promise.resolve({
        'lodash': '4.17.21',
        'chalk': '4.1.2'
      });
    }
  }
};
