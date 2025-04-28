# Enhanced Offline Mode

Flash Install provides robust offline capabilities, allowing you to install dependencies without an internet connection.

## Basic Offline Mode

To enable offline mode, use the `--offline` flag:

```bash
flash-install --offline
```

In offline mode, Flash Install will:

1. Check if dependencies are available in the cache
2. Check if a valid snapshot exists
3. Look for fallbacks if exact versions aren't available
4. Install from these local sources without network requests

## Network Detection

Flash Install automatically detects network availability before attempting to install packages. This helps prevent installation failures when the network is unreliable.

### Network Check Command

You can check your network status with the `network` command:

```bash
flash-install network
```

This will display:
- Overall network status (online, offline, or partial)
- DNS resolution availability
- Registry availability
- Internet connectivity
- Response time
- Recommendations based on your network status

### Network Options

You can customize network detection behavior with these options:

```bash
# Disable network availability check
flash-install --no-network-check

# Set network check timeout
flash-install --network-timeout 10000

# Set number of retries for network operations
flash-install --network-retries 3
```

## Fallback Strategies

When in offline mode or when the network is unavailable, Flash Install uses sophisticated fallback strategies:

### Version Fallbacks

If the exact version of a package isn't available locally, Flash Install can use a compatible version based on semver rules:

```bash
# Enable version fallbacks (default)
flash-install --offline

# Disable version fallbacks
flash-install --offline --no-fallbacks
```

### Source Priorities

Flash Install searches for packages in this order:
1. Global cache
2. Project snapshot
3. Local node_modules

### Outdated Warnings

When using fallbacks, Flash Install warns you about packages that might be outdated:

```bash
# Enable outdated warnings (default)
flash-install --offline

# Disable outdated warnings
flash-install --offline --no-outdated-warnings
```

## Partial Offline Scenarios

Flash Install handles partial offline scenarios intelligently:

### Registry Unavailable

If the npm registry is unavailable but you have internet access:

```bash
# Try a different registry
flash-install --registry https://registry.npmjs.cf

# Use offline mode with fallbacks
flash-install --offline
```

### DNS Issues

If DNS resolution is failing:

```bash
# Use a registry with a direct IP address
flash-install --registry http://104.16.19.35
```

## Best Practices for Offline Development

1. **Create Snapshots**: Before going offline, create a snapshot of your dependencies:
   ```bash
   flash-install snapshot
   ```

2. **Warm the Cache**: Install commonly used packages to populate your cache:
   ```bash
   flash-install cache-packages react react-dom lodash
   ```

3. **Sync When Online**: When you regain internet access, sync your dependencies:
   ```bash
   flash-install sync
   ```

4. **Use Workspace Hoisting**: In monorepos, enable hoisting to maximize cache hits:
   ```bash
   flash-install -w
   ```

5. **Configure Fallbacks**: Set up a `.flashrc.json` file with fallback preferences:
   ```json
   {
     "offline": {
       "allowFallbacks": true,
       "warnOutdated": true,
       "fallbackSources": ["cache", "snapshot", "local"]
     }
   }
   ```

## Environment Variables

Flash Install respects these environment variables for offline mode:

- `FLASH_INSTALL_OFFLINE`: Set to `true` to enable offline mode
- `FLASH_INSTALL_NETWORK_CHECK`: Set to `false` to disable network checks
- `FLASH_INSTALL_ALLOW_FALLBACKS`: Set to `false` to disable fallbacks
- `FLASH_INSTALL_WARN_OUTDATED`: Set to `false` to disable outdated warnings
