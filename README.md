<p align="center">
  <img src="https://raw.githubusercontent.com/flash-install-cli/flash-install/main/assets/logo.png" alt="flash-install logo" width="200" height="200">
</p>

<h1 align="center">⚡ Flash Install GitHub Action</h1>
<p align="center">Speed up your CI/CD pipeline with Flash Install, a fast npm alternative with deterministic caching</p>

<p align="center">
  <a href="https://github.com/marketplace/actions/flash-install"><img src="https://img.shields.io/badge/GitHub%20Actions-Flash%20Install-yellow" alt="GitHub Actions"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen.svg" alt="Node.js Version"></a>
  <a href="https://www.npmjs.com/package/@flash-install/cli"><img src="https://img.shields.io/npm/v/@flash-install/cli" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@flash-install/cli"><img src="https://img.shields.io/npm/dm/@flash-install/cli" alt="npm downloads"></a>
  <a href="https://github.com/flash-install-cli/flash-install/graphs/commit-activity"><img src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" alt="Maintenance"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Speed-Up%20to%2050%%20Faster-orange" alt="Speed: Up to 50% Faster">
  <img src="https://img.shields.io/badge/Cache-Deterministic-blue" alt="Cache: Deterministic">
  <img src="https://img.shields.io/badge/Cloud-Team%20Sharing-lightblue" alt="Cloud: Team Sharing">
  <img src="https://img.shields.io/badge/CI/CD-Optimized-green" alt="CI/CD: Optimized">
</p>

<p align="center">
  <b>Compatible with:</b><br>
  <img src="https://img.shields.io/badge/npm-Compatible-red" alt="npm Compatible">
  <img src="https://img.shields.io/badge/yarn-Compatible-blue" alt="yarn Compatible">
  <img src="https://img.shields.io/badge/pnpm-Compatible-orange" alt="pnpm Compatible">
  <img src="https://img.shields.io/badge/bun-Compatible-purple" alt="bun Compatible">
  <img src="https://img.shields.io/badge/Monorepos-Supported-green" alt="Monorepos Supported">
</p>

## Features

- ⚡ **30-50% faster** than standard npm install
- 🔄 **Deterministic caching** for consistent builds
- ☁️ **Cloud caching** support for team sharing
- 🔌 **Multiple package managers** support (npm, yarn, pnpm, bun)
- 🛠️ **Optimized for CI/CD** environments
- 📦 **GitHub Actions caching** integration
- 🏗️ **Monorepo support** with workspace detection
- 🔍 **Fallback to npm** if Flash Install encounters an error

## Usage

Add Flash Install to your GitHub Actions workflow:

```yaml
steps:
  - uses: actions/checkout@v3

  - name: Install dependencies with Flash Install
    uses: flash-install-cli/flash-install-action@v1
    with:
      # Optional parameters (shown with defaults)
      command: 'install'           # Command to run (install, restore, snapshot, clean)
      directory: '.'               # Directory to run the command in
      cache-enabled: 'true'        # Enable GitHub Actions caching
      cloud-cache: 'false'         # Enable cloud caching
      cloud-provider: 's3'         # Cloud provider (s3, azure, gcp)
      cloud-bucket: ''             # Cloud bucket name
      cloud-region: ''             # Cloud region
      cloud-prefix: 'flash-install-cache' # Cloud prefix
      package-manager: 'npm'       # Package manager to use (npm, yarn, pnpm, bun)
      concurrency: '4'             # Number of concurrent downloads
```

## Examples

### Basic Usage

```yaml
- name: Install dependencies
  uses: flash-install-cli/flash-install-action@v1
```

### With Cloud Caching (AWS S3)

```yaml
- name: Install dependencies with S3 caching
  uses: flash-install-cli/flash-install-action@v1
  with:
    cloud-cache: 'true'
    cloud-provider: 's3'
    cloud-bucket: 'my-ci-cache-bucket'
    cloud-region: 'us-east-1'
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### Using Yarn

```yaml
- name: Install dependencies with Yarn
  uses: flash-install-cli/flash-install-action@v1
  with:
    package-manager: 'yarn'
```

### Using PNPM

```yaml
- name: Install dependencies with PNPM
  uses: flash-install-cli/flash-install-action@v1
  with:
    package-manager: 'pnpm'
```

### Using Bun

```yaml
- name: Install dependencies with Bun
  uses: flash-install-cli/flash-install-action@v1
  with:
    package-manager: 'bun'
```

## Complete Workflow Example

Here's a complete workflow example using Flash Install:

```yaml
name: Build and Test

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'

    - name: Install dependencies with Flash Install
      uses: flash-install-cli/flash-install-action@v1

    - name: Run tests
      run: npm test

    - name: Build
      run: npm run build
```

## Input Parameters

| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| `command` | Command to run (install, restore, snapshot, clean) | No | `install` |
| `directory` | Directory to run the command in | No | `.` |
| `cache-enabled` | Enable GitHub Actions caching | No | `true` |
| `cloud-cache` | Enable cloud caching | No | `false` |
| `cloud-provider` | Cloud provider (s3, azure, gcp) | No | `s3` |
| `cloud-bucket` | Cloud bucket name | No | `''` |
| `cloud-region` | Cloud region | No | `''` |
| `cloud-prefix` | Cloud prefix | No | `flash-install-cache` |
| `package-manager` | Package manager to use (npm, yarn, pnpm, bun) | No | `npm` |
| `concurrency` | Number of concurrent downloads | No | `4` |

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



## CLI Interface

The `flash-install` command uses a direct CLI implementation for better reliability and performance. When you run `flash-install`, you're using the direct CLI interface which provides all the core functionality you need.

```bash
# Basic usage
flash-install install

# Create a snapshot
flash-install snapshot

# Restore from a snapshot
flash-install restore
```

This implementation:
- Provides reliable progress reporting
- Has minimal overhead
- Works consistently across different environments
- Avoids compatibility issues with terminal UI libraries

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
