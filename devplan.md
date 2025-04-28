# flash-install Development Plan

This document outlines the planned features and improvements for upcoming releases of flash-install.

## Next Release (v1.x.x)

### High Priority Features

- [x] **Improved Monorepo Support**
  - Enhanced workspace detection
  - Parallel installation across workspaces
  - Intelligent dependency hoisting

- [x] **Performance Optimizations**
  - Reduce memory usage during large installations
  - Optimize cache storage format
  - Implement streaming extraction for faster snapshot restoration

- [x] **Enhanced Offline Mode**
  - Better detection of network availability
  - Fallback strategies for partial offline scenarios
  - Warning system for outdated dependencies when working offline

### Medium Priority Features

- [x] **Dependency Analysis Tools**
  - Visualization of dependency graph
  - Detection of duplicate dependencies
  - Size analysis and reporting
  - Multiple output formats (tree, DOT, Markdown)
  - Customizable visualization options

- [x] **Cloud Cache Integration**
  - [x] Support for storing/retrieving cache from S3-compatible storage
  - [x] Team-shared caching for improved CI/CD performance
  - [x] Configurable cache synchronization policies

- [x] **Enhanced Cloud Cache Features**
  - [x] Implement the NEWEST sync policy
  - [x] Add support for additional cloud providers (Azure, GCP)
  - [x] Add cache invalidation based on lockfile changes
  - [x] Implement a sync command for manual cache synchronization
  - [x] Add team permissions and access controls

- [ ] **Enhanced Plugin System**
  - Additional lifecycle hooks
  - Plugin discovery and auto-loading
  - Official plugin registry

### Low Priority Features

- [ ] **Interactive CLI Mode**
  - TUI (Text User Interface) for managing dependencies
  - Interactive snapshot management
  - Visual dependency browser

- [ ] **Integration with Package Managers**
  - Deeper integration with npm, yarn, and pnpm
  - Support for Bun package manager
  - Custom registry support improvements

## Future Considerations

- **Language Support Beyond JavaScript**
  - Experimental support for other package ecosystems (Python, Ruby, etc.)

- **Enterprise Features**
  - Role-based access control for shared caches
  - Compliance reporting for dependencies
  - Private registry integration improvements

## Contributing

We welcome community contributions to help implement these features! Please check our [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on how to contribute.

If you'd like to suggest additional features or prioritize existing ones, please open an issue on our [GitHub repository](https://github.com/Nom-nom-hub/flash-install/issues).