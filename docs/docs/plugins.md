---
layout: default
title: Plugin System
nav_order: 4
permalink: /docs/plugins
---

# Plugin System
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Introduction to Plugins

flash-install includes a powerful plugin system that allows extending functionality through lifecycle hooks. Plugins can be used for tasks like:

- TypeScript declaration generation
- Security scanning
- License compliance checking
- Dependency visualization
- Custom build steps

## Lifecycle Hooks

Plugins can hook into various stages of the flash-install process:

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

## Plugin Management

### List Installed Plugins

```bash
flash-install plugin list
```

### Add a Plugin

```bash
flash-install plugin add <path-to-plugin>
```

### Remove a Plugin

```bash
flash-install plugin remove <plugin-name>
```

## Creating a Plugin

A flash-install plugin is a JavaScript module that exports a function for each lifecycle hook it wants to handle.

### Basic Plugin Structure

```javascript
// my-flash-plugin.js
module.exports = {
  name: 'my-flash-plugin',
  version: '1.0.0',
  
  // Lifecycle hooks
  preInstall: async (context) => {
    console.log('Before installation');
    // Do something before installation
  },
  
  postInstall: async (context) => {
    console.log('After installation');
    // Do something after installation
  },
  
  // Other lifecycle hooks...
};
```

### Plugin Context

Each lifecycle hook receives a context object with information about the current operation:

```javascript
{
  projectDir: '/path/to/project',
  packageJson: { /* package.json contents */ },
  dependencies: { /* resolved dependencies */ },
  options: { /* command options */ }
}
```

### Example: TypeScript Declaration Generator Plugin

```javascript
// ts-declaration-plugin.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'ts-declaration-generator',
  version: '1.0.0',
  
  postInstall: async (context) => {
    const { projectDir } = context;
    
    // Check if this is a TypeScript project
    const tsConfigPath = path.join(projectDir, 'tsconfig.json');
    if (!fs.existsSync(tsConfigPath)) {
      return;
    }
    
    console.log('Generating TypeScript declarations...');
    
    try {
      // Run the TypeScript compiler to generate declarations
      execSync('tsc --declaration --emitDeclarationOnly', {
        cwd: projectDir,
        stdio: 'inherit'
      });
      
      console.log('TypeScript declarations generated successfully');
    } catch (error) {
      console.error('Failed to generate TypeScript declarations:', error.message);
    }
  }
};
```

### Example: Security Scanner Plugin

```javascript
// security-scanner-plugin.js
const { execSync } = require('child_process');

module.exports = {
  name: 'security-scanner',
  version: '1.0.0',
  
  postInstall: async (context) => {
    const { projectDir } = context;
    
    console.log('Scanning dependencies for security vulnerabilities...');
    
    try {
      // Run npm audit
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
};
```

## Installing a Plugin

To install a plugin, you need to add it to your project:

1. Create a `.flash-plugins` directory in your project root:

```bash
mkdir -p .flash-plugins
```

2. Copy your plugin file to the directory:

```bash
cp my-flash-plugin.js .flash-plugins/
```

3. Add the plugin using the flash-install CLI:

```bash
flash-install plugin add .flash-plugins/my-flash-plugin.js
```

## Global Plugins

You can also install plugins globally:

```bash
flash-install plugin add /path/to/plugin.js --global
```

Global plugins will be applied to all projects.
