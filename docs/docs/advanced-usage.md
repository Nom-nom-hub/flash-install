---
layout: default
title: Advanced Usage
nav_order: 3
permalink: /docs/advanced-usage
---

# Advanced Usage
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Cache Management

flash-install maintains a global cache to speed up installations across different projects.

### View Cache Information

```bash
flash-install cache
```

This command displays information about the global cache, including its location, size, and number of packages.

### Verify Cache Integrity

```bash
flash-install cache --verify
```

This command checks the integrity of all packages in the cache against their checksums.

### Optimize Cache Storage

```bash
flash-install cache --optimize
```

This command optimizes the cache storage by removing duplicate files and compressing the cache.

### Clean Global Cache

```bash
flash-install clean --global
```

This command removes all packages from the global cache.

## Offline Mode

flash-install can work completely offline if you have a cache or snapshot available:

```bash
flash-install --offline
```

This is useful when you're working without an internet connection or want to ensure deterministic builds.

## Package Manager Integration

flash-install automatically detects your package manager based on lock files, but you can also specify it explicitly:

```bash
flash-install --package-manager npm
flash-install --package-manager yarn
flash-install --package-manager pnpm
```

## Sync Dependencies

Efficiently update dependencies without a full reinstall:

```bash
flash-install sync
```

This command updates only the dependencies that have changed, which is much faster than a full reinstall.

Options for sync:

- `-f, --force`: Force sync even if dependencies are up to date
- `--skip-snapshot`: Skip creating snapshot after sync
- `--skip-cache`: Skip using cache during sync

## Custom Snapshot Formats

flash-install supports different snapshot formats:

```bash
# Create a zip snapshot
flash-install snapshot --format zip

# Create a tar snapshot
flash-install snapshot --format tar

# Create a tar.gz snapshot (default)
flash-install snapshot --format tar.gz
```

You can also specify the compression level:

```bash
# No compression
flash-install snapshot --compression 0

# Maximum compression
flash-install snapshot --compression 9
```

## Custom Snapshot Location

You can specify a custom location for your snapshot:

```bash
flash-install snapshot --output /path/to/snapshot.tar.gz
```

And restore from a custom location:

```bash
flash-install restore --snapshot /path/to/snapshot.tar.gz
```

## Skipping Dev Dependencies

For production builds, you can skip dev dependencies:

```bash
flash-install --no-dev
```

## Skipping Postinstall Scripts

If you want to skip postinstall scripts:

```bash
flash-install --skip-postinstall
```

## Verbose Logging

For more detailed output:

```bash
flash-install --verbose
```

## Quiet Mode

To suppress all output except errors:

```bash
flash-install --quiet
```

## Environment Variables

flash-install respects the following environment variables:

- `FLASH_INSTALL_CACHE_DIR`: Custom location for the global cache
- `FLASH_INSTALL_OFFLINE`: Set to `true` to enable offline mode
- `FLASH_INSTALL_CONCURRENCY`: Number of concurrent installations
- `FLASH_INSTALL_PACKAGE_MANAGER`: Package manager to use (npm, yarn, pnpm)
- `FLASH_INSTALL_NO_DEV`: Set to `true` to skip dev dependencies
- `FLASH_INSTALL_SKIP_POSTINSTALL`: Set to `true` to skip postinstall scripts
- `FLASH_INSTALL_VERBOSE`: Set to `true` to enable verbose logging
- `FLASH_INSTALL_QUIET`: Set to `true` to enable quiet mode
