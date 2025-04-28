# Performance Optimizations

Flash Install includes several performance optimizations to make dependency installation as fast and efficient as possible.

## Memory Efficiency

Flash Install is designed to be memory-efficient, even when installing large dependency trees:

- **Adaptive Batch Processing**: Automatically adjusts batch sizes based on memory usage and system capabilities
- **Memory Monitoring**: Tracks memory usage during installation and throttles operations when memory pressure is high
- **Streaming Operations**: Uses streaming for file operations to minimize memory footprint
- **Garbage Collection**: Strategically triggers garbage collection to free memory during intensive operations

## Cache Optimizations

The cache system is optimized for both speed and storage efficiency:

### Compression

Flash Install can compress cache entries to save disk space:

```bash
# Enable compression (default)
flash-install --cache-compression

# Disable compression
flash-install --no-cache-compression

# Set compression level (1-9)
flash-install --cache-compression-level 6

# Set compression format
flash-install --cache-compression-format gzip
```

### Deduplication

The cache automatically deduplicates identical files across packages using hardlinks:

```bash
# Optimize the cache
flash-install clean --optimize
```

### Integrity Checking

Flash Install can verify the integrity of cached packages:

```bash
# Enable integrity checking (default)
flash-install --cache-integrity-check

# Disable integrity checking
flash-install --no-cache-integrity-check

# Verify cache integrity
flash-install clean --verify
```

## Snapshot Streaming

Snapshot creation and restoration use streaming extraction for better performance:

- **Native Tools**: Uses native `tar` and `unzip` commands when available for maximum speed
- **Streaming Extraction**: Falls back to streaming extraction for cross-platform compatibility
- **Parallel Processing**: Extracts files in parallel when possible
- **Progress Tracking**: Provides accurate progress information during extraction

## Worker Pool Optimizations

The worker pool is optimized for parallel operations:

- **Dynamic Concurrency**: Adjusts the number of concurrent operations based on system capabilities
- **Task Timing**: Tracks task execution times to optimize batch sizes
- **Error Handling**: Includes automatic retries with exponential backoff
- **Resource Monitoring**: Monitors CPU and memory usage to prevent overloading the system

## Benchmarks

Here are some benchmarks comparing Flash Install to other package managers:

| Package Manager | Cold Install | Warm Install | Restore from Snapshot |
|----------------|--------------|--------------|----------------------|
| npm            | 45.2s        | 12.3s        | N/A                  |
| yarn           | 38.7s        | 10.1s        | N/A                  |
| pnpm           | 22.5s        | 8.2s         | N/A                  |
| flash-install  | 18.3s        | 3.5s         | 1.2s                 |

*Benchmark on a project with 1,200 dependencies on a MacBook Pro M1

## Configuration

You can configure performance-related settings in your `.flashrc.json` file:

```json
{
  "performance": {
    "concurrency": 8,
    "memoryLimit": "80%",
    "useStreaming": true,
    "useHardlinks": true
  },
  "cache": {
    "compression": true,
    "compressionFormat": "gzip",
    "compressionLevel": 6,
    "integrityCheck": true
  }
}
```

## Best Practices

1. **Use Snapshots**: Create snapshots for frequently used dependency trees
2. **Optimize Cache**: Run `flash-install clean --optimize` periodically
3. **Adjust Concurrency**: Set concurrency based on your system's capabilities
4. **Use Streaming**: Keep streaming enabled for better memory efficiency
5. **Enable Compression**: Use compression for large caches to save disk space
