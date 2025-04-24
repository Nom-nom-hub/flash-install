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
 * Snapshot format options
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

      // Create spinner
      const spinner = new Spinner('Creating snapshot archive');
      spinner.start();

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
        spinner.setMessage('Creating tar.gz snapshot...');

        // Use native tar command (much faster than JS libraries)
        execSync(
          `tar -czf "${snapshotPath}" -C "${projectDir}" --exclude=".git" --exclude="node_modules/*/node_modules" .flashpack-metadata.json node_modules`,
          { stdio: 'ignore' }
        );
      }
      else if (isZipFormat(this.options.format)) {
        spinner.setMessage('Creating zip snapshot...');

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
            spinner.setMessage(`Creating snapshot: ${percent}% (${entries.processed}/${entries.total} files)`);
          }

          if (fs.processedBytes > 0) {
            const size = fsUtils.formatSize(fs.processedBytes);
            spinner.setMessage(`Creating snapshot: ${size} processed`);
          }
        });

        // Set up archive
        archive.pipe(output);

        // Add metadata file
        archive.file(metadataPath, { name: '.flashpack-metadata.json' });

        // Add node_modules
        archive.directory(nodeModulesPath, 'node_modules');

        // Finalize and wait for completion
        spinner.setMessage('Finalizing snapshot...');
        await archive.finalize();
      }

      // Remove metadata file
      await fs.remove(metadataPath);

      // Add to cache
      spinner.setMessage('Adding to global cache...');
      await cache.addDependencyTree(dependencies, nodeModulesPath);

      // Stop spinner
      spinner.stop();

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

      // Create spinner
      const spinner = new Spinner('Preparing to restore from snapshot');
      spinner.start();

      // Get snapshot size for progress reporting
      const stats = await fs.stat(flashpackPath);
      const snapshotSize = fsUtils.formatSize(stats.size);
      spinner.setMessage(`Restoring snapshot (${snapshotSize})...`);

      // Remove existing node_modules if present
      if (await fsUtils.directoryExists(nodeModulesPath)) {
        spinner.setMessage('Removing existing node_modules...');
        await fsUtils.remove(nodeModulesPath);
      }

      // Extract archive using native tools for maximum speed
      spinner.setMessage('Extracting snapshot...');

      // Use native tar for tar.gz files (much faster than JS libraries)
      if (this.options.format === SnapshotFormat.TAR_GZ && flashpackPath.endsWith('.tar.gz')) {
        await fsUtils.ensureDir(projectDir);
        execSync(`tar -xzf "${flashpackPath}" -C "${projectDir}"`, { stdio: 'ignore' });
      }
      // Use native unzip for zip files
      else if (isZipFormat(this.options.format) && flashpackPath.endsWith('.zip')) {
        await fsUtils.ensureDir(projectDir);
        execSync(`unzip -q "${flashpackPath}" -d "${projectDir}"`, { stdio: 'ignore' });
      }
      // Fall back to decompress library for other formats
      else {
        await decompress(flashpackPath, projectDir);
      }

      // Stop spinner
      spinner.stop();

      // Log success with timing information
      logger.success(`Restored node_modules from snapshot in ${timer.getElapsedFormatted()}`);

      // Get node_modules size
      const nodeModulesStats = await fsUtils.getSize(nodeModulesPath);
      logger.info(`Restored ${fsUtils.formatSize(nodeModulesStats)} of dependencies`);

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
