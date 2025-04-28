# Flash Install for VS Code

Speed up your npm workflows with flash-install, a fast npm alternative with deterministic caching.

## Features

- ⚡ **Fast dependency installation** - 30-50% faster than standard npm
- 🔄 **Snapshot management** - Create and restore dependency snapshots
- 📊 **Dependency visualization** - Explore your dependency tree
- ☁️ **Cloud caching** - Share cache across team members
- 🔌 **Multiple package managers** - Support for npm, yarn, pnpm, and bun

## Commands

Right-click on any `package.json` file to access these commands:

- **Flash Install: Install Dependencies** - Install dependencies with flash-install
- **Flash Install: Restore from Snapshot** - Restore dependencies from a snapshot
- **Flash Install: Create Snapshot** - Create a snapshot of your dependencies
- **Flash Install: Clean node_modules** - Remove node_modules directory
- **Flash Install: Visualize Dependencies** - View dependency tree visualization

## Dependency Visualization

The dependency visualization feature provides:

- Total dependency count
- Direct vs. transitive dependencies
- Production vs. development dependencies
- Interactive dependency tree explorer

## Configuration

Configure flash-install in your VS Code settings:

```json
{
  "flash-install.packageManager": "npm", // npm, yarn, pnpm, or bun
  "flash-install.cloudCache": false,
  "flash-install.cloudProvider": "s3", // s3, azure, or gcp
  "flash-install.cloudBucket": "",
  "flash-install.cloudRegion": ""
}
```

## Requirements

- Node.js 14 or higher
- flash-install CLI (`npm install -g @flash-install/cli`)

## Installation

1. Install from the VS Code Marketplace
2. Install flash-install CLI globally: `npm install -g @flash-install/cli`

## Usage

1. Open a project with a package.json file
2. Right-click on package.json in the Explorer
3. Select any flash-install command from the context menu

## Extension Settings

This extension contributes the following settings:

* `flash-install.packageManager`: Package manager to use (npm, yarn, pnpm, bun)
* `flash-install.cloudCache`: Enable cloud caching
* `flash-install.cloudProvider`: Cloud provider for caching (s3, azure, gcp)
* `flash-install.cloudBucket`: Cloud bucket name
* `flash-install.cloudRegion`: Cloud region

## Known Issues

- Dependency visualization requires flash-install CLI v1.7.0 or higher
- Cloud caching requires appropriate cloud provider credentials

## Release Notes

### 0.1.0

Initial release of Flash Install for VS Code

---

## About flash-install

flash-install is a fast, drop-in replacement for npm install with deterministic caching. Learn more at [github.com/Nom-nom-hub/flash-install](https://github.com/Nom-nom-hub/flash-install).
