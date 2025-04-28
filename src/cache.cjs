// CommonJS wrapper for cache.js
// This file is used by Jest tests to import the ES Module

// Export a mock version of the module for testing
module.exports = {
  // Export cache instance
  cache: {
    init: jest.fn().mockResolvedValue(undefined),
    hasPackage: jest.fn().mockResolvedValue(false),
    addPackage: jest.fn().mockResolvedValue(true),
    restorePackage: jest.fn().mockResolvedValue(true),
    hasDependencyTree: jest.fn().mockResolvedValue(false),
    addDependencyTree: jest.fn().mockResolvedValue(true),
    restoreDependencyTree: jest.fn().mockResolvedValue(true)
  }
};
