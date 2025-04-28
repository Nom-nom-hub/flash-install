# Monorepo Support in flash-install

flash-install provides robust support for monorepos and workspaces, making it easy to manage dependencies across multiple packages in a single repository.

## Features

- **Enhanced Workspace Detection**: Automatically detects workspace packages in npm, yarn, and pnpm monorepos
- **Parallel Installation**: Installs workspace packages in parallel for faster installation
- **Intelligent Dependency Hoisting**: Optimizes dependency structure to minimize duplication
- **Workspace Filtering**: Selectively install dependencies for specific workspace packages
- **Dependency Graph Analysis**: Visualize dependencies across workspace packages

## Usage

### Basic Workspace Support

Enable workspace support with the `-w` or `--workspace` flag:

```bash
flash-install -w
```

This will:
1. Detect workspace packages in your monorepo
2. Install dependencies for all workspace packages
3. Optimize the dependency structure with hoisting

### Workspace Options

flash-install provides several options for customizing workspace behavior:

```bash
# Disable dependency hoisting
flash-install -w --no-hoist

# Disable parallel installation
flash-install -w --no-parallel-workspaces

# Set the number of concurrent workspace installations
flash-install -w --workspace-concurrency 8

# Filter specific workspace packages
flash-install -w --workspace-filter package1,package2
```

### Listing Workspace Packages

You can list all workspace packages in your monorepo:

```bash
flash-install workspaces
```

This will display a list of all workspace packages, including their names, versions, and locations.

## Dependency Hoisting

Dependency hoisting is a technique that moves dependencies from individual workspace packages to the root of the monorepo, reducing duplication and saving disk space.

flash-install intelligently hoists dependencies by:
1. Analyzing the dependency graph across all workspace packages
2. Identifying common dependencies that can be hoisted
3. Moving these dependencies to the root package.json
4. Creating symlinks in the node_modules directories of individual packages

You can disable hoisting with the `--no-hoist` option if you need to maintain strict package boundaries.

## Parallel Installation

By default, flash-install installs workspace packages in parallel to speed up installation. The number of concurrent installations is controlled by the `--workspace-concurrency` option (default: 4).

You can disable parallel installation with the `--no-parallel-workspaces` option if you need to ensure sequential installation.

## Workspace Filtering

You can selectively install dependencies for specific workspace packages using the `--workspace-filter` option:

```bash
flash-install -w --workspace-filter package1,package2
```

This is useful when you're working on a subset of packages in a large monorepo and don't need to install dependencies for all packages.

## Dependency Graph Analysis

flash-install provides tools for analyzing and visualizing dependencies across workspace packages:

```bash
# Analyze dependencies across all workspace packages
flash-install analyze -w

# Visualize dependency graph for workspace packages
flash-install deps -w

# Generate a DOT graph for Graphviz
flash-install deps -w --format dot --output deps.dot

# Generate a Markdown report
flash-install deps -w --format markdown --output deps.md
```

## Configuration

You can configure workspace behavior in your package.json:

```json
{
  "flash-install": {
    "workspace": {
      "enabled": true,
      "hoistDependencies": true,
      "parallelInstall": true,
      "maxConcurrency": 4,
      "filter": ["package1", "package2"]
    }
  }
}
```

## Compatibility

flash-install is compatible with the following monorepo tools:

- **npm workspaces**: Supported in npm 7+
- **yarn workspaces**: Supported in Yarn Classic and Yarn Berry
- **pnpm workspaces**: Supported in pnpm 3+
- **lerna**: Compatible with Lerna-based monorepos
- **nx**: Compatible with Nx-based monorepos
- **turborepo**: Compatible with Turborepo-based monorepos

## Troubleshooting

### Workspace Detection Issues

If flash-install is not detecting your workspace packages:

1. Ensure that your workspace configuration is correct in your package.json
2. Verify that your workspace packages have valid package.json files
3. Check that your workspace packages are in the correct directory structure

### Hoisting Issues

If you're experiencing issues with dependency hoisting:

1. Try disabling hoisting with `--no-hoist` to see if that resolves the issue
2. Check for conflicting dependency versions across workspace packages
3. Ensure that your packages don't rely on the specific structure of node_modules

### Performance Issues

If workspace installation is slow:

1. Increase the workspace concurrency with `--workspace-concurrency`
2. Enable the cache with `--cache` (enabled by default)
3. Use snapshots for faster restoration with `flash-install snapshot` and `flash-install restore`
