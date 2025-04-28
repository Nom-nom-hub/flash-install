# flash-install v1.7.0 - Package Manager Integration

## Overview

This release adds comprehensive support for multiple package managers, including the fast-growing Bun package manager. It enhances the integration with npm, yarn, and pnpm, and adds new commands for managing package managers in your projects.

## Major New Features

### Package Manager Integration

- **Bun Support**: Full support for the Bun package manager, including lockfile parsing and command integration
- **Package Manager Commands**: New `pm` command group for managing package managers
  - `flash-install pm use <manager>`: Switch to a different package manager
  - `flash-install pm info`: Show information about available package managers
- **Enhanced Registry Support**: Improved handling of custom registries for all package managers
- **Automatic Fallback**: Graceful fallback to available package managers if the detected one isn't installed
- **Package Manager Detection**: Better detection of the project's package manager based on lockfiles

## How to Use

### Switch Package Managers

```bash
# Switch to Bun
flash-install pm use bun

# Switch to npm
flash-install pm use npm

# Switch to yarn
flash-install pm use yarn

# Switch to pnpm
flash-install pm use pnpm
```

### View Package Manager Information

```bash
flash-install pm info
```

## Previously Added Features

- **Interactive CLI Mode**: Text User Interface (TUI) for managing dependencies
- **Enhanced Error Handling**: Comprehensive error categorization and recovery strategies
- **Memory Optimization**: Adaptive batch processing and intelligent garbage collection
- **Cloud Cache Optimization**: Chunked transfers and retry mechanisms
- **Enhanced Plugin System**: Additional lifecycle hooks and plugin discovery

## Installation

```bash
npm install -g @flash-install/cli@1.7.0
```

## Upgrade from Previous Versions

```bash
npm update -g @flash-install/cli
```

## What's Next?

We've now completed all the medium priority features in our development plan! The next steps will focus on the remaining low priority features:
- Additional cloud providers and regions
- Dependency visualization improvements
- Performance optimizations for large monorepos

Thank you to all contributors and users who have provided feedback and support!
