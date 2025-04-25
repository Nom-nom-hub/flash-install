---
layout: default
title: Architecture
nav_order: 8
permalink: /docs/architecture
---

# Architecture
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

flash-install is designed with a modular architecture that separates concerns and allows for easy extension. This document provides an overview of the architecture and how the different components interact.

## Core Components

### Command-Line Interface (CLI)

The CLI is the entry point for users. It parses command-line arguments and options, and delegates to the appropriate components based on the command.

Key files:
- `src/cli.ts`: Main CLI implementation
- `src/cli-direct.ts`: Direct mode CLI implementation
- `src/bin/flash-direct.ts`: Entry point for the direct mode CLI

### Installation Manager

The Installation Manager is responsible for installing dependencies. It coordinates the process of resolving dependencies, checking the cache, and installing packages.

Key files:
- `src/install.ts`: Installation logic

### Snapshot Manager

The Snapshot Manager handles creating and restoring snapshots of the `node_modules` directory.

Key files:
- `src/snapshot.ts`: Snapshot creation and restoration logic

### Cache Manager

The Cache Manager is responsible for maintaining the global cache of packages.

Key files:
- `src/cache.ts`: Cache management logic

### Plugin System

The Plugin System allows for extending flash-install's functionality through plugins.

Key files:
- `src/plugin.ts`: Plugin system implementation

## Data Flow

1. User invokes a command through the CLI
2. CLI parses arguments and options
3. CLI delegates to the appropriate component
4. Component performs its task, potentially interacting with other components
5. Results are reported back to the user

## Dependency Resolution

flash-install uses the following process to resolve dependencies:

1. Parse the lock file (package-lock.json, yarn.lock, or pnpm-lock.yaml)
2. Extract the exact versions of all dependencies
3. Check if the dependencies are in the cache
4. If not, download the dependencies from the registry
5. Install the dependencies to the `node_modules` directory

## Caching Strategy

flash-install uses a deterministic caching strategy:

1. Each package is stored in the cache with a path based on its name, version, and integrity hash
2. When installing dependencies, flash-install checks if the package is already in the cache
3. If it is, flash-install creates a hard link to the cached package instead of downloading it again
4. This saves both time and disk space

## Snapshot Format

flash-install supports multiple snapshot formats:

- `.tar.gz`: Default format, good balance of compression and speed
- `.tar`: Faster to create and restore, but larger file size
- `.zip`: Better compatibility with some systems

The snapshot file contains:
1. The entire `node_modules` directory
2. Metadata about the snapshot, including the package.json and lock file hashes

## Plugin Architecture

Plugins can hook into various stages of the flash-install process:

1. Plugins are registered with the Plugin Manager
2. Before each operation, the Plugin Manager calls the appropriate hooks on all registered plugins
3. Plugins can modify the behavior of flash-install or perform additional tasks

## Performance Optimizations

flash-install includes several performance optimizations:

1. **Parallel Operations**: Dependencies are installed in parallel using worker threads
2. **Hard Links**: Cached packages are hard-linked to save disk space and reduce I/O
3. **Native Commands**: Where possible, flash-install uses native commands (e.g., tar) for better performance
4. **Incremental Updates**: When syncing dependencies, only changed packages are updated

## Error Handling

flash-install uses a robust error handling strategy:

1. Errors are caught and reported with meaningful messages
2. When possible, flash-install attempts to recover from errors
3. In case of critical errors, flash-install provides clear instructions on how to resolve the issue

## Future Directions

The modular architecture of flash-install allows for easy extension and improvement. Some potential future directions include:

1. **Better Monorepo Support**: Improved handling of workspaces and monorepos
2. **More Package Manager Integrations**: Support for more package managers
3. **Enhanced Plugin System**: More hooks and capabilities for plugins
4. **Cloud Caching**: Integration with cloud storage for sharing caches across machines
5. **Dependency Analysis**: Tools for analyzing and optimizing dependencies
