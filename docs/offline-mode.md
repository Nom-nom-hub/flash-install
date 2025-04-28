# Enhanced Offline Mode in flash-install

flash-install provides robust support for offline installation, allowing you to install dependencies without an internet connection.

## Features

- **Intelligent Network Detection**: Automatically detects network availability
- **Fallback Strategies**: Uses multiple fallback sources when working offline
- **Warning System**: Alerts you about outdated dependencies when working offline
- **Partial Offline Support**: Handles scenarios where some resources are available but others aren't

## Usage

### Basic Offline Mode

Enable offline mode with the `--offline` flag:

```bash
flash-install --offline
```

This will:
1. Skip network availability checks
2. Use only locally cached packages
3. Fail if a package is not available in the cache

### Auto-Offline Mode

By default, flash-install automatically detects network availability:

```bash
flash-install
```

If the network is unavailable, flash-install will automatically switch to offline mode and use cached packages.

### Network Check Options

You can customize the network check behavior:

```bash
# Disable network availability check
flash-install --no-network-check

# Set network check timeout
flash-install --network-timeout 10000

# Set number of network retries
flash-install --network-retries 5
```

## Fallback Strategies

When working offline, flash-install uses multiple fallback strategies to find packages:

1. **Local Cache**: Checks the global cache for previously downloaded packages
2. **Project Cache**: Checks the project-specific cache
3. **Snapshots**: Uses snapshots if available
4. **node_modules**: Extracts packages from existing node_modules
5. **Workspace Packages**: Uses packages from other workspace packages in monorepos

You can disable fallbacks with the `--no-fallbacks` option:

```bash
flash-install --offline --no-fallbacks
```

## Warning System

When working offline, flash-install warns you about potentially outdated dependencies:

```
⚠️ Warning: You are using cached version of lodash@4.17.20, but the latest version is 4.17.21
⚠️ Warning: You are using cached version of express@4.17.1, but the latest version is 4.18.2
```

You can disable these warnings with the `--no-outdated-warnings` option:

```bash
flash-install --offline --no-outdated-warnings
```

## Partial Offline Mode

flash-install handles scenarios where some resources are available but others aren't:

```bash
# Try to use the network, but fall back to offline mode if needed
flash-install --partial-offline
```

This is useful in environments with limited or unreliable connectivity.

## Preparing for Offline Use

To prepare for offline use, you can pre-cache dependencies:

```bash
# Pre-cache all dependencies
flash-install --precache

# Create a snapshot for offline use
flash-install snapshot create
```

## Snapshots for Offline Use

Snapshots are a powerful way to ensure offline availability:

```bash
# Create a snapshot
flash-install snapshot create

# Restore from a snapshot (works offline)
flash-install restore
```

See the [snapshots documentation](snapshots.md) for more details.

## Configuration

You can configure offline behavior in your package.json:

```json
{
  "flash-install": {
    "offline": {
      "auto": true,
      "networkTimeout": 5000,
      "networkRetries": 3,
      "useFallbacks": true,
      "showOutdatedWarnings": true
    }
  }
}
```

## Environment Variables

You can also use environment variables to configure offline behavior:

```bash
FLASH_OFFLINE=true
FLASH_NETWORK_TIMEOUT=5000
FLASH_NETWORK_RETRIES=3
FLASH_USE_FALLBACKS=true
FLASH_SHOW_OUTDATED_WARNINGS=true
```

## Troubleshooting

### Missing Packages

If packages are missing when working offline:

1. Ensure that you've pre-cached the dependencies with `flash-install --precache`
2. Create a snapshot with `flash-install snapshot create`
3. Check that fallbacks are enabled (they are by default)
4. Verify that the package exists in your cache with `flash-install cache`

### Network Detection Issues

If network detection is not working correctly:

1. Try setting a longer timeout with `--network-timeout 10000`
2. Increase the number of retries with `--network-retries 5`
3. Manually specify offline mode with `--offline` or online mode with `--no-offline`

### Performance Issues

If offline installation is slow:

1. Use snapshots for faster restoration with `flash-install snapshot create` and `flash-install restore`
2. Optimize your cache with `flash-install cache --optimize`
3. Use the cloud cache for team sharing with `flash-install --cloud-cache`
