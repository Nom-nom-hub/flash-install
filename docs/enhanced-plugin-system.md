# Enhanced Plugin System

flash-install includes a powerful plugin system that allows extending functionality through lifecycle hooks. The enhanced plugin system adds more granular hooks, automatic plugin discovery, and an official plugin registry.

## Plugin Lifecycle Hooks

Plugins can hook into various stages of the flash-install process:

### Installation Hooks
- **preInstall**: Before installation begins
- **postInstall**: After installation completes
- **prePackageInstall**: Before installing a specific package
- **postPackageInstall**: After installing a specific package
- **packageError**: When a package installation fails

### Snapshot Hooks
- **preSnapshot**: Before creating a snapshot
- **postSnapshot**: After creating a snapshot
- **preRestore**: Before restoring from a snapshot
- **postRestore**: After restoring from a snapshot

### Sync Hooks
- **preSync**: Before syncing dependencies
- **postSync**: After syncing dependencies

### Clean Hooks
- **preClean**: Before cleaning
- **postClean**: After cleaning

### Dependency Resolution Hooks
- **preDependencyResolution**: Before resolving dependencies
- **postDependencyResolution**: After resolving dependencies
- **dependencyResolutionError**: When dependency resolution fails

### Network Hooks
- **preDownload**: Before downloading a package
- **postDownload**: After downloading a package
- **downloadError**: When a download fails
- **networkCheck**: When checking network availability

### Cache Hooks
- **preCacheRead**: Before reading from cache
- **postCacheRead**: After reading from cache
- **preCacheWrite**: Before writing to cache
- **postCacheWrite**: After writing to cache

### Configuration Hooks
- **configLoaded**: When configuration is loaded
- **configChanged**: When configuration changes

## Plugin Management

### List Installed Plugins

```bash
flash-install plugin list
```

Options:
- `--all`: Show all plugins including disabled ones
- `--global`: Show only global plugins
- `--local`: Show only local plugins
- `--node-modules`: Show only node_modules plugins
- `--detailed`: Show detailed plugin information

### Add a Plugin

```bash
flash-install plugin add <path-to-plugin>
```

Options:
- `-g, --global`: Install plugin globally
- `-f, --force`: Force installation even if plugin already exists
- `--disable`: Disable plugin after installation

### Remove a Plugin

```bash
flash-install plugin remove <plugin-name>
```

Options:
- `-g, --global`: Remove global plugin
- `-f, --force`: Force removal even for node_modules plugins

### Enable/Disable a Plugin

```bash
flash-install plugin enable <plugin-name>
flash-install plugin disable <plugin-name>
```

### Install a Plugin from npm

```bash
flash-install plugin install <plugin-package-name>
```

Options:
- `-g, --global`: Install plugin globally
- `-v, --version <version>`: Specific version to install
- `-r, --registry <url>`: Specify npm registry URL

### Search for Plugins

```bash
flash-install plugin search <query>
```

Options:
- `-l, --limit <n>`: Maximum number of results
- `-r, --registry <url>`: Specify npm registry URL

### Get Plugin Information

```bash
flash-install plugin info <plugin-name>
```

## Plugin Discovery

flash-install automatically discovers plugins from multiple sources:

1. **Global Plugins**: Installed in `~/.flash-install/plugins`
2. **Local Project Plugins**: Installed in `.flash-plugins` directory in the project
3. **Package.json Plugins**: Specified in the `flash-install.plugins` field in package.json
4. **Node Modules Plugins**: Packages with the naming pattern `flash-plugin-*` or `@*/flash-plugin-*`

## Creating a Plugin

A flash-install plugin is a JavaScript module that exports an object with metadata and hooks.

### Basic Plugin Structure

```javascript
export default {
  // Basic metadata
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My awesome plugin',
  author: 'Your Name',
  homepage: 'https://github.com/yourusername/my-plugin',
  repository: 'https://github.com/yourusername/my-plugin',
  license: 'MIT',
  
  // Plugin configuration
  config: {
    enabled: true,
    priority: 10,
    // Custom configuration options
    myOption: 'value'
  },
  
  // Plugin hooks
  hooks: {
    async preInstall(context) {
      console.log('Before installation');
      // Do something before installation
    },
    
    async postInstall(context) {
      console.log('After installation');
      // Do something after installation
    },
    
    // Other hooks...
  },
  
  // Plugin initialization
  async init(context) {
    console.log('Initializing plugin');
    // Do initialization tasks
    return true; // Return true if initialization was successful
  },
  
  // Plugin cleanup
  async cleanup(context) {
    console.log('Cleaning up plugin');
    // Do cleanup tasks
    return true; // Return true if cleanup was successful
  }
};
```

### Plugin Context

Each lifecycle hook receives a context object with information about the current operation:

```javascript
{
  // Project information
  projectDir: '/path/to/project',
  nodeModulesPath: '/path/to/project/node_modules',
  packageJson: { /* package.json contents */ },
  
  // Dependencies
  dependencies: { /* direct dependencies */ },
  devDependencies: { /* dev dependencies */ },
  peerDependencies: { /* peer dependencies */ },
  
  // Package manager
  packageManager: 'npm',
  packageManagerVersion: '8.1.0',
  
  // Installation options
  options: {
    cache: true,
    offline: false,
    registry: 'https://registry.npmjs.org',
    workspaces: true
  },
  
  // Current operation
  operation: 'install',
  currentPackage: {
    name: 'express',
    version: '4.18.2',
    path: '/path/to/cache/express/4.18.2'
  },
  
  // Cache information
  cacheDir: '/path/to/cache',
  cacheEnabled: true,
  
  // Network information
  networkAvailable: true,
  
  // Cloud cache information
  cloudCache: {
    enabled: true,
    provider: 's3',
    teamId: 'my-team'
  }
}
```

## Plugin Dependencies

Plugins can depend on other plugins:

```javascript
export default {
  name: 'my-plugin',
  version: '1.0.0',
  
  // Plugin dependencies
  dependencies: ['other-plugin', 'another-plugin'],
  
  // Rest of the plugin...
};
```

If a plugin's dependencies are not available, the plugin will be disabled.

## Plugin Priority

Plugins can specify a priority to control the order in which they are loaded and their hooks are executed:

```javascript
export default {
  name: 'my-plugin',
  version: '1.0.0',
  
  config: {
    priority: 10 // Higher priority plugins are loaded first
  },
  
  // Rest of the plugin...
};
```

## Publishing a Plugin

To publish a plugin to npm:

1. Create a package with a name starting with `flash-plugin-`:

```json
{
  "name": "flash-plugin-my-plugin",
  "version": "1.0.0",
  "main": "index.js",
  "keywords": ["flash-install", "plugin"],
  "dependencies": {
    // Plugin dependencies
  }
}
```

2. Publish to npm:

```bash
npm publish
```

## Example Plugins

### Dependency Analyzer Plugin

```javascript
export default {
  name: 'dependency-analyzer-plugin',
  version: '1.0.0',
  description: 'Analyzes dependencies and provides insights',
  
  hooks: {
    async postDependencyResolution(context) {
      console.log('Analyzing dependencies...');
      
      const dependencies = context.dependencies || {};
      const devDependencies = context.devDependencies || {};
      
      // Count dependencies
      const directDepsCount = Object.keys(dependencies).length;
      const devDepsCount = Object.keys(devDependencies).length;
      
      console.log(`Dependency Analysis:`);
      console.log(`- Direct dependencies: ${directDepsCount}`);
      console.log(`- Dev dependencies: ${devDepsCount}`);
      console.log(`- Total dependencies: ${directDepsCount + devDepsCount}`);
    }
  }
};
```

### TypeScript Declaration Generator Plugin

```javascript
export default {
  name: 'typescript-declaration-plugin',
  version: '1.0.0',
  description: 'Generates TypeScript declarations for packages',
  
  hooks: {
    async postInstall(context) {
      // Check if this is a TypeScript project
      const fs = require('fs');
      const path = require('path');
      const { projectDir } = context;
      
      const tsConfigPath = path.join(projectDir, 'tsconfig.json');
      if (!fs.existsSync(tsConfigPath)) {
        return; // Not a TypeScript project
      }
      
      console.log('Generating TypeScript declarations...');
      
      // Run the TypeScript compiler
      const { execSync } = require('child_process');
      execSync('tsc --declaration --emitDeclarationOnly', {
        cwd: projectDir,
        stdio: 'inherit'
      });
    }
  }
};
```

### Security Scanner Plugin

```javascript
export default {
  name: 'security-scanner-plugin',
  version: '1.0.0',
  description: 'Scans dependencies for security vulnerabilities',
  
  hooks: {
    async postInstall(context) {
      console.log('Scanning dependencies for security vulnerabilities...');
      
      const { execSync } = require('child_process');
      const { projectDir } = context;
      
      try {
        const output = execSync('npm audit --json', {
          cwd: projectDir,
          encoding: 'utf8'
        });
        
        const auditResult = JSON.parse(output);
        
        if (auditResult.vulnerabilities && Object.keys(auditResult.vulnerabilities).length > 0) {
          console.warn('Security vulnerabilities found:');
          
          for (const [name, vulnerability] of Object.entries(auditResult.vulnerabilities)) {
            console.warn(`- ${name}: ${vulnerability.severity} severity`);
          }
        } else {
          console.log('No security vulnerabilities found');
        }
      } catch (error) {
        console.error('Failed to scan for security vulnerabilities:', error.message);
      }
    }
  }
};
```
