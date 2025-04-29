<p align="center">
  <img src="https://raw.githubusercontent.com/flash-install-cli/flash-install/main/assets/logo.png" alt="flash-install logo" width="200" height="200">
</p>

<h1 align="center">⚡ flash-install</h1>
<p align="center">Blazingly fast package installation for Node.js</p>

<p align="center">
  <a href="https://github.com/flash-install-cli/flash-install/actions/workflows/ci.yml"><img src="https://github.com/flash-install-cli/flash-install/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen.svg" alt="Node.js Version"></a>
  <a href="https://www.npmjs.com/package/@flash-install/cli"><img src="https://img.shields.io/npm/v/@flash-install/cli" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@flash-install/cli"><img src="https://img.shields.io/npm/dm/@flash-install/cli" alt="npm downloads"></a>
  <a href="https://www.npmjs.com/package/@flash-install/cli"><img src="https://img.shields.io/badge/size-362%20kB-blue" alt="Package Size"></a>
  <a href="https://github.com/flash-install-cli/flash-install/graphs/commit-activity"><img src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" alt="Maintenance"></a>
  <a href="https://github.com/flash-install-cli/flash-install/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
  <a href="https://github.com/flash-install-cli/flash-install/stargazers"><img src="https://img.shields.io/github/stars/flash-install-cli/flash-install" alt="GitHub stars"></a>
  <a href="https://github.com/flash-install-cli/flash-install/issues"><img src="https://img.shields.io/github/issues/flash-install-cli/flash-install" alt="GitHub issues"></a>
  <a href="https://github.com/flash-install-cli/flash-install/commits/main"><img src="https://img.shields.io/github/last-commit/flash-install-cli/flash-install" alt="GitHub last commit"></a>
</p>

A fast, drop-in replacement for `npm install`, focused on drastically speeding up Node.js dependency installation through deterministic caching, parallel operations, and `.flashpack` archive snapshotting.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/S6S31E7BC7)

<p align="center">
  <img src="https://img.shields.io/badge/Speed-Up%20to%2030x%20Faster-orange" alt="Speed: Up to 30x Faster">
  <img src="https://img.shields.io/badge/Cache-Deterministic-blue" alt="Cache: Deterministic">
  <img src="https://img.shields.io/badge/Snapshots-Instant%20Restore-green" alt="Snapshots: Instant Restore">
  <img src="https://img.shields.io/badge/Plugins-Extensible-purple" alt="Plugins: Extensible">
  <img src="https://img.shields.io/badge/Cloud-Team%20Sharing-lightblue" alt="Cloud: Team Sharing">
  <img src="https://img.shields.io/badge/Analysis-Dependency%20Insights-yellow" alt="Analysis: Dependency Insights">
</p>

<p align="center">
  <b>Compatible with:</b><br>
  <img src="https://img.shields.io/badge/npm-Compatible-red" alt="npm Compatible">
  <img src="https://img.shields.io/badge/yarn-Compatible-blue" alt="yarn Compatible">
  <img src="https://img.shields.io/badge/pnpm-Compatible-orange" alt="pnpm Compatible">
  <img src="https://img.shields.io/badge/Monorepos-Supported-green" alt="Monorepos Supported">
</p>

## Features

- **Blazing Fast**: Installs dependencies from cache when available, avoiding network requests
- **Deterministic Caching**: Uses hash-based paths for deduplication and hardlinks to minimize disk usage
- **Parallel Operations**: Installs packages in parallel using Node.js worker threads
- **Snapshot Support**: Creates and restores `.flashpack` archives for instant dependency restoration
- **Package Manager Compatibility**: Works with npm, yarn, and pnpm projects
- **Monorepo Support**: Enhanced workspace detection, parallel installation across workspaces, and intelligent dependency hoisting
- **Enhanced Offline Mode**: Install dependencies without internet connection with intelligent network detection and fallback strategies
- **Checksum Validation**: Verifies package integrity against npm registry checksums
- **Snapshot Fingerprinting**: Auto-invalidates snapshots when lockfiles change
- **Sync Command**: Efficiently updates dependencies without full reinstallation
- **Enhanced Plugin System**: Extensible architecture with lifecycle hooks, auto-discovery, and plugin registry
- **Cloud Cache Integration**: Store and retrieve caches from cloud storage (S3, Azure, GCP) with team sharing capabilities
- **Dependency Analysis**: Visualization of dependency graphs, detection of duplicates, and size analysis

## Installation

```bash
npm install -g @flash-install/cli
```

## Usage

### Basic Installation

Replace your regular `npm install` command with `flash-install`:

```bash
# Standard installation
flash-install

# Or use direct mode for better progress reporting
flash-direct
```

### Installing Specific Packages

Install individual packages just like with npm:

```bash
# Install packages
flash-install express react

# Install with specific version
flash-install lodash@4.17.21

# Save to dependencies (default)
flash-install axios --save

# Save to devDependencies
flash-install jest --save-dev

# Save exact version
flash-install typescript@5.0.4 --save-exact
```

### Creating a Snapshot

Create a `.flashpack` snapshot of your `node_modules` directory:

```bash
flash-install snapshot

# Skip adding to global cache
flash-install snapshot --no-cache

# Set a custom timeout for the cache operation (in seconds)
flash-install snapshot --cache-timeout 10
```

### Restoring from a Snapshot

Restore your `node_modules` from a `.flashpack` snapshot:

```bash
flash-install restore
```

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

Clean the global cache:

```bash
flash-install clean --global
```

> **Note:** The `clean-modules` and `clean-snapshot` commands are now available in both the main CLI interface and the direct CLI interface. Previously, they were only available in the direct CLI interface.

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

### Cloud Cache

Synchronize your cache with cloud storage:

```bash
# Sync with default settings (both upload and download)
flash-install cloud-sync --cloud-bucket=your-bucket-name

# Upload only
flash-install cloud-sync --direction=upload --cloud-bucket=your-bucket-name

# Download only
flash-install cloud-sync --direction=download --cloud-bucket=your-bucket-name

# Force synchronization even if files exist
flash-install cloud-sync --force --cloud-bucket=your-bucket-name

# Use a specific cloud provider
flash-install cloud-sync --cloud-provider=azure --cloud-bucket=your-container-name

# Team sharing with access controls
flash-install cloud-sync --team-id=your-team --team-token=your-token --team-access-level=write
```

See the [cloud cache documentation](docs/cloud-cache.md) for more details.

### Dependency Analysis

Flash Install provides tools for analyzing and visualizing dependencies:

```bash
# Analyze dependencies and show statistics
flash-install analyze

# Visualize dependency tree
flash-install deps

# Generate a DOT graph for Graphviz
flash-install deps --format dot --output deps.dot

# Generate a Markdown report
flash-install deps --format markdown --output deps.md
```

See the [dependency analysis documentation](docs/docs/dependency-analysis.md) for more details.

### Network Status

Check network availability and registry status:

```bash
# Check network status
flash-install network
```

### Monorepo Support

Flash Install provides robust support for monorepos and workspaces:

```bash
# Install dependencies with workspace support
flash-install -w

# List all workspace packages
flash-install workspaces

# Install with custom workspace options
flash-install -w --no-hoist --workspace-concurrency 8
```

See the [monorepo documentation](docs/docs/monorepo.md) for more details.

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

### Workspace Options

- `-w, --workspace`: Enable workspace support
- `--no-hoist`: Disable dependency hoisting in workspaces
- `--no-parallel-workspaces`: Disable parallel installation of workspace packages
- `--workspace-concurrency <number>`: Number of concurrent workspace installations
- `--workspace-filter <packages...>`: Filter specific workspace packages

### Performance Options

- `--cache-compression`: Enable cache compression (default: true)
- `--no-cache-compression`: Disable cache compression
- `--cache-compression-level <number>`: Set compression level (1-9)
- `--cache-compression-format <format>`: Set compression format (gzip, brotli)
- `--cache-integrity-check`: Enable integrity checking (default: true)
- `--no-cache-integrity-check`: Disable integrity checking
- `--memory-limit <percentage>`: Set memory usage limit (default: 80%)
- `--no-streaming`: Disable streaming operations

### Network Options

- `--no-network-check`: Disable network availability check
- `--network-timeout <ms>`: Network check timeout in milliseconds (default: 5000)
- `--network-retries <number>`: Number of retries for network operations (default: 2)
- `--no-fallbacks`: Disable fallbacks in offline mode
- `--no-outdated-warnings`: Disable warnings about outdated dependencies in offline mode

### Cloud Cache Options

- `--cloud-cache`: Enable cloud cache integration
- `--cloud-provider <provider>`: Cloud provider type (s3, azure, gcp)
- `--cloud-region <region>`: Cloud provider region
- `--cloud-endpoint <url>`: Cloud provider endpoint URL
- `--cloud-bucket <name>`: Cloud provider bucket name
- `--cloud-prefix <prefix>`: Cloud provider prefix
- `--cloud-sync <policy>`: Cloud sync policy (always-upload, always-download, upload-if-missing, download-if-missing, newest)
- `--team-id <id>`: Team ID for shared caching
- `--team-token <token>`: Team access token
- `--team-access-level <level>`: Team access level (read, write, admin)
- `--team-restrict`: Restrict access to team members only
- `--invalidate-on-lockfile-change`: Invalidate cache when lockfile changes

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

### Analysis Options

- `--no-dev`: Exclude dev dependencies
- `--direct-only`: Show only direct dependencies
- `--max-depth <depth>`: Maximum depth to analyze
- `--no-duplicates`: Hide duplicate dependencies
- `--no-sizes`: Hide dependency sizes
- `--format <format>`: Output format (tree, dot, markdown)
- `--output <file>`: Output file path
- `--no-versions`: Hide dependency versions
- `--no-colors`: Disable colors in output

### Plugin Options

- `add <path>`: Add a plugin from a path
- `remove <name>`: Remove a plugin by name
- `list`: List all installed plugins

## How It Works

1. **Dependency Resolution**: Parses lockfiles to determine exact dependencies
2. **Workspace Detection**: Identifies workspace packages in monorepos (when enabled)
3. **Cache Check**: Checks if dependencies are in the global cache
4. **Snapshot Check**: Checks if a valid `.flashpack` snapshot exists
5. **Memory Optimization**: Configures memory limits and batch sizes based on system capabilities
6. **Installation**: If no cache or snapshot is available, installs dependencies using the package manager
7. **Workspace Installation**: Installs workspace packages in dependency order (when enabled)
8. **Streaming Operations**: Uses streaming for file operations to minimize memory footprint
9. **Caching**: Adds newly installed packages to the cache with optional compression
10. **Integrity Verification**: Validates package checksums against npm registry
11. **Snapshotting**: Creates a `.flashpack` snapshot with fingerprinting for future use
12. **Plugin Execution**: Runs plugins at various lifecycle hooks

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
- **Disk Space Efficiency**: Uses hardlinks and compression to avoid duplicating files
- **Memory Efficiency**: Optimized for low memory usage even with large dependency trees
- **CI/CD Optimization**: Perfect for continuous integration environments
- **Developer Experience**: Instant dependency restoration when switching branches
- **Monorepo Efficiency**: Optimized workspace handling with dependency hoisting
- **Offline Development**: Work without internet connection using cache or snapshots
- **Streaming Operations**: Uses streaming for file operations to minimize memory footprint

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository at https://github.com/flash-install-cli/flash-install
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request at https://github.com/flash-install-cli/flash-install/pulls



## Direct CLI Interface

flash-install provides two CLI interfaces:

1. **Main CLI Interface** (`flash-install`): The primary interface with all core commands and features.
2. **Direct CLI Interface** (`flash-install-direct`): A simplified interface with direct implementations of commands.

The direct CLI interface can be accessed by running:

```bash
node dist/cli-direct.js <command>
```

This interface is useful for:
- Debugging issues with the main CLI
- Running commands with minimal overhead
- Accessing experimental features not yet available in the main CLI

> **Note:** Some commands may behave slightly differently between the two interfaces. The main CLI interface is recommended for most users.

## Documentation

For more detailed documentation, see the [docs](docs) directory.

### Core Features

- [Performance Optimizations](docs/performance.md) - Learn about the performance optimizations in flash-install
- [Monorepo Support](docs/monorepo.md) - Manage dependencies in monorepos
- [Offline Mode](docs/offline-mode.md) - Work without an internet connection
- [Dependency Analysis](docs/dependency-analysis.md) - Analyze and visualize dependencies
- [Cloud Cache](docs/cloud-cache.md) - Share caches across machines and teams
- [Enhanced Plugin System](docs/enhanced-plugin-system.md) - Extend flash-install with plugins

## Sponsorship

flash-install is an open-source project that relies on community support. If you find this tool valuable for your work, please consider sponsoring its development.

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa)](https://github.com/sponsors/flash-install-cli)
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/S6S31E7BC7)

Your sponsorship helps us:
- Maintain and improve flash-install
- Develop new features
- Provide better documentation
- Support the community

See our [SPONSORS.md](SPONSORS.md) file for a list of our generous sponsors.

## License

MIT

## Acknowledgements

- Inspired by the speed of [Bun](https://bun.sh/), the reliability of [Yarn](https://yarnpkg.com/), and the efficiency of [PNPM](https://pnpm.io/)
- Thanks to all the open-source projects that made this possible
- Special thanks to all our [sponsors](SPONSORS.md) who make this project sustainable
