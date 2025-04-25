---
layout: default
title: FAQ
nav_order: 6
permalink: /docs/faq
---

# Frequently Asked Questions
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## General Questions

### What is flash-install?

flash-install is a fast, drop-in replacement for `npm install`, focused on drastically speeding up Node.js dependency installation through deterministic caching, parallel operations, and `.flashpack` archive snapshotting.

### How does flash-install compare to npm, yarn, and pnpm?

flash-install is not a package manager itself, but rather a tool that works with your existing package manager to speed up installations. It's compatible with npm, yarn, and pnpm projects.

Compared to these package managers:
- **npm**: flash-install is significantly faster, especially for repeated installations
- **yarn**: flash-install offers similar performance for first installations, but is faster for repeated installations thanks to snapshots
- **pnpm**: flash-install's caching approach is similar to pnpm's, but with the added benefit of snapshots

### Is flash-install production-ready?

Yes, flash-install is production-ready and has been tested with a variety of projects. However, as with any tool, it's always a good idea to test it thoroughly with your specific project before using it in production.

## Installation & Compatibility

### Does flash-install work with npm, yarn, and pnpm?

Yes, flash-install is compatible with npm, yarn, and pnpm projects. It automatically detects which package manager you're using based on the lock files in your project.

### What Node.js versions are supported?

flash-install supports Node.js v16 and later.

### Does flash-install work on Windows, macOS, and Linux?

Yes, flash-install works on all major operating systems.

## Features & Usage

### What is a snapshot?

A snapshot is a compressed archive of your `node_modules` directory that can be quickly restored. This is much faster than reinstalling dependencies from scratch, especially for large projects.

### How do I create a snapshot?

```bash
flash-install snapshot
```

### How do I restore from a snapshot?

```bash
flash-install restore
```

### Can I use flash-install offline?

Yes, flash-install can work completely offline if you have a cache or snapshot available:

```bash
flash-install --offline
```

### How does the cache work?

flash-install maintains a global cache of packages that is shared across all your projects. When you install dependencies, flash-install checks if they're already in the cache and uses them if available, avoiding network requests.

### How do I clear the cache?

```bash
flash-install clean --global
```

### Can I use flash-install in CI/CD?

Yes, flash-install is particularly useful in CI/CD environments where you want to speed up builds. You can cache the `.flashpack` snapshot to avoid reinstalling dependencies for each build.

## Troubleshooting

### flash-install is not working with my project. What should I do?

First, make sure you have a valid `package.json` and lock file (package-lock.json, yarn.lock, or pnpm-lock.yaml) in your project. If you're still having issues, try running with the verbose flag:

```bash
flash-install --verbose
```

This will provide more detailed output that can help diagnose the issue.

### I'm getting checksum validation errors. What does this mean?

Checksum validation errors indicate that the packages in your cache or snapshot don't match the expected checksums. This could happen if:

1. The package was updated in the registry but the lock file wasn't updated
2. The cache or snapshot is corrupted

Try clearing the cache and reinstalling:

```bash
flash-install clean --global
flash-install
```

### The restore command is not working. What should I do?

Make sure you have a valid `.flashpack` file in your project directory. If you're using a custom snapshot path, make sure it's correct:

```bash
flash-install restore --snapshot /path/to/snapshot.tar.gz
```

If you're still having issues, try creating a new snapshot:

```bash
flash-install
flash-install snapshot
flash-install restore
```

### How do I report a bug?

If you encounter a bug, please report it on the [GitHub issues page](https://github.com/Nom-nom-hub/flash-install/issues) with the following information:

1. Your operating system and Node.js version
2. The command you were running
3. The error message or unexpected behavior
4. Steps to reproduce the issue
5. If possible, a minimal reproduction repository
