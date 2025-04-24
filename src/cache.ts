import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { logger } from './utils/logger.js';
import * as fsUtils from './utils/fs.js';
import { hashPackage, hashDependencyTree } from './utils/hash.js';
import { Timer, createTimer } from './utils/timer.js';
import { Spinner, ProgressIndicator } from './utils/progress.js';

/**
 * Default cache directory location
 */
const DEFAULT_CACHE_DIR = path.join(os.homedir(), '.flash-install', 'cache');

/**
 * Cache entry metadata
 */
interface CacheEntryMetadata {
  name: string;
  version: string;
  hash: string;
  timestamp: number;
  size: number;
}

/**
 * Cache manager for flash-install
 */
export class Cache {
  public cacheDir: string;
  private metadataFile: string;
  private metadata: Map<string, CacheEntryMetadata> = new Map();

  /**
   * Create a new cache manager
   * @param cacheDir The cache directory path
   */
  constructor(cacheDir = DEFAULT_CACHE_DIR) {
    this.cacheDir = cacheDir;
    this.metadataFile = path.join(this.cacheDir, 'metadata.json');
  }

  /**
   * Initialize the cache
   */
  async init(): Promise<void> {
    await fsUtils.ensureDir(this.cacheDir);
    await this.loadMetadata();
  }

  /**
   * Load cache metadata from disk
   */
  private async loadMetadata(): Promise<void> {
    try {
      if (await fsUtils.fileExists(this.metadataFile)) {
        const data = await fs.readJSON(this.metadataFile);
        this.metadata = new Map(Object.entries(data));
      }
    } catch (error) {
      logger.warn(`Failed to load cache metadata: ${error}`);
      this.metadata = new Map();
    }
  }

  /**
   * Save cache metadata to disk
   */
  private async saveMetadata(): Promise<void> {
    try {
      const data = Object.fromEntries(this.metadata);
      await fs.writeJSON(this.metadataFile, data, { spaces: 2 });
    } catch (error) {
      logger.warn(`Failed to save cache metadata: ${error}`);
    }
  }

  /**
   * Get the path for a package in the cache
   * @param name The package name
   * @param version The package version
   * @returns The cache path
   */
  getPackagePath(name: string, version: string): string {
    const hash = hashPackage(name, version);
    return path.join(this.cacheDir, 'packages', hash.substring(0, 2), hash);
  }

  /**
   * Get the path for a dependency tree in the cache
   * @param dependencies The dependency tree
   * @returns The cache path
   */
  getDependencyTreePath(dependencies: Record<string, string>): string {
    const hash = hashDependencyTree(dependencies);
    return path.join(this.cacheDir, 'trees', hash.substring(0, 2), hash);
  }

  /**
   * Check if a package exists in the cache
   * @param name The package name
   * @param version The package version
   * @returns True if the package is cached
   */
  async hasPackage(name: string, version: string): Promise<boolean> {
    const cachePath = this.getPackagePath(name, version);
    return fsUtils.directoryExists(cachePath);
  }

  /**
   * Check if a dependency tree exists in the cache
   * @param dependencies The dependency tree
   * @returns True if the tree is cached
   */
  async hasDependencyTree(dependencies: Record<string, string>): Promise<boolean> {
    const cachePath = this.getDependencyTreePath(dependencies);
    return fsUtils.directoryExists(cachePath);
  }

  /**
   * Add a package to the cache
   * @param name The package name
   * @param version The package version
   * @param sourcePath The path to the package contents
   * @returns True if successful
   */
  async addPackage(name: string, version: string, sourcePath: string): Promise<boolean> {
    try {
      const cachePath = this.getPackagePath(name, version);

      // Skip if already cached
      if (await fsUtils.directoryExists(cachePath)) {
        return true;
      }

      // Copy to cache
      await fsUtils.copy(sourcePath, cachePath, true);

      // Update metadata
      const hash = hashPackage(name, version);
      const size = await fsUtils.getSize(cachePath);

      this.metadata.set(hash, {
        name,
        version,
        hash,
        timestamp: Date.now(),
        size
      });

      await this.saveMetadata();
      return true;
    } catch (error) {
      logger.error(`Failed to add package ${name}@${version} to cache: ${error}`);
      return false;
    }
  }

  /**
   * Add a dependency tree to the cache
   * @param dependencies The dependency tree
   * @param sourcePath The path to the node_modules directory
   * @returns True if successful
   */
  async addDependencyTree(dependencies: Record<string, string>, sourcePath: string): Promise<boolean> {
    try {
      const cachePath = this.getDependencyTreePath(dependencies);

      // Skip if already cached
      if (await fsUtils.directoryExists(cachePath)) {
        return true;
      }

      // Copy to cache
      await fsUtils.copy(sourcePath, cachePath, true);

      // Update metadata
      const hash = hashDependencyTree(dependencies);
      const size = await fsUtils.getSize(cachePath);

      this.metadata.set(hash, {
        name: 'tree',
        version: hash.substring(0, 8),
        hash,
        timestamp: Date.now(),
        size
      });

      await this.saveMetadata();
      return true;
    } catch (error) {
      logger.error(`Failed to add dependency tree to cache: ${error}`);
      return false;
    }
  }

  /**
   * Restore a package from the cache
   * @param name The package name
   * @param version The package version
   * @param destPath The destination path
   * @returns True if successful
   */
  async restorePackage(name: string, version: string, destPath: string): Promise<boolean> {
    try {
      const cachePath = this.getPackagePath(name, version);

      if (!await fsUtils.directoryExists(cachePath)) {
        return false;
      }

      await fsUtils.copy(cachePath, destPath, true);
      return true;
    } catch (error) {
      logger.error(`Failed to restore package ${name}@${version} from cache: ${error}`);
      return false;
    }
  }

  /**
   * Restore a dependency tree from the cache
   * @param dependencies The dependency tree
   * @param destPath The destination path
   * @returns True if successful
   */
  async restoreDependencyTree(dependencies: Record<string, string>, destPath: string): Promise<boolean> {
    try {
      // Start timer
      const timer = createTimer();

      // Create spinner
      const spinner = new Spinner('Checking cache for dependency tree');
      spinner.start();

      const cachePath = this.getDependencyTreePath(dependencies);

      if (!await fsUtils.directoryExists(cachePath)) {
        spinner.stop();
        return false;
      }

      // Get cache size for reporting
      const cacheSize = await fsUtils.getSize(cachePath);
      spinner.setMessage(`Restoring ${fsUtils.formatSize(cacheSize)} from cache...`);

      // Ensure destination directory exists
      await fsUtils.ensureDir(path.dirname(destPath));

      // Copy from cache to destination
      await fsUtils.copy(cachePath, destPath, true);

      // Stop spinner
      spinner.stop();

      // Log success with timing information
      logger.success(`Restored dependency tree from cache in ${timer.getElapsedFormatted()}`);

      return true;
    } catch (error) {
      logger.error(`Failed to restore dependency tree from cache: ${error}`);
      return false;
    }
  }

  /**
   * Clean old entries from the cache
   * @param maxAge Maximum age in milliseconds
   * @returns Number of entries removed
   */
  async clean(maxAge = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    // Start timer
    const timer = createTimer();

    // Create spinner
    const spinner = new Spinner('Scanning cache for old entries');
    spinner.start();

    let removed = 0;
    let totalSize = 0;
    const now = Date.now();

    // Get entries to remove
    const entriesToRemove: [string, CacheEntryMetadata][] = [];
    for (const [hash, entry] of this.metadata.entries()) {
      if (now - entry.timestamp > maxAge) {
        entriesToRemove.push([hash, entry]);
      }
    }

    // Create progress indicator if we have entries to remove
    if (entriesToRemove.length > 0) {
      spinner.stop();

      const progress = new ProgressIndicator(
        entriesToRemove.length,
        'Cleaning cache:'
      );

      for (const [hash, entry] of entriesToRemove) {
        let cachePath;

        if (entry.name === 'tree') {
          cachePath = path.join(this.cacheDir, 'trees', hash.substring(0, 2), hash);
        } else {
          cachePath = path.join(this.cacheDir, 'packages', hash.substring(0, 2), hash);
        }

        try {
          // Get size before removing
          const size = await fsUtils.getSize(cachePath);
          totalSize += size;

          // Remove from disk
          await fsUtils.remove(cachePath);

          // Remove from metadata
          this.metadata.delete(hash);
          removed++;
        } catch (error) {
          logger.warn(`Failed to remove cache entry ${hash}: ${error}`);
        }

        progress.update(1);
      }

      progress.complete();
    } else {
      spinner.setMessage('No old cache entries found');
      spinner.stop();
    }

    // Save updated metadata
    await this.saveMetadata();

    // Log results
    if (removed > 0) {
      logger.success(`Removed ${removed} cache entries (${fsUtils.formatSize(totalSize)}) in ${timer.getElapsedFormatted()}`);
    }

    return removed;
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  async getStats(): Promise<{
    entries: number;
    size: number;
    packages: number;
    trees: number;
    oldestEntry?: number;
    newestEntry?: number;
    avgSize: number;
  }> {
    let size = 0;
    let packages = 0;
    let trees = 0;
    let oldestEntry: number | undefined;
    let newestEntry: number | undefined;

    for (const entry of this.metadata.values()) {
      size += entry.size;

      if (entry.name === 'tree') {
        trees++;
      } else {
        packages++;
      }

      // Track oldest and newest entries
      if (oldestEntry === undefined || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }

      if (newestEntry === undefined || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    }

    return {
      entries: this.metadata.size,
      size,
      packages,
      trees,
      oldestEntry,
      newestEntry,
      avgSize: this.metadata.size > 0 ? size / this.metadata.size : 0
    };
  }

  /**
   * Verify cache integrity
   * @returns Number of invalid entries removed
   */
  async verify(): Promise<number> {
    const spinner = new Spinner('Verifying cache integrity');
    spinner.start();

    let removed = 0;
    const entriesToCheck = Array.from(this.metadata.entries());

    for (const [hash, entry] of entriesToCheck) {
      let cachePath;

      if (entry.name === 'tree') {
        cachePath = path.join(this.cacheDir, 'trees', hash.substring(0, 2), hash);
      } else {
        cachePath = path.join(this.cacheDir, 'packages', hash.substring(0, 2), hash);
      }

      // Check if path exists
      if (!await fsUtils.directoryExists(cachePath)) {
        this.metadata.delete(hash);
        removed++;
        continue;
      }

      // Check if size matches
      try {
        const actualSize = await fsUtils.getSize(cachePath);

        // If size is significantly different, remove entry
        if (Math.abs(actualSize - entry.size) > entry.size * 0.1) {
          await fsUtils.remove(cachePath);
          this.metadata.delete(hash);
          removed++;
        }
      } catch (error) {
        // If we can't check size, remove entry
        await fsUtils.remove(cachePath);
        this.metadata.delete(hash);
        removed++;
      }
    }

    // Save updated metadata
    await this.saveMetadata();

    spinner.stop();

    if (removed > 0) {
      logger.info(`Removed ${removed} invalid cache entries`);
    } else {
      logger.info('Cache integrity verified, no issues found');
    }

    return removed;
  }

  /**
   * Optimize cache by deduplicating and compressing
   * @returns Space saved in bytes
   */
  async optimize(): Promise<number> {
    const spinner = new Spinner('Optimizing cache');
    spinner.start();

    let spaceSaved = 0;
    const beforeSize = await this.getTotalSize();

    // TODO: Implement deduplication and compression
    // This would involve finding duplicate files across packages
    // and replacing them with hardlinks

    const afterSize = await this.getTotalSize();
    spaceSaved = beforeSize - afterSize;

    spinner.stop();

    if (spaceSaved > 0) {
      logger.success(`Optimization saved ${fsUtils.formatSize(spaceSaved)}`);
    } else {
      logger.info('Cache already optimized');
    }

    return spaceSaved;
  }

  /**
   * Get total cache size
   * @returns Total size in bytes
   */
  private async getTotalSize(): Promise<number> {
    return fsUtils.getSize(this.cacheDir);
  }

  /**
   * Clear the entire cache
   * @returns True if successful
   */
  async clearAll(): Promise<boolean> {
    try {
      await fsUtils.remove(this.cacheDir);
      await fsUtils.ensureDir(this.cacheDir);
      this.metadata = new Map();
      await this.saveMetadata();
      return true;
    } catch (error) {
      logger.error(`Failed to clear cache: ${error}`);
      return false;
    }
  }
}

// Export a default cache instance
export const cache = new Cache();
