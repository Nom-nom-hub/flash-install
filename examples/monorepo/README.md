# Monorepo Example

This example demonstrates how to use flash-install with a monorepo structure.

## Structure

```
monorepo/
├── package.json
├── .flashrc.json
├── packages/
│   ├── package-a/
│   │   ├── package.json
│   │   └── src/
│   └── package-b/
│       ├── package.json
│       └── src/
└── apps/
    └── web/
        ├── package.json
        └── src/
```

## Root Package.json

```json
{
  "name": "monorepo-example",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "install": "flash-install -w",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces"
  },
  "dependencies": {
    "shared-lib": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  }
}
```

## Flash Configuration

`.flashrc.json`:

```json
{
  "cache": {
    "maxAge": 30,
    "maxSize": "20GB",
    "compressionLevel": 6
  },
  "snapshot": {
    "format": "tar.gz",
    "compressionLevel": 6,
    "includeDevDependencies": true
  },
  "install": {
    "concurrency": 8,
    "skipPostinstall": false,
    "useCache": true
  },
  "workspaces": {
    "enabled": true,
    "packages": [
      "packages/*",
      "apps/*"
    ],
    "hoistDependencies": true,
    "parallelInstall": true
  },
  "plugins": {
    "enabled": true,
    "allowedPlugins": ["typescript-plugin", "security-scanner", "license-checker"]
  }
}
```

## Package A

`packages/package-a/package.json`:

```json
{
  "name": "package-a",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "@types/lodash": "^4.14.195"
  }
}
```

## Package B (depends on Package A)

`packages/package-b/package.json`:

```json
{
  "name": "package-b",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "package-a": "^1.0.0",
    "axios": "^1.4.0"
  },
  "devDependencies": {
    "@types/axios": "^0.14.0"
  }
}
```

## Web App (depends on both packages)

`apps/web/package.json`:

```json
{
  "name": "web",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "package-a": "^1.0.0",
    "package-b": "^1.0.0",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.17"
  }
}
```

## Usage

### Installation

```bash
# Install all dependencies with workspace support
flash-install -w

# Install only specific workspace packages
flash-install -w --workspace-filter package-a package-b
```

### List Workspaces

```bash
flash-install workspaces
```

### Create Snapshot

```bash
flash-install snapshot
```

### Restore from Snapshot

```bash
flash-install restore
```

### Clean

```bash
flash-install clean
```

## CI/CD Integration

For CI/CD environments, you can use the following script:

```bash
#!/bin/bash
# Check if we have a snapshot
if [ -f ".flashpack" ]; then
  flash-install restore
else
  flash-install -w
  flash-install snapshot
fi
```
