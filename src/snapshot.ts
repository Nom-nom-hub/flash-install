import path from 'path';
import fs from 'fs-extra';
import archiver from 'archiver';
import decompress from 'decompress';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import zlib from 'zlib';
import { execSync } from 'child_process';
import { logger } from './utils/logger.js';
import * as fsUtils from './utils/fs.js';
import { hashDependencyTree } from './utils/hash.js';
import { cache } from './cache.js';
import { Timer, createTimer } from './utils/timer.js';
import { Spinner } from './utils/progress.js';

import {
  createSnapshotFingerprint,
  verifySnapshotFingerprint,
  getLockfilePath,
  SnapshotFingerprint
} from './utils/integrity.js';

/**
 * Snapshot format options *
 */
export enum SnapshotFormat {
  ZIP = 'zip',
  TAR = 'tar',
  TAR_GZ = 'tar.gz'
}

// Helper function to check format
function isZipFormat(format: SnapshotFormat): boolean {
  return format === SnapshotFormat.ZIP;
}

/**
 * Snapshot options
 */
export interface SnapshotOptions {
  format: SnapshotFormat;
  compressionLevel: number;
  includeDevDependencies: boolean;
  cacheTimeout?: string; // Timeout in seconds
}

/**
 * Default snapshot options
 */
const defaultOptions: SnapshotOptions = {
  format: SnapshotFormat.TAR_GZ,
  compressionLevel: 6,
  includeDevDependencies: true
};

/**
 * Snapshot manager for creating and restoring .flashpack archives
 */
export class Snapshot {
  private options: SnapshotOptions;

  /**
   * Create a new snapshot manager
   * @param options Snapshot options
   */
  constructor(options: Partial<SnapshotOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Get the default snapshot path for a project
   * @param projectDir The project directory
   * @returns The snapshot path
   */
  getSnapshotPath(projectDir: string): string {
    return path.join(projectDir, '.flashpack');
  }

  /**
   * Create a snapshot of node_modules
   * @param projectDir The project directory
   * @param dependencies The dependency tree
   * @param outputPath Optional custom output path
   * @returns True if successful
   */
  async create(
    projectDir: string,
    dependencies: Record<string, string>,
    outputPath?: string
  ): Promise<boolean> {
    const nodeModulesPath = path.join(projectDir, 'node_modules');
    const snapshotPath = outputPath || this.getSnapshotPath(projectDir);

    // Check if node_modules exists
    if (!await fsUtils.directoryExists(nodeModulesPath)) {
      logger.error('node_modules directory not found');
      return false;
    }

    try {
      // Start timer
      const timer = createTimer();
      const startTime = Date.now();

      // Very simple progress indicator
      let dots = '';
      const progressInterval = setInterval(() => {
        dots = (dots.length >= 3) ? '' : dots + '.';
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        process.stdout.write(`\rCreating snapshot${dots.padEnd(3)} (${elapsed}s elapsed)${' '.repeat(20)}`);
      }, 500);

      // Create parent directory if needed
      await fsUtils.ensureDir(path.dirname(snapshotPath));

      // Create metadata file with fingerprint
      const metadataPath = path.join(projectDir, '.flashpack-metadata.json');
      const lockfilePath = getLockfilePath(projectDir);
      const fingerprint = await createSnapshotFingerprint(dependencies, lockfilePath);

      await fs.writeJSON(metadataPath, {
        dependencies,
        timestamp: Date.now(),
        format: this.options.format,
        fingerprint
      }, { spaces: 2 });

      // Use native tools for maximum speed
      if (this.options.format === SnapshotFormat.TAR_GZ) {
        // Update progress message
        clearInterval(progressInterval);
        process.stdout.write('\r' + ' '.repeat(80) + '\r');
        process.stdout.write(`\rCreating tar.gz snapshot... ${' '.repeat(20)}`);

        // Use native tar command (much faster than JS libraries)
        execSync(
          `tar -czf "${snapshotPath}" -C "${projectDir}" --exclude=".git" --exclude="node_modules/*/node_modules" .flashpack-metadata.json node_modules`,
          { stdio: 'ignore' }
        );
      }
      else if (isZipFormat(this.options.format)) {
        // Update progress message
        clearInterval(progressInterval);
        process.stdout.write('\r' + ' '.repeat(80) + '\r');
        process.stdout.write(`\rCreating zip snapshot... ${' '.repeat(20)}`);

        // Use native zip command
        execSync(
          `cd "${projectDir}" && zip -r "${snapshotPath}" .flashpack-metadata.json node_modules -x "*.git*" -x "node_modules/*/node_modules/*"`,
          { stdio: 'ignore' }
        );
      }
      else {
        // Fall back to archiver for other formats
        const output = createWriteStream(snapshotPath);
        const format = isZipFormat(this.options.format) ? 'zip' : 'tar';
        const archive = archiver(
          format,
          {
            zlib: { level: this.options.compressionLevel }
          }
        );

        // Track progress
        archive.on('progress', (progress) => {
          const { entries, fs } = progress;
          if (entries.total > 0) {
            const percent = Math.round((entries.processed / entries.total) * 100);
            // Update progress message
            clearInterval(progressInterval);
            process.stdout.write('\r' + ' '.repeat(80) + '\r');
            process.stdout.write(`\rCreating snapshot: ${percent}% (${entries.processed}/${entries.total} files)${' '.repeat(20)}`);
          }

          if (fs.processedBytes > 0) {
            const size = fsUtils.formatSize(fs.processedBytes);
            // Update progress message
            clearInterval(progressInterval);
            process.stdout.write('\r' + ' '.repeat(80) + '\r');
            process.stdout.write(`\rCreating snapshot: ${size} processed${' '.repeat(20)}`);
          }
        });

        // Set up archive
        archive.pipe(output);

        // Add metadata file
        archive.file(metadataPath, { name: '.flashpack-metadata.json' });

        // Add node_modules
        archive.directory(nodeModulesPath, 'node_modules');

        // Finalize and wait for completion
        clearInterval(progressInterval);
        process.stdout.write('\r' + ' '.repeat(80) + '\r');
        process.stdout.write(`\rFinalizing snapshot...${' '.repeat(20)}`);
        await archive.finalize();
      }

      // Remove metadata file
      await fs.remove(metadataPath);

      // Add to cache with timeout
      // Update progress message
      clearInterval(progressInterval);
      process.stdout.write('\r' + ' '.repeat(80) + '\r');
      process.stdout.write(`\rAdding to global cache...${' '.repeat(20)}`);

      // Set a timeout to prevent hanging
      const cacheTimeout = this.options.cacheTimeout ?
        parseInt(this.options.cacheTimeout, 10) * 1000 :
        30000; // Default 30 seconds max for caching

      const cachePromise = cache.addDependencyTree(dependencies, nodeModulesPath);

      try {
        // Log timeout information
        logger.info(`Using cache timeout of ${cacheTimeout/1000}s (use --cache-timeout to change)`);

        // Use Promise.race to implement timeout
        await Promise.race([
          cachePromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Cache operation timed out after ${cacheTimeout/1000}s`)), cacheTimeout)
          )
        ]);
      } catch (error: any) {
        logger.warn(`Cache operation skipped: ${error?.message || String(error)}`);
        logger.info('Continuing without caching');
      }

      // Log success
      const stats = await fs.stat(snapshotPath);
      logger.success(`Created snapshot at ${snapshotPath} (${fsUtils.formatSize(stats.size)}) in ${timer.getElapsedFormatted()}`);

      return true;
    } catch (error) {
      logger.error(`Failed to create snapshot: ${error}`);
      return false;
    }
  }

  /**
   * Restore node_modules from a snapshot
   * @param projectDir The project directory
   * @param snapshotPath Optional custom snapshot path
   * @returns True if successful
   */
  async restore(projectDir: string, snapshotPath?: string): Promise<boolean> {
    const nodeModulesPath = path.join(projectDir, 'node_modules');
    const flashpackPath = snapshotPath || this.getSnapshotPath(projectDir);

    // Check if snapshot exists
    if (!await fsUtils.fileExists(flashpackPath)) {
      logger.error(`Snapshot not found at ${flashpackPath}`);
      return false;
    }

    try {
      // Start timer
      const timer = createTimer();
      const startTime = Date.now();

      // Very simple progress indicator
      let dots = '';
      const progressInterval = setInterval(() => {
        dots = (dots.length >= 3) ? '' : dots + '.';
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        process.stdout.write(`\rRestoring from snapshot${dots.padEnd(3)} (${elapsed}s elapsed)${' '.repeat(20)}`);
      }, 500);

      // Get snapshot size for progress reporting
      const stats = await fs.stat(flashpackPath);
      const snapshotSize = fsUtils.formatSize(stats.size);

      // Update progress message
      clearInterval(progressInterval);
      process.stdout.write('\r' + ' '.repeat(80) + '\r');
      process.stdout.write(`\rRestoring snapshot (${snapshotSize})...${' '.repeat(20)}`);

      // Remove existing node_modules if present
      if (await fsUtils.directoryExists(nodeModulesPath)) {
        // Update progress message
        clearInterval(progressInterval);
        process.stdout.write('\r' + ' '.repeat(80) + '\r');
        process.stdout.write(`\rRemoving existing node_modules...${' '.repeat(20)}`);
        await fsUtils.remove(nodeModulesPath);
      }

      // Extract archive using native tools for maximum speed
      // Update progress message
      clearInterval(progressInterval);
      process.stdout.write('\r' + ' '.repeat(80) + '\r');
      process.stdout.write(`\rExtracting snapshot...${' '.repeat(20)}`);

      // Always use native tar for maximum speed
      if (flashpackPath.endsWith('.tar.gz') || flashpackPath.endsWith('.tgz')) {
        await fsUtils.ensureDir(projectDir);
        execSync(`tar -xzf "${flashpackPath}" -C "${projectDir}"`, { stdio: 'ignore' });
      }
      // Use native unzip for zip files
      else if (flashpackPath.endsWith('.zip')) {
        await fsUtils.ensureDir(projectDir);
        execSync(`unzip -q "${flashpackPath}" -d "${projectDir}"`, { stdio: 'ignore' });
      }
      // Fall back to decompress library for other formats
      else {
        // Try to use tar first
        try {
          await fsUtils.ensureDir(projectDir);
          execSync(`tar -xf "${flashpackPath}" -C "${projectDir}"`, { stdio: 'ignore' });
        } catch (error) {
          // Fall back to decompress library
          await decompress(flashpackPath, projectDir);
        }
      }

      // Stop progress indicator
      clearInterval(progressInterval);
      process.stdout.write('\r' + ' '.repeat(80) + '\r');

      // Log success with timing information
      logger.success(`Restored node_modules from snapshot in ${timer.getElapsedFormatted()}`);

      // Get node_modules size if it exists
      if (await fsUtils.directoryExists(nodeModulesPath)) {
        try {
          const nodeModulesStats = await fsUtils.getSize(nodeModulesPath);
          logger.info(`Restored ${fsUtils.formatSize(nodeModulesStats)} of dependencies`);
        } catch (error) {
          logger.warn(`Could not determine size of restored dependencies`);
        }
      } else {
        logger.warn(`node_modules directory not found after restoration`);
        logger.info(`Try running 'flash-install' to install dependencies`);
      }

      return true;
    } catch (error) {
      logger.error(`Failed to restore snapshot: ${error}`);
      return false;
    }
  }

  /**
   * Check if a snapshot exists and is valid
   * @param projectDir The project directory
   * @param dependencies The current dependency tree
   * @param snapshotPath Optional custom snapshot path
   * @returns True if a valid snapshot exists
   */
  async isValid(
    projectDir: string,
    dependencies: Record<string, string>,
    snapshotPath?: string
  ): Promise<boolean> {
    const flashpackPath = snapshotPath || this.getSnapshotPath(projectDir);

    // Check if snapshot exists
    if (!await fsUtils.fileExists(flashpackPath)) {
      return false;
    }

    try {
      // Extract metadata only
      const files = await decompress(flashpackPath, undefined, {
        filter: file => file.path === '.flashpack-metadata.json'
      });

      if (files.length === 0) {
        return false;
      }

      // Parse metadata
      const metadata = JSON.parse(files[0].data.toString());

      // Check if fingerprint exists
      if (metadata.fingerprint) {
        // Verify fingerprint
        const lockfilePath = getLockfilePath(projectDir);
        const result = await verifySnapshotFingerprint(
          metadata.fingerprint,
          dependencies,
          lockfilePath
        );

        if (!result.valid) {
          logger.debug(`Snapshot invalid: ${result.reason}`);
          return false;
        }

        return true;
      } else {
        // Fall back to legacy validation
        // Compare dependency trees
        const currentHash = hashDependencyTree(dependencies);
        const snapshotHash = hashDependencyTree(metadata.dependencies);

        return currentHash === snapshotHash;
      }
    } catch (error) {
      logger.debug(`Failed to validate snapshot: ${error}`);
      return false;
    }
  }

  /**
   * Get metadata from a snapshot
   * @param snapshotPath The snapshot path
   * @returns The snapshot metadata
   */
  async getMetadata(snapshotPath: string): Promise<any> {
    try {
      // Extract metadata only
      const files = await decompress(snapshotPath, undefined, {
        filter: file => file.path === '.flashpack-metadata.json'
      });

      if (files.length === 0) {
        throw new Error('No metadata found in snapshot');
      }

      // Parse metadata
      return JSON.parse(files[0].data.toString());
    } catch (error) {
      logger.error(`Failed to get snapshot metadata: ${error}`);
      throw error;
    }
  }
}

// Export a default snapshot instance
export const snapshot = new Snapshot();
