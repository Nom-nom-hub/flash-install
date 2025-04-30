---
layout: default
title: Getting Started
nav_order: 2
permalink: /docs/getting-started
---

# Getting Started with flash-install
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Installation

Install flash-install globally using npm:

```bash
npm install -g @flash-install/cli
```

This will make the `flash-install`, `flash-direct`, and `flash-install-direct` commands available globally on your system.

## CLI Interface

The `flash-install` command provides a reliable and efficient interface for all your dependency management needs. It uses a direct implementation that avoids compatibility issues with terminal UI libraries.

## Basic Usage

### Installing Dependencies

Replace your regular `npm install` command with `flash-install`:

```bash
# Standard installation
flash-install install

# Or simply
flash-install
```

flash-install will automatically detect your package manager (npm, yarn, or pnpm) based on the lock files in your project.

### Creating a Snapshot

Create a `.flashpack` snapshot of your `node_modules` directory:

```bash
flash-install snapshot

# Skip adding to global cache
flash-install snapshot --no-cache

# Set a custom timeout for the cache operation (in seconds)
flash-install snapshot --cache-timeout 10
```

Snapshots allow for extremely fast restoration of dependencies, especially useful in CI/CD environments or when switching between branches.

### Restoring from a Snapshot

Restore your `node_modules` from a `.flashpack` snapshot:

```bash
flash-install restore
```

This is much faster than a regular installation, as it directly extracts the dependencies from the snapshot file.

### Cleaning

#### Clean Everything

Remove both `node_modules` and local `.flashpack` file:

```bash
flash-install clean
```

**Note:** The clean command removes both the node_modules directory and the snapshot file. You'll need to create a new snapshot after cleaning if you want to use the restore command later.

#### Clean Only Node Modules

Remove only the `node_modules` directory (preserves snapshot):

```bash
flash-install clean-modules
```

This is useful when you want to free up disk space but keep the snapshot for quick restoration later.

#### Clean Only Snapshot

Remove only the snapshot file (preserves node_modules):

```bash
flash-install clean-snapshot
```

This is useful when you want to create a fresh snapshot without removing your installed dependencies.

> **Note:** The `clean-modules` and `clean-snapshot` commands are now available in both the main CLI interface and the direct CLI interface.

## Command Line Options

### Installation Options

- `-o, --offline`: Use offline mode (requires cache or snapshot)
- `--no-cache`: Disable cache usage
- `-c, --concurrency <number>`: Number of concurrent installations
- `-p, --package-manager <manager>`: Package manager to use (npm, yarn, pnpm)
- `--no-dev`: Skip dev dependencies
- `--skip-postinstall`: Skip postinstall scripts
- `-v, --verbose`: Enable verbose logging
- `-q, --quiet`: Suppress all output except errors

### Snapshot Options

- `-f, --format <format>`: Snapshot format (zip, tar, tar.gz)
- `-c, --compression <level>`: Compression level (0-9)
- `-o, --output <path>`: Custom output path for snapshot
- `-t, --cache-timeout <seconds>`: Timeout for cache operation in seconds

### Restore Options

- `-s, --snapshot <path>`: Path to snapshot file

## Next Steps

- Learn about [Advanced Usage]({{ site.baseurl }}/docs/advanced-usage)
- Explore the [Plugin System]({{ site.baseurl }}/docs/plugins)
- Check out [Performance Tips]({{ site.baseurl }}/docs/performance-tips)
