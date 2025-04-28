# Performance Optimizations in flash-install

flash-install includes numerous performance optimizations to make dependency installation faster and more efficient.

## Features

- **Reduced Memory Usage**: Optimized for large installations with minimal memory footprint
- **Optimized Cache Format**: Efficient storage format for faster retrieval
- **Streaming Extraction**: Extract packages while downloading for faster installation
- **Parallel Processing**: Install multiple packages simultaneously
- **Incremental Updates**: Only update what's changed

## Memory Optimizations

flash-install is designed to use minimal memory, even for large projects:

```bash
# Set maximum memory usage (in MB)
flash-install --max-memory 1024

# Enable low-memory mode
flash-install --low-memory
```

In low-memory mode, flash-install:
1. Processes fewer packages in parallel
2. Uses streaming operations instead of loading entire files into memory
3. Releases memory more aggressively
4. Minimizes in-memory caching

## Cache Optimizations

The cache storage format is optimized for performance:

```bash
# Optimize cache storage
flash-install cache --optimize

# Set cache compression level (0-9, default: 6)
flash-install --cache-compression 4
```

Cache optimizations include:
1. Efficient storage format for faster retrieval
2. Metadata indexing for quick lookups
3. Optimized compression for balance of size and speed
4. Deduplication of common files

## Streaming Extraction

flash-install uses streaming extraction to start unpacking packages while they're still downloading:

```bash
# Enable streaming extraction (enabled by default)
flash-install --streaming-extraction

# Disable streaming extraction
flash-install --no-streaming-extraction
```

This significantly reduces installation time, especially for large packages.

## Parallel Processing

flash-install installs multiple packages in parallel:

```bash
# Set the number of concurrent package installations
flash-install --concurrency 8

# Set the number of concurrent downloads
flash-install --download-concurrency 10

# Set the number of concurrent extractions
flash-install --extract-concurrency 6
```

The default concurrency values are automatically adjusted based on your system's capabilities.

## Incremental Updates

When updating dependencies, flash-install only processes what's changed:

```bash
# Enable incremental updates (enabled by default)
flash-install --incremental

# Force full reinstallation
flash-install --no-incremental
```

Incremental updates significantly reduce installation time when only a few dependencies have changed.

## Benchmarks

Here are some benchmark comparisons between flash-install and other package managers:

| Package Manager | Small Project | Medium Project | Large Project | Monorepo |
|-----------------|---------------|----------------|---------------|----------|
| flash-install   | 2.1s          | 8.5s           | 25.7s         | 45.2s    |
| npm             | 5.3s          | 22.1s          | 68.3s         | 124.5s   |
| yarn            | 3.8s          | 15.7s          | 42.1s         | 89.3s    |
| pnpm            | 2.9s          | 12.3s          | 35.6s         | 67.8s    |

*Note: These benchmarks are illustrative and may vary based on system configuration, network speed, and project structure.*

## Performance Profiling

You can enable performance profiling to identify bottlenecks:

```bash
# Enable performance profiling
flash-install --profile

# Save profile to a file
flash-install --profile --profile-output profile.json
```

The profile output can be loaded into Chrome DevTools for analysis.

## Best Practices for Maximum Performance

1. **Use the Cache**: The cache is enabled by default and significantly improves performance
2. **Use Snapshots**: Create and restore snapshots for the fastest installation
3. **Optimize Concurrency**: Adjust concurrency settings based on your system
4. **Use Incremental Updates**: Avoid full reinstallations when possible
5. **Optimize the Cache**: Regularly run `flash-install cache --optimize`
6. **Use Cloud Cache**: Share cache across machines with `--cloud-cache`
7. **Use Workspace Optimizations**: Enable hoisting and parallel installation in monorepos

## Configuration

You can configure performance settings in your package.json:

```json
{
  "flash-install": {
    "performance": {
      "concurrency": 8,
      "downloadConcurrency": 10,
      "extractConcurrency": 6,
      "maxMemory": 1024,
      "lowMemory": false,
      "cacheCompression": 6,
      "streamingExtraction": true,
      "incremental": true
    }
  }
}
```

## Environment Variables

You can also use environment variables to configure performance:

```bash
FLASH_CONCURRENCY=8
FLASH_DOWNLOAD_CONCURRENCY=10
FLASH_EXTRACT_CONCURRENCY=6
FLASH_MAX_MEMORY=1024
FLASH_LOW_MEMORY=false
FLASH_CACHE_COMPRESSION=6
FLASH_STREAMING_EXTRACTION=true
FLASH_INCREMENTAL=true
```

## Troubleshooting

### High Memory Usage

If flash-install is using too much memory:

1. Enable low-memory mode with `--low-memory`
2. Reduce concurrency with `--concurrency 4`
3. Set a memory limit with `--max-memory 512`
4. Disable streaming extraction with `--no-streaming-extraction`

### Slow Installation

If installation is slow:

1. Ensure the cache is enabled (it is by default)
2. Increase concurrency with `--concurrency 12`
3. Use snapshots with `flash-install snapshot` and `flash-install restore`
4. Optimize the cache with `flash-install cache --optimize`
5. Use the cloud cache with `--cloud-cache`

### Disk Space Issues

If you're running low on disk space:

1. Clean the cache with `flash-install cache --clean`
2. Increase cache compression with `--cache-compression 9`
3. Use the `--production` flag to skip development dependencies
