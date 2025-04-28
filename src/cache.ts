import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import zlib from 'zlib';
import crypto from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { execSync } from 'child_process';
import archiver from 'archiver';
import tarStream from 'tar-stream';
import { logger } from './utils/logger.js';
import * as fsUtils from './utils/fs.js';
import { hashPackage, hashDependencyTree } from './utils/hash.js';
import { Timer, createTimer } from './utils/timer.js';
import { Spinner, ProgressIndicator } from './utils/progress.js';
import { ReliableProgress } from './utils/reliable-progress.js';
import { performance } from 'perf_hooks';
import { cloudCache, CloudCacheConfig, SyncPolicy } from './cloud/cloud-cache.js';

// Define TarExtract class with proper typing
interface TarHeader {
  name: string;
  type: string;
}

interface TarNext {
  (err?: Error): void;
}

type TarExtractType = {
  new(): tarStream.Extract;
  prototype: tarStream.Extract;
};

const TarExtract = tarStream.extract as unknown as TarExtractType;

/**
 * Default cache directory location
 */
const DEFAULT_CACHE_DIR = path.join(os.homedir(), '.flash-install', 'cache');

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Cache directory path */
  cacheDir?: string;
  /** Whether to compress cache entries */
  compression?: boolean;
  /** Compression format (gzip, brotli) */
  compressionFormat?: 'gzip' | 'brotli';
  /** Compression level (1-9) */
  compressionLevel?: number;
  /** Whether to calculate integrity hashes */
  integrityCheck?: boolean;
  /** Maximum cache size in bytes */
  maxSize?: number;
  /** Maximum age of cache entries in milliseconds */
  maxAge?: number;
  /** Whether to use streaming operations */
  useStreaming?: boolean;
  /** Whether to use hardlinks */
  useHardlinks?: boolean;
  /** Cloud cache configuration */
  cloud?: CloudCacheConfig;
}

/**
 * Default cache options
 */
const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  compression: true,
  compressionFormat: 'gzip',
  compressionLevel: 6,
  integrityCheck: true,
  useStreaming: true,
  useHardlinks: true
};

/**
 * Cache entry metadata
 */
interface CacheEntryMetadata {
  name: string;
  version: string;
  hash: string;
  timestamp: number;
  size: number;
  originalSize?: number;
  compressed?: boolean;
  compressionFormat?: string;
  compressionLevel?: number;
  integrityHash?: string;
}

/**
 * Cache manager for flash-install
 */
export class Cache {
  public cacheDir: string;
  private metadataFile: string;
  private metadata: Map<string, CacheEntryMetadata> = new Map();
  private options: CacheOptions;

  /**
   * Create a new cache manager
   * @param options Cache options
   */
  constructor(options: CacheOptions = {}) {
    this.options = { ...DEFAULT_CACHE_OPTIONS, ...options };
    this.cacheDir = this.options.cacheDir || DEFAULT_CACHE_DIR;
    this.metadataFile = path.join(this.cacheDir, 'metadata.json');
  }

  /**
   * Initialize the cache
   */
  async init(): Promise<void> {
    await fsUtils.ensureDir(this.cacheDir);
    await this.loadMetadata();
    await this.loadConfig();

    // Initialize cloud cache if configured
    if (this.options.cloud) {
      try {
        await cloudCache.init(this.options.cloud);
        logger.debug('Cloud cache initialized successfully');
      } catch (error) {
        logger.warn(`Failed to initialize cloud cache: ${error}`);
      }
    }
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

      // Start timer
      const startTime = performance.now();

      // Get original size for reporting
      const originalSize = await fsUtils.getSize(sourcePath);

      // Create metadata entry
      const hash = hashPackage(name, version);
      const metadata: CacheEntryMetadata = {
        name,
        version,
        hash,
        timestamp: Date.now(),
        size: originalSize,
        originalSize
      };

      // Calculate integrity hash if enabled
      if (this.options.integrityCheck) {
        metadata.integrityHash = await this.calculateIntegrityHash(sourcePath);
      }

      // Determine if we should compress
      const shouldCompress = this.options.compression && originalSize > 10 * 1024; // Only compress if > 10KB

      if (shouldCompress) {
        // Compress and store
        const compressedPath = `${cachePath}.${this.options.compressionFormat}`;

        // Ensure parent directory exists
        await fsUtils.ensureDir(path.dirname(compressedPath));

        // Compress with streaming
        await this.compressDirectory(sourcePath, compressedPath);

        // Update metadata
        const compressedSize = await fsUtils.getSize(compressedPath);
        metadata.size = compressedSize;
        metadata.compressed = true;
        metadata.compressionFormat = this.options.compressionFormat;
        metadata.compressionLevel = this.options.compressionLevel;

        // Log compression ratio
        const ratio = (1 - (compressedSize / originalSize)) * 100;
        logger.debug(`Compressed ${name}@${version}: ${fsUtils.formatSize(originalSize)} → ${fsUtils.formatSize(compressedSize)} (${ratio.toFixed(1)}% reduction)`);
      } else {
        // Copy to cache using streaming or hardlinks
        await fsUtils.copy(
          sourcePath,
          cachePath,
          this.options.useHardlinks,
          this.options.useStreaming ? (copied, total) => {
            // Progress callback
            if (copied === total) {
              logger.debug(`Cached ${name}@${version}: ${fsUtils.formatSize(total)}`);
            }
          } : undefined
        );
      }

      // Update metadata
      this.metadata.set(hash, metadata);
      await this.saveMetadata();

      // Sync with cloud cache if configured
      if (this.options.cloud && cloudCache.isInitialized() && cloudCache.isEnabled()) {
        try {
          await cloudCache.syncPackage(name, version, cachePath);
        } catch (error) {
          logger.warn(`Failed to sync package ${name}@${version} with cloud cache: ${error}`);
          // Continue anyway
        }
      }

      // Calculate and log performance
      const endTime = performance.now();
      const elapsedMs = endTime - startTime;
      logger.debug(`Added ${name}@${version} to cache in ${elapsedMs.toFixed(0)}ms`);

      return true;
    } catch (error) {
      logger.error(`Failed to add package ${name}@${version} to cache: ${error}`);
      return false;
    }
  }

  /**
   * Calculate integrity hash for a directory
   * @param dirPath Directory path
   * @returns Integrity hash
   */
  private async calculateIntegrityHash(dirPath: string): Promise<string> {
    try {
      // Get all files in the directory
      const files = await fsUtils.getAllFiles(dirPath);

      // Sort files for consistent hashing
      files.sort();

      // Create a hash of file paths and their contents
      const hash = crypto.createHash('sha256');

      // Process each file
      for (const file of files) {
        // Get relative path
        const relativePath = path.relative(dirPath, file);

        // Add path to hash
        hash.update(relativePath);

        // Read file in chunks to avoid memory issues
        const fileStream = createReadStream(file);

        // Process file chunks
        for await (const chunk of fileStream) {
          hash.update(chunk);
        }
      }

      // Return hash as hex string
      return hash.digest('hex');
    } catch (error) {
      logger.debug(`Failed to calculate integrity hash: ${error}`);
      return '';
    }
  }

  /**
   * Compress a directory to a file
   * @param sourcePath Source directory path
   * @param destPath Destination file path
   */
  private async compressDirectory(sourcePath: string, destPath: string): Promise<void> {
    // Get all files in the directory
    const files = await fsUtils.getAllFiles(sourcePath);

    // Create write stream
    const writeStream = createWriteStream(destPath);

    // Create compression stream
    let compressionStream;
    if (this.options.compressionFormat === 'gzip') {
      compressionStream = zlib.createGzip({
        level: this.options.compressionLevel || 6
      });
    } else if (this.options.compressionFormat === 'brotli') {
      compressionStream = zlib.createBrotliCompress({
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: this.options.compressionLevel || 6
        }
      });
    } else {
      // Default to gzip
      compressionStream = zlib.createGzip({
        level: this.options.compressionLevel || 6
      });
    }

    // Create tar archive
    const archive = archiver('tar');

    // Pipe archive through compression to file
    archive.pipe(compressionStream).pipe(writeStream);

    // Add each file to the archive
    for (const file of files) {
      const relativePath = path.relative(sourcePath, file);
      archive.file(file, { name: relativePath });
    }

    // Finalize the archive
    await archive.finalize();

    // Wait for streams to finish
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
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
      const hash = hashDependencyTree(dependencies);

      // Skip if already cached
      if (await fsUtils.directoryExists(cachePath)) {
        logger.info(`Dependency tree already in cache: ${hash.substring(0, 8)}`);
        return true;
      }

      // Ensure cache directory exists
      await fsUtils.ensureDir(cachePath);

      // Get all top-level packages in node_modules
      const entries = await fs.readdir(sourcePath);

      // Create a progress indicator
      const progress = new ReliableProgress('Caching dependencies');
      progress.start();

      let processed = 0;
      const total = entries.length;

      // Process each package individually to avoid issues with large directories
      for (const entry of entries) {
        try {
          // Skip hidden files and special directories
          if (entry.startsWith('.') || entry === 'node_modules') {
            processed++;
            continue;
          }

          const entryPath = path.join(sourcePath, entry);
          const destPath = path.join(cachePath, entry);

          // Update progress
          progress.updateStatus(`Caching ${entry} (${processed + 1}/${total})`);

          // Check if it's a directory
          const stats = await fs.stat(entryPath);
          if (stats.isDirectory()) {
            // Copy directory
            await fsUtils.ensureDir(destPath);
            await fsUtils.copy(entryPath, destPath, true);
          } else {
            // Copy file
            await fs.copyFile(entryPath, destPath);
          }

          processed++;
        } catch (error) {
          logger.warn(`Failed to cache ${entry}: ${error}`);
          // Continue with next entry
        }
      }

      progress.stop();

      // Update metadata
      const size = await fsUtils.getSize(cachePath);

      this.metadata.set(hash, {
        name: 'tree',
        version: hash.substring(0, 8),
        hash,
        timestamp: Date.now(),
        size
      });

      await this.saveMetadata();

      // Sync with cloud cache if configured
      if (this.options.cloud && cloudCache.isInitialized() && cloudCache.isEnabled()) {
        try {
          await cloudCache.syncDependencyTree(dependencies, cachePath);
        } catch (error) {
          logger.warn(`Failed to sync dependency tree with cloud cache: ${error}`);
          // Continue anyway
        }
      }

      logger.success(`Added dependency tree to cache: ${hash.substring(0, 8)} (${fsUtils.formatSize(size)})`);
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
      const hash = hashPackage(name, version);
      const cachePath = this.getPackagePath(name, version);

      // Get metadata
      const metadata = this.metadata.get(hash);

      // Start timer
      const startTime = performance.now();

      // Check if package is compressed
      if (metadata?.compressed) {
        // Get compressed file path
        const compressedPath = `${cachePath}.${metadata.compressionFormat}`;

        // Check if compressed file exists
        if (!await fsUtils.fileExists(compressedPath)) {
          logger.debug(`Compressed package not found: ${compressedPath}`);

          // Try to get from cloud cache if configured
          if (this.options.cloud && cloudCache.isInitialized() && cloudCache.isEnabled()) {
            try {
              const downloaded = await cloudCache.downloadPackage(name, version, destPath);
              if (downloaded) {
                logger.success(`Downloaded ${name}@${version} from cloud cache`);
                return true;
              }
            } catch (error) {
              logger.debug(`Failed to download package ${name}@${version} from cloud cache: ${error}`);
            }
          }

          return false;
        }

        // Ensure destination directory exists
        await fsUtils.ensureDir(destPath);

        // Extract compressed package
        await this.extractCompressedDirectory(compressedPath, destPath, metadata.compressionFormat);

        // Verify integrity if enabled
        if (this.options.integrityCheck && metadata.integrityHash) {
          const currentHash = await this.calculateIntegrityHash(destPath);
          if (currentHash !== metadata.integrityHash) {
            logger.warn(`Integrity check failed for ${name}@${version}`);
            // Continue anyway, but log the warning
          }
        }
      } else {
        // Check if uncompressed directory exists
        if (!await fsUtils.directoryExists(cachePath)) {
          logger.debug(`Package not found in cache: ${cachePath}`);
          return false;
        }

        // Copy from cache using streaming
        await fsUtils.copy(
          cachePath,
          destPath,
          this.options.useHardlinks,
          this.options.useStreaming ? (copied, total) => {
            // Progress callback (only log completion)
            if (copied === total) {
              const endTime = performance.now();
              const elapsedMs = endTime - startTime;
              logger.debug(`Restored ${name}@${version} (${fsUtils.formatSize(total)}) in ${elapsedMs.toFixed(0)}ms`);
            }
          } : undefined
        );
      }

      // Calculate and log performance if not already logged
      if (!this.options.useStreaming || metadata?.compressed) {
        const endTime = performance.now();
        const elapsedMs = endTime - startTime;
        const size = metadata?.originalSize || await fsUtils.getSize(destPath);
        logger.debug(`Restored ${name}@${version} (${fsUtils.formatSize(size)}) in ${elapsedMs.toFixed(0)}ms`);
      }

      return true;
    } catch (error) {
      logger.error(`Failed to restore package ${name}@${version} from cache: ${error}`);
      return false;
    }
  }

  /**
   * Extract a compressed directory
   * @param compressedPath Path to compressed file
   * @param destPath Destination directory
   * @param format Compression format
   */
  private async extractCompressedDirectory(
    compressedPath: string,
    destPath: string,
    format: string = 'gzip'
  ): Promise<void> {
    // Ensure destination directory exists
    await fsUtils.ensureDir(destPath);

    // Create read stream
    const readStream = createReadStream(compressedPath);

    // Create decompression stream
    let decompressionStream;
    if (format === 'gzip') {
      decompressionStream = zlib.createGunzip();
    } else if (format === 'brotli') {
      decompressionStream = zlib.createBrotliDecompress();
    } else {
      // Default to gunzip
      decompressionStream = zlib.createGunzip();
    }

    // Use native extraction if available (much faster)
    if (format === 'gzip' && process.platform !== 'win32') {
      try {
        // Close streams
        readStream.destroy();
        decompressionStream.destroy();

        // Use tar command
        execSync(`tar -xzf "${compressedPath}" -C "${destPath}"`, { stdio: 'ignore' });
        return;
      } catch (error) {
        logger.debug(`Native extraction failed, falling back to streaming: ${error}`);
        // Recreate streams
        const readStream = createReadStream(compressedPath);
        const decompressionStream = zlib.createGunzip();
      }
    }

    // Create extract stream
    const extract = new TarExtract();

    // Handle extracted entries
    extract.on('entry', async (header: TarHeader, stream: NodeJS.ReadableStream, next: TarNext) => {
      try {
        // Get file path
        const filePath = path.join(destPath, header.name);

        // Create directory if needed
        if (header.type === 'directory') {
          await fsUtils.ensureDir(filePath);
          stream.resume();
          next();
          return;
        }

        // Ensure parent directory exists
        await fsUtils.ensureDir(path.dirname(filePath));

        // Create write stream
        const writeStream = createWriteStream(filePath);

        // Pipe data to file
        stream.pipe(writeStream);

        // Handle completion
        writeStream.on('finish', () => {
          next();
        });

        // Handle errors
        writeStream.on('error', (error) => {
          logger.error(`Failed to write file ${filePath}: ${error}`);
          next(error instanceof Error ? error : new Error(String(error)));
        });
      } catch (error) {
        logger.error(`Failed to process entry ${header.name}: ${error}`);
        next(error instanceof Error ? error : new Error(String(error)));
      }
    });

    // Pipe streams together
    await pipeline(readStream, decompressionStream, extract);
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

      // Create progress indicator
      const progress = new ReliableProgress('Restoring from cache');
      progress.start();

      const cachePath = this.getDependencyTreePath(dependencies);
      const hash = hashDependencyTree(dependencies);

      // Check if cache exists
      if (!await fsUtils.directoryExists(cachePath)) {
        // Try to get from cloud cache if configured
        if (this.options.cloud && cloudCache.isInitialized() && cloudCache.isEnabled()) {
          try {
            progress.updateStatus('Checking cloud cache...');
            const downloaded = await cloudCache.downloadDependencyTree(dependencies, destPath);
            if (downloaded) {
              progress.stop();
              logger.success(`Downloaded dependency tree from cloud cache`);
              return true;
            }
          } catch (error) {
            logger.debug(`Failed to download dependency tree from cloud cache: ${error}`);
          }
        }

        progress.stop();
        logger.warn(`Dependency tree not found in cache: ${hash.substring(0, 8)}`);
        return false;
      }

      // Get all entries in the cache directory
      const entries = await fs.readdir(cachePath);

      // Ensure destination directory exists
      await fsUtils.ensureDir(destPath);

      // Process each entry individually
      let processed = 0;
      const total = entries.length;

      for (const entry of entries) {
        try {
          // Skip hidden files and special directories
          if (entry.startsWith('.') || entry === 'node_modules') {
            processed++;
            continue;
          }

          const sourcePath = path.join(cachePath, entry);
          const targetPath = path.join(destPath, entry);

          // Update progress
          progress.updateStatus(`Restoring ${entry} (${processed + 1}/${total})`);

          // Check if it's a directory
          const stats = await fs.stat(sourcePath);
          if (stats.isDirectory()) {
            // Copy directory
            await fsUtils.ensureDir(targetPath);
            await fsUtils.copy(sourcePath, targetPath, true);
          } else {
            // Copy file
            await fs.copyFile(sourcePath, targetPath);
          }

          processed++;
        } catch (error) {
          logger.warn(`Failed to restore ${entry}: ${error}`);
          // Continue with next entry
        }
      }

      // Stop progress indicator
      progress.stop();

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
   * Get cache options
   * @returns Cache options
   */
  getOptions(): CacheOptions {
    return this.options;
  }

  /**
   * Set cache options
   * @param options Cache options
   */
  setOptions(options: CacheOptions): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get cache metadata
   * @returns Cache metadata
   */
  getMetadata(): Map<string, CacheEntryMetadata> {
    return this.metadata;
  }

  /**
   * Save cache configuration
   */
  async saveConfig(): Promise<void> {
    try {
      const configPath = path.join(this.cacheDir, 'config.json');
      await fs.writeJSON(configPath, this.options, { spaces: 2 });
      logger.debug('Cache configuration saved');
    } catch (error) {
      logger.warn(`Failed to save cache configuration: ${error}`);
    }
  }

  /**
   * Load cache configuration
   */
  async loadConfig(): Promise<void> {
    try {
      const configPath = path.join(this.cacheDir, 'config.json');
      if (await fsUtils.fileExists(configPath)) {
        const config = await fs.readJSON(configPath);
        this.options = { ...this.options, ...config };
        logger.debug('Cache configuration loaded');
      }
    } catch (error) {
      logger.warn(`Failed to load cache configuration: ${error}`);
    }
  }

  /**
   * Get dependencies from hash
   * @param hash Dependency tree hash
   * @returns Dependencies or undefined if not found
   */
  getDependenciesFromHash(hash: string): Record<string, string> | undefined {
    // This is a best-effort function to reconstruct dependencies from a hash
    // It's not guaranteed to work, but it's better than nothing

    // Check if we have a record of this hash in the metadata
    const entry = this.metadata.get(hash);
    if (!entry || entry.name !== 'tree') {
      return undefined;
    }

    // Try to reconstruct dependencies from the tree directory
    const treePath = path.join(this.cacheDir, 'trees', hash.substring(0, 2), hash);

    try {
      // Check if there's a package.json file in the tree directory
      const packageJsonPath = path.join(treePath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = fs.readJSONSync(packageJsonPath);
        return packageJson.dependencies || {};
      }

      // If no package.json, try to reconstruct from directory names
      const entries = fs.readdirSync(treePath);
      const dependencies: Record<string, string> = {};

      for (const entry of entries) {
        // Skip hidden files and special directories
        if (entry.startsWith('.') || entry === 'node_modules') {
          continue;
        }

        // Try to get version from package.json
        const entryPackageJsonPath = path.join(treePath, entry, 'package.json');
        if (fs.existsSync(entryPackageJsonPath)) {
          const packageJson = fs.readJSONSync(entryPackageJsonPath);
          dependencies[entry] = packageJson.version || 'latest';
        } else {
          dependencies[entry] = 'latest';
        }
      }

      return dependencies;
    } catch (error) {
      logger.debug(`Failed to reconstruct dependencies from hash ${hash}: ${error}`);
      return undefined;
    }
  }

  /**
   * Get total cache size
   * @returns Total cache size in bytes
   */
  async getTotalSize(): Promise<number> {
    return fsUtils.getSize(this.cacheDir);
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
    // Create progress indicator
    const progress = new ReliableProgress('Optimizing cache');
    progress.start();

    let spaceSaved = 0;
    const beforeSize = await this.getTotalSize();

    // Get all entries
    const entries = Array.from(this.metadata.entries());

    // Skip if no entries
    if (entries.length === 0) {
      progress.stop();
      logger.info('No cache entries to optimize');
      return 0;
    }

    progress.updateStatus(`Analyzing ${entries.length} cache entries...`);

    // Find uncompressed entries that should be compressed
    const toCompress: [string, CacheEntryMetadata][] = [];

    for (const [hash, entry] of entries) {
      // Skip already compressed entries
      if (entry.compressed) {
        continue;
      }

      // Skip small entries
      if (entry.size < 50 * 1024) { // 50KB
        continue;
      }

      // Add to compression list
      toCompress.push([hash, entry]);
    }

    // Compress entries
    if (toCompress.length > 0) {
      progress.updateStatus(`Compressing ${toCompress.length} entries...`);

      let compressed = 0;
      let totalSaved = 0;

      for (const [hash, entry] of toCompress) {
        try {
          // Get cache path
          let cachePath;
          if (entry.name === 'tree') {
            cachePath = path.join(this.cacheDir, 'trees', hash.substring(0, 2), hash);
          } else {
            cachePath = path.join(this.cacheDir, 'packages', hash.substring(0, 2), hash);
          }

          // Skip if not found
          if (!await fsUtils.directoryExists(cachePath)) {
            continue;
          }

          // Get original size
          const originalSize = await fsUtils.getSize(cachePath);

          // Update progress
          progress.updateStatus(`Compressing ${entry.name === 'tree' ? 'tree' : `${entry.name}@${entry.version}`} (${compressed + 1}/${toCompress.length})`);

          // Compress
          const compressedPath = `${cachePath}.${this.options.compressionFormat}`;
          await this.compressDirectory(cachePath, compressedPath);

          // Get compressed size
          const compressedSize = await fsUtils.getSize(compressedPath);

          // Calculate space saved
          const saved = originalSize - compressedSize;

          // Only keep compressed version if it saves space
          if (saved > 0) {
            // Update metadata
            entry.compressed = true;
            entry.compressionFormat = this.options.compressionFormat;
            entry.compressionLevel = this.options.compressionLevel;
            entry.originalSize = originalSize;
            entry.size = compressedSize;

            // Remove original directory
            await fsUtils.remove(cachePath);

            // Update counters
            totalSaved += saved;
            compressed++;

            // Log compression ratio
            const ratio = (1 - (compressedSize / originalSize)) * 100;
            logger.debug(`Compressed ${entry.name === 'tree' ? 'tree' : `${entry.name}@${entry.version}`}: ${fsUtils.formatSize(originalSize)} → ${fsUtils.formatSize(compressedSize)} (${ratio.toFixed(1)}% reduction)`);
          } else {
            // Remove compressed file if it doesn't save space
            await fsUtils.remove(compressedPath);
          }
        } catch (error) {
          logger.warn(`Failed to compress ${entry.name === 'tree' ? 'tree' : `${entry.name}@${entry.version}`}: ${error}`);
        }
      }

      // Update space saved
      spaceSaved += totalSaved;

      // Save metadata
      await this.saveMetadata();

      // Log results
      if (compressed > 0) {
        logger.success(`Compressed ${compressed} entries, saved ${fsUtils.formatSize(totalSaved)}`);
      }
    }

    // Find duplicate files and replace with hardlinks
    if (this.options.useHardlinks) {
      progress.updateStatus('Finding duplicate files...');

      // Get all uncompressed entries
      const uncompressedEntries = entries.filter(([_, entry]) => !entry.compressed);

      // Skip if no uncompressed entries
      if (uncompressedEntries.length > 1) {
        // Build file hash map
        const fileHashes = new Map<string, string[]>();

        // Process each entry
        for (const [hash, entry] of uncompressedEntries) {
          try {
            // Get cache path
            let cachePath;
            if (entry.name === 'tree') {
              cachePath = path.join(this.cacheDir, 'trees', hash.substring(0, 2), hash);
            } else {
              cachePath = path.join(this.cacheDir, 'packages', hash.substring(0, 2), hash);
            }

            // Skip if not found
            if (!await fsUtils.directoryExists(cachePath)) {
              continue;
            }

            // Get all files
            const files = await fsUtils.getAllFiles(cachePath);

            // Process each file
            for (const file of files) {
              // Skip small files
              const stats = await fs.stat(file);
              if (stats.size < 4096) { // 4KB
                continue;
              }

              // Calculate file hash
              const fileHash = await this.calculateFileHash(file);

              // Add to hash map
              if (!fileHashes.has(fileHash)) {
                fileHashes.set(fileHash, []);
              }

              fileHashes.get(fileHash)!.push(file);
            }
          } catch (error) {
            logger.warn(`Failed to process ${entry.name === 'tree' ? 'tree' : `${entry.name}@${entry.version}`}: ${error}`);
          }
        }

        // Find duplicates
        let duplicates = 0;
        let hardlinksSaved = 0;

        progress.updateStatus('Deduplicating files...');

        for (const [fileHash, files] of fileHashes.entries()) {
          // Skip if no duplicates
          if (files.length <= 1) {
            continue;
          }

          // Get first file as source
          const sourceFile = files[0];
          const sourceStats = await fs.stat(sourceFile);

          // Replace duplicates with hardlinks
          for (let i = 1; i < files.length; i++) {
            try {
              const targetFile = files[i];

              // Remove target file
              await fsUtils.remove(targetFile);

              // Create hardlink
              await fs.link(sourceFile, targetFile);

              // Update counters
              duplicates++;
              hardlinksSaved += sourceStats.size;
            } catch (error) {
              logger.debug(`Failed to create hardlink: ${error}`);
            }
          }
        }

        // Update space saved
        spaceSaved += hardlinksSaved;

        // Log results
        if (duplicates > 0) {
          logger.success(`Created ${duplicates} hardlinks, saved ${fsUtils.formatSize(hardlinksSaved)}`);
        }
      }
    }

    // Get final size
    const afterSize = await this.getTotalSize();
    const totalSaved = beforeSize - afterSize;

    // Stop progress
    progress.stop();

    // Log results
    if (totalSaved > 0) {
      logger.success(`Optimization saved ${fsUtils.formatSize(totalSaved)} total`);
    } else {
      logger.info('Cache already optimized');
    }

    return totalSaved;
  }

  /**
   * Calculate hash for a single file
   * @param filePath File path
   * @returns File hash
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const hash = crypto.createHash('sha1');
      const stream = createReadStream(filePath);

      stream.on('data', (data) => {
        hash.update(data);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Private method to get total size (implementation detail)
   * @returns Total size in bytes
   */
  private async _getTotalSize(): Promise<number> {
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

// Export a default cache instance with optimized settings
export const cache = new Cache({
  compression: true,
  compressionFormat: 'gzip',
  compressionLevel: 6,
  integrityCheck: true,
  useStreaming: true,
  useHardlinks: true
});
