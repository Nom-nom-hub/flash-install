<p align="center">
  <img src="assets/logo.png" alt="flash-install logo" width="200" height="200">
</p>

<h1 align="center">⚡ flash-install</h1>
<p align="center">Blazingly fast package installation for Node.js</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen.svg)](https://nodejs.org/)
[![npm version](https://img.shields.io/badge/npm-v1.0.0-blue.svg)](https://www.npmjs.com/package/flash-install)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/yourusername/flash-install/pulls)

A fast, drop-in replacement for `npm install`, focused on drastically speeding up Node.js dependency installation through deterministic caching, parallel operations, and `.flashpack` archive snapshotting.

## Features

- **Blazing Fast**: Installs dependencies from cache when available, avoiding network requests
- **Deterministic Caching**: Uses hash-based paths for deduplication and hardlinks to minimize disk usage
- **Parallel Operations**: Installs packages in parallel using Node.js worker threads
- **Snapshot Support**: Creates and restores `.flashpack` archives for instant dependency restoration
- **Package Manager Compatibility**: Works with npm, yarn, and pnpm projects
- **Offline Mode**: Install dependencies without internet connection using cache or snapshots
- **Checksum Validation**: Verifies package integrity against npm registry checksums
- **Snapshot Fingerprinting**: Auto-invalidates snapshots when lockfiles change
- **Sync Command**: Efficiently updates dependencies without full reinstallation
- **Plugin System**: Extensible architecture with lifecycle hooks

## Installation

```bash
npm install -g flash-install
```

## Usage

### Basic Installation

Replace your regular `npm install` command with `flash-install`:

```bash
flash-install
```

### Creating a Snapshot

Create a `.flashpack` snapshot of your `node_modules` directory:

```bash
flash-install snapshot
```

### Restoring from a Snapshot

Restore your `node_modules` from a `.flashpack` snapshot:

```bash
flash-install restore
```

### Cleaning

Remove `node_modules` and local `.flashpack` file:

```bash
flash-install clean
```

Clean the global cache:

```bash
flash-install clean --global
```

### Sync Dependencies

Efficiently update dependencies without a full reinstall:

```bash
flash-install sync
```

### Cache Information

View information about the global cache:

```bash
flash-install cache
```

Verify cache integrity:

```bash
flash-install cache --verify
```

Optimize cache storage:

```bash
flash-install cache --optimize
```

### Plugin Management

List installed plugins:

```bash
flash-install plugin list
```

Add a plugin:

```bash
flash-install plugin add <path-to-plugin>
```

Remove a plugin:

```bash
flash-install plugin remove <plugin-name>
```

## Options

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

### Restore Options

- `-s, --snapshot <path>`: Path to snapshot file

### Clean Options

- `-g, --global`: Clean global cache instead of project
- `-a, --all`: Clean both project and global cache
- `--cache-max-age <days>`: Maximum age for cache entries in days

### Sync Options

- `-f, --force`: Force sync even if dependencies are up to date
- `--skip-snapshot`: Skip creating snapshot after sync
- `--skip-cache`: Skip using cache during sync

### Cache Options

- `--verify`: Verify cache integrity
- `--optimize`: Optimize cache storage

### Plugin Options

- `add <path>`: Add a plugin from a path
- `remove <name>`: Remove a plugin by name
- `list`: List all installed plugins

## How It Works

1. **Dependency Resolution**: Parses lockfiles to determine exact dependencies
2. **Cache Check**: Checks if dependencies are in the global cache
3. **Snapshot Check**: Checks if a valid `.flashpack` snapshot exists
4. **Installation**: If no cache or snapshot is available, installs dependencies using the package manager
5. **Caching**: Adds newly installed packages to the cache
6. **Integrity Verification**: Validates package checksums against npm registry
7. **Snapshotting**: Creates a `.flashpack` snapshot with fingerprinting for future use
8. **Plugin Execution**: Runs plugins at various lifecycle hooks

## Plugin System

flash-install includes a powerful plugin system that allows extending functionality through lifecycle hooks:

- **preInstall**: Before installation begins
- **postInstall**: After installation completes
- **preSnapshot**: Before creating a snapshot
- **postSnapshot**: After creating a snapshot
- **preRestore**: Before restoring from a snapshot
- **postRestore**: After restoring from a snapshot
- **preSync**: Before syncing dependencies
- **postSync**: After syncing dependencies
- **preClean**: Before cleaning
- **postClean**: After cleaning

Plugins can be used for tasks like:
- TypeScript declaration generation
- Security scanning
- License compliance checking
- Dependency visualization
- Custom build steps

## Performance Comparison

| Scenario | npm install | flash-install | Speedup |
|----------|------------|---------------|---------|
| First install (small project) | 30-60s | 10-15s | 3-4x |
| First install (large project) | 3-5min | 1-2min | 2-3x |
| Subsequent install (from cache) | 30-60s | 5-10s | 6-10x |
| Subsequent install (from snapshot) | 30-60s | 1-3s | 20-30x |
| CI/CD environment | 1-3min | 5-15s | 10-20x |

## Benefits

- **Time Savings**: Dramatically reduces installation time for repeated builds
- **Bandwidth Savings**: Minimizes network usage by using cached packages
- **Disk Space Efficiency**: Uses hardlinks to avoid duplicating files
- **CI/CD Optimization**: Perfect for continuous integration environments
- **Developer Experience**: Instant dependency restoration when switching branches
- **Offline Development**: Work without internet connection using cache or snapshots

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Acknowledgements

- Inspired by the speed of [Bun](https://bun.sh/), the reliability of [Yarn](https://yarnpkg.com/), and the efficiency of [PNPM](https://pnpm.io/)
- Thanks to all the open-source projects that made this possible
