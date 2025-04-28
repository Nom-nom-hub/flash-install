/**
 * Cloud cache manager for flash-install
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { CloudProvider, CloudProviderConfig } from './provider.js';
import { cloudProviderFactory } from './provider-factory.js';
import { logger } from '../utils/logger.js';
import * as fsUtils from '../utils/fs.js';
import { createTimer } from '../utils/timer.js';
import { CloudProgress } from '../utils/cloud-progress.js';
import { getLockfileHash, hasLockfileChanged } from '../utils/lockfile-hash.js';

/**
 * Cloud cache synchronization policy
 */
export enum SyncPolicy {
  /**
   * Always upload to cloud
   */
  ALWAYS_UPLOAD = 'always-upload',

  /**
   * Always download from cloud
   */
  ALWAYS_DOWNLOAD = 'always-download',

  /**
   * Upload if not in cloud
   */
  UPLOAD_IF_MISSING = 'upload-if-missing',

  /**
   * Download if not in local cache
   */
  DOWNLOAD_IF_MISSING = 'download-if-missing',

  /**
   * Use the newest version
   */
  NEWEST = 'newest'
}

/**
 * Cloud cache configuration
 */
export interface CloudCacheConfig {
  /**
   * Provider configuration
   */
  provider: CloudProviderConfig;

  /**
   * Synchronization policy
   */
  syncPolicy: SyncPolicy;

  /**
   * Local cache directory
   */
  localCacheDir: string;

  /**
   * Enable cloud cache
   */
  enabled: boolean;

  /**
   * Team ID for shared caching
   */
  teamId?: string;

  /**
   * Whether to invalidate cache on lockfile changes
   */
  invalidateOnLockfileChange?: boolean;

  /**
   * Project directory (for lockfile detection)
   */
  projectDir?: string;

  /**
   * Previous lockfile hash (for change detection)
   */
  lockfileHash?: string;

  /**
   * Team access control
   */
  teamAccess?: {
    /**
     * Team access token
     */
    token?: string;

    /**
     * Team access level
     */
    level?: 'read' | 'write' | 'admin';

    /**
     * Whether to restrict access to team members only
     */
    restrictToTeam?: boolean;
  };
}

/**
 * Cloud cache manager
 */
export class CloudCache {
  private provider: CloudProvider | null = null;
  private config: CloudCacheConfig | null = null;
  private initialized = false;

  /**
   * Initialize the cloud cache
   * @param config Cloud cache configuration
   */
  async init(config: CloudCacheConfig): Promise<void> {
    try {
      this.config = config;

      // Skip if disabled
      if (!config.enabled) {
        logger.debug('Cloud cache is disabled');
        this.initialized = true;
        return;
      }

      // Check for lockfile changes if enabled
      if (config.invalidateOnLockfileChange && config.projectDir) {
        const currentHash = await getLockfileHash(config.projectDir);

        // Update the config with the current hash
        this.config.lockfileHash = currentHash || undefined;

        // Check if lockfile has changed
        if (await hasLockfileChanged(config.projectDir, config.lockfileHash)) {
          logger.info('Lockfile has changed, cache will be invalidated');
          this.config.lockfileHash = currentHash || undefined;
        } else {
          logger.debug('Lockfile has not changed, using existing cache');
        }
      }

      // Create provider
      this.provider = cloudProviderFactory.createProvider(config.provider);

      try {
        // Initialize provider
        await this.provider.init();

        this.initialized = true;
        logger.debug('Cloud cache initialized successfully');
      } catch (error) {
        // Log error but don't throw
        logger.warn(`Cloud provider initialization failed: ${error}`);
        logger.warn('Cloud cache will operate in limited mode');

        // Still mark as initialized but with limited functionality
        this.initialized = true;
      }
    } catch (error) {
      logger.error(`Failed to initialize cloud cache: ${error}`);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Check if cloud cache is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if cloud cache is enabled
   */
  isEnabled(): boolean {
    return this.config?.enabled || false;
  }

  /**
   * Get the cloud provider
   */
  getProvider(): CloudProvider {
    if (!this.provider) {
      throw new Error('Cloud provider not initialized');
    }
    return this.provider;
  }

  /**
   * Get the cloud cache configuration
   */
  getConfig(): CloudCacheConfig | null {
    return this.config;
  }

  /**
   * Synchronize a package with the cloud cache
   * @param name Package name
   * @param version Package version
   * @param localPath Local package path
   */
  async syncPackage(name: string, version: string, localPath: string): Promise<boolean> {
    if (!this.initialized || !this.provider || !this.config || !this.config.enabled) {
      return false;
    }

    try {
      // Create package path
      const packagePath = this.getPackagePath(name, version);

      // Check if lockfile has changed and we need to invalidate the cache
      let shouldInvalidate = false;
      if (this.config.invalidateOnLockfileChange && this.config.projectDir && this.config.lockfileHash) {
        shouldInvalidate = await hasLockfileChanged(this.config.projectDir, this.config.lockfileHash);
        if (shouldInvalidate) {
          logger.info(`Lockfile has changed, invalidating cache for ${name}@${version}`);
          // Update the hash
          this.config.lockfileHash = await getLockfileHash(this.config.projectDir) || undefined;
        }
      }

      // Check if package exists in cloud
      const existsInCloud = !shouldInvalidate && await this.provider.fileExists(packagePath);

      // Determine action based on sync policy
      switch (this.config.syncPolicy) {
        case SyncPolicy.ALWAYS_UPLOAD:
          await this.uploadPackage(name, version, localPath);
          return true;

        case SyncPolicy.ALWAYS_DOWNLOAD:
          if (existsInCloud) {
            await this.downloadPackage(name, version, localPath);
            return true;
          }
          return false;

        case SyncPolicy.UPLOAD_IF_MISSING:
          if (!existsInCloud) {
            await this.uploadPackage(name, version, localPath);
            return true;
          }
          return true;

        case SyncPolicy.DOWNLOAD_IF_MISSING:
          if (existsInCloud && !await fsUtils.directoryExists(localPath)) {
            await this.downloadPackage(name, version, localPath);
            return true;
          }
          return true;

        case SyncPolicy.NEWEST:
          // Compare local and cloud timestamps to determine which is newer
          if (existsInCloud) {
            // Get local file stats
            const localStats = await fsUtils.getStats(localPath);
            const localTime = localStats ? localStats.mtime.getTime() : 0;

            try {
              // Get cloud file metadata
              const cloudMetadata = await this.provider.getFileMetadata(packagePath);
              const cloudTime = cloudMetadata?.lastModified?.getTime() || 0;

              if (cloudTime > localTime) {
                // Cloud version is newer, download it
                logger.debug(`Cloud version of ${name}@${version} is newer, downloading`);
                await this.downloadPackage(name, version, localPath);
              } else if (localTime > cloudTime) {
                // Local version is newer, upload it
                logger.debug(`Local version of ${name}@${version} is newer, uploading`);
                await this.uploadPackage(name, version, localPath);
              } else {
                // Same timestamp, no action needed
                logger.debug(`Local and cloud versions of ${name}@${version} have the same timestamp`);
              }
            } catch (error) {
              // If we can't get cloud metadata, upload local version
              logger.warn(`Failed to get cloud metadata for ${name}@${version}, uploading local version`);
              await this.uploadPackage(name, version, localPath);
            }
          } else {
            // File doesn't exist in cloud, upload it
            await this.uploadPackage(name, version, localPath);
          }
          return true;

        default:
          logger.error(`Unsupported sync policy: ${this.config.syncPolicy}`);
          return false;
      }
    } catch (error) {
      logger.error(`Failed to sync package ${name}@${version} with cloud cache: ${error}`);
      return false;
    }
  }

  /**
   * Upload a package to the cloud cache
   * @param name Package name
   * @param version Package version
   * @param localPath Local package path
   */
  async uploadPackage(name: string, version: string, localPath: string): Promise<boolean> {
    if (!this.initialized || !this.provider || !this.config || !this.config.enabled) {
      return false;
    }

    // Check team permissions
    if (!this.hasTeamPermission('write')) {
      logger.warn(`Insufficient permissions to upload package ${name}@${version} to team cache`);
      return false;
    }

    try {
      // Start timer
      const timer = createTimer();

      // Create progress indicator
      const progress = new CloudProgress(`Uploading ${name}@${version} to cloud cache`);
      progress.start();

      // Create package path
      const packagePath = this.getPackagePath(name, version);

      // Create temporary tarball
      const tempDir = path.join(os.tmpdir(), `flash-install-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
      await fsUtils.ensureDir(tempDir);

      const tarballPath = path.join(tempDir, `${name}-${version}.tgz`);

      // Create tarball
      await fsUtils.createTarball(localPath, tarballPath);

      // Upload tarball
      await this.provider.uploadFile(tarballPath, packagePath);

      // Clean up
      await fsUtils.remove(tempDir);

      // Stop progress
      progress.stop();

      logger.success(`Uploaded ${name}@${version} to cloud cache in ${timer.getElapsedFormatted()}`);
      return true;
    } catch (error) {
      logger.error(`Failed to upload package ${name}@${version} to cloud cache: ${error}`);
      return false;
    }
  }

  /**
   * Download a package from the cloud cache
   * @param name Package name
   * @param version Package version
   * @param localPath Local package path
   */
  async downloadPackage(name: string, version: string, localPath: string): Promise<boolean> {
    if (!this.initialized || !this.provider || !this.config || !this.config.enabled) {
      return false;
    }

    // Check team permissions
    if (!this.hasTeamPermission('read')) {
      logger.warn(`Insufficient permissions to download package ${name}@${version} from team cache`);
      return false;
    }

    try {
      // Start timer
      const timer = createTimer();

      // Create progress indicator
      const progress = new CloudProgress(`Downloading ${name}@${version} from cloud cache`);
      progress.start();

      // Create package path
      const packagePath = this.getPackagePath(name, version);

      // Create temporary directory
      const tempDir = path.join(os.tmpdir(), `flash-install-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
      await fsUtils.ensureDir(tempDir);

      const tarballPath = path.join(tempDir, `${name}-${version}.tgz`);

      // Download tarball
      await this.provider.downloadFile(packagePath, tarballPath);

      // Extract tarball
      await fsUtils.ensureDir(localPath);
      await fsUtils.extractTarball(tarballPath, localPath);

      // Clean up
      await fsUtils.remove(tempDir);

      // Stop progress
      progress.stop();

      logger.success(`Downloaded ${name}@${version} from cloud cache in ${timer.getElapsedFormatted()}`);
      return true;
    } catch (error) {
      logger.error(`Failed to download package ${name}@${version} from cloud cache: ${error}`);
      return false;
    }
  }

  /**
   * Synchronize a dependency tree with the cloud cache
   * @param dependencies Dependency tree
   * @param localPath Local dependency tree path
   */
  async syncDependencyTree(dependencies: Record<string, string>, localPath: string): Promise<boolean> {
    if (!this.initialized || !this.provider || !this.config || !this.config.enabled) {
      return false;
    }

    try {
      // Create dependency tree path
      const treePath = this.getDependencyTreePath(dependencies);

      // Check if lockfile has changed and we need to invalidate the cache
      let shouldInvalidate = false;
      if (this.config.invalidateOnLockfileChange && this.config.projectDir && this.config.lockfileHash) {
        shouldInvalidate = await hasLockfileChanged(this.config.projectDir, this.config.lockfileHash);
        if (shouldInvalidate) {
          logger.info('Lockfile has changed, invalidating dependency tree cache');
          // Update the hash
          this.config.lockfileHash = await getLockfileHash(this.config.projectDir) || undefined;
        }
      }

      // Check if dependency tree exists in cloud
      const existsInCloud = !shouldInvalidate && await this.provider.fileExists(treePath);

      // Determine action based on sync policy
      switch (this.config.syncPolicy) {
        case SyncPolicy.ALWAYS_UPLOAD:
          await this.uploadDependencyTree(dependencies, localPath);
          return true;

        case SyncPolicy.ALWAYS_DOWNLOAD:
          if (existsInCloud) {
            await this.downloadDependencyTree(dependencies, localPath);
            return true;
          }
          return false;

        case SyncPolicy.UPLOAD_IF_MISSING:
          if (!existsInCloud) {
            await this.uploadDependencyTree(dependencies, localPath);
            return true;
          }
          return true;

        case SyncPolicy.DOWNLOAD_IF_MISSING:
          if (existsInCloud && !await fsUtils.directoryExists(localPath)) {
            await this.downloadDependencyTree(dependencies, localPath);
            return true;
          }
          return true;

        case SyncPolicy.NEWEST:
          // Compare local and cloud timestamps to determine which is newer
          if (existsInCloud) {
            // Get local directory stats
            const localStats = await fsUtils.getStats(localPath);
            const localTime = localStats ? localStats.mtime.getTime() : 0;

            try {
              // Get cloud file metadata
              const cloudMetadata = await this.provider.getFileMetadata(treePath);
              const cloudTime = cloudMetadata?.lastModified?.getTime() || 0;

              if (cloudTime > localTime) {
                // Cloud version is newer, download it
                logger.debug(`Cloud version of dependency tree is newer, downloading`);
                await this.downloadDependencyTree(dependencies, localPath);
              } else if (localTime > cloudTime) {
                // Local version is newer, upload it
                logger.debug(`Local version of dependency tree is newer, uploading`);
                await this.uploadDependencyTree(dependencies, localPath);
              } else {
                // Same timestamp, no action needed
                logger.debug(`Local and cloud versions of dependency tree have the same timestamp`);
              }
            } catch (error) {
              // If we can't get cloud metadata, upload local version
              logger.warn(`Failed to get cloud metadata for dependency tree, uploading local version`);
              await this.uploadDependencyTree(dependencies, localPath);
            }
          } else {
            // Tree doesn't exist in cloud, upload it
            await this.uploadDependencyTree(dependencies, localPath);
          }
          return true;

        default:
          logger.error(`Unsupported sync policy: ${this.config.syncPolicy}`);
          return false;
      }
    } catch (error) {
      logger.error(`Failed to sync dependency tree with cloud cache: ${error}`);
      return false;
    }
  }

  /**
   * Upload a dependency tree to the cloud cache
   * @param dependencies Dependency tree
   * @param localPath Local dependency tree path
   */
  async uploadDependencyTree(dependencies: Record<string, string>, localPath: string): Promise<boolean> {
    if (!this.initialized || !this.provider || !this.config || !this.config.enabled) {
      return false;
    }

    // Check team permissions
    if (!this.hasTeamPermission('write')) {
      logger.warn('Insufficient permissions to upload dependency tree to team cache');
      return false;
    }

    try {
      // Start timer
      const timer = createTimer();

      // Create progress indicator
      const progress = new CloudProgress('Uploading dependency tree to cloud cache');
      progress.start();

      // Create dependency tree path
      const treePath = this.getDependencyTreePath(dependencies);

      // Create temporary tarball
      const tempDir = path.join(os.tmpdir(), `flash-install-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
      await fsUtils.ensureDir(tempDir);

      const tarballPath = path.join(tempDir, 'tree.tgz');

      // Create tarball
      await fsUtils.createTarball(localPath, tarballPath);

      // Upload tarball
      await this.provider.uploadFile(tarballPath, treePath);

      // Clean up
      await fsUtils.remove(tempDir);

      // Stop progress
      progress.stop();

      logger.success(`Uploaded dependency tree to cloud cache in ${timer.getElapsedFormatted()}`);
      return true;
    } catch (error) {
      logger.error(`Failed to upload dependency tree to cloud cache: ${error}`);
      return false;
    }
  }

  /**
   * Download a dependency tree from the cloud cache
   * @param dependencies Dependency tree
   * @param localPath Local dependency tree path
   */
  async downloadDependencyTree(dependencies: Record<string, string>, localPath: string): Promise<boolean> {
    if (!this.initialized || !this.provider || !this.config || !this.config.enabled) {
      return false;
    }

    // Check team permissions
    if (!this.hasTeamPermission('read')) {
      logger.warn('Insufficient permissions to download dependency tree from team cache');
      return false;
    }

    try {
      // Start timer
      const timer = createTimer();

      // Create progress indicator
      const progress = new CloudProgress('Downloading dependency tree from cloud cache');
      progress.start();

      // Create dependency tree path
      const treePath = this.getDependencyTreePath(dependencies);

      // Create temporary directory
      const tempDir = path.join(os.tmpdir(), `flash-install-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
      await fsUtils.ensureDir(tempDir);

      const tarballPath = path.join(tempDir, 'tree.tgz');

      // Download tarball
      await this.provider.downloadFile(treePath, tarballPath);

      // Extract tarball
      await fsUtils.ensureDir(localPath);
      await fsUtils.extractTarball(tarballPath, localPath);

      // Clean up
      await fsUtils.remove(tempDir);

      // Stop progress
      progress.stop();

      logger.success(`Downloaded dependency tree from cloud cache in ${timer.getElapsedFormatted()}`);
      return true;
    } catch (error) {
      logger.error(`Failed to download dependency tree from cloud cache: ${error}`);
      return false;
    }
  }

  /**
   * Get the package path in the cloud cache
   * @param name Package name
   * @param version Package version
   */
  private getPackagePath(name: string, version: string): string {
    // Create team prefix if available
    const teamPrefix = this.config?.teamId ? `teams/${this.config.teamId}/` : '';

    // Create package path
    return `${teamPrefix}packages/${name}/${version}.tgz`;
  }

  /**
   * Check if the current user has permission to access the team cache
   * @param requiredLevel Required access level
   * @returns True if the user has permission, false otherwise
   */
  private hasTeamPermission(requiredLevel: 'read' | 'write' | 'admin'): boolean {
    // If no team ID or team access, allow access
    if (!this.config?.teamId || !this.config?.teamAccess) {
      return true;
    }

    // If no token, deny access if restricted to team
    if (!this.config.teamAccess.token && this.config.teamAccess.restrictToTeam) {
      logger.warn('Team access token is required for restricted team cache');
      return false;
    }

    // Check access level
    const userLevel = this.config.teamAccess.level || 'read';

    switch (requiredLevel) {
      case 'read':
        // Any level can read
        return true;
      case 'write':
        // Write and admin can write
        return userLevel === 'write' || userLevel === 'admin';
      case 'admin':
        // Only admin can perform admin actions
        return userLevel === 'admin';
      default:
        return false;
    }
  }

  /**
   * Get the dependency tree path in the cloud cache
   * @param dependencies Dependency tree
   */
  private getDependencyTreePath(dependencies: Record<string, string>): string {
    // Create team prefix if available
    const teamPrefix = this.config?.teamId ? `teams/${this.config.teamId}/` : '';

    // Hash the dependency tree
    const hash = this.hashDependencyTree(dependencies);

    // Create tree path
    return `${teamPrefix}trees/${hash.substring(0, 2)}/${hash}.tgz`;
  }

  /**
   * Hash a dependency tree
   * @param dependencies Dependency tree
   */
  private hashDependencyTree(dependencies: Record<string, string>): string {
    // Sort dependencies by name
    const sortedDeps = Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b));

    // Create dependency string
    const depString = sortedDeps.map(([name, version]) => `${name}@${version}`).join(',');

    // Create hash
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(depString).digest('hex');
  }

  /**
   * Synchronize the entire cache with the cloud
   * @param direction Sync direction ('upload', 'download', or 'both')
   * @param force Force synchronization even if files exist
   */
  async syncCache(direction: 'upload' | 'download' | 'both' = 'both', force: boolean = false): Promise<boolean> {
    if (!this.initialized || !this.provider || !this.config || !this.config.enabled) {
      logger.error('Cloud cache is not initialized or enabled');
      return false;
    }

    // Check team permissions
    if ((direction === 'upload' || direction === 'both') && !this.hasTeamPermission('write')) {
      logger.warn('Insufficient permissions to upload to team cache');
      if (direction === 'upload') {
        return false;
      }
      // If 'both', continue with download only
      direction = 'download';
    }

    if ((direction === 'download' || direction === 'both') && !this.hasTeamPermission('read')) {
      logger.warn('Insufficient permissions to download from team cache');
      if (direction === 'download') {
        return false;
      }
      // If 'both', continue with upload only
      direction = 'upload';
    }

    try {
      // Start timer
      const timer = createTimer();

      // Create progress indicator
      const progress = new CloudProgress(`Synchronizing cache with cloud (${direction})`);
      progress.start();

      let uploadCount = 0;
      let downloadCount = 0;
      let skipCount = 0;

      // Get local cache directory
      const localCacheDir = this.config.localCacheDir;

      if (!await fsUtils.directoryExists(localCacheDir)) {
        logger.warn(`Local cache directory does not exist: ${localCacheDir}`);
        progress.stop();
        return false;
      }

      // Get all package directories in local cache
      const packagesDir = path.join(localCacheDir, 'packages');
      if (await fsUtils.directoryExists(packagesDir)) {
        const packageDirs = await fsUtils.getDirectories(packagesDir);

        // Process each package
        for (const packageName of packageDirs) {
          // Get all version directories
          const versionDirs = await fsUtils.getDirectories(path.join(packagesDir, packageName));

          for (const version of versionDirs) {
            const localPath = path.join(packagesDir, packageName, version);
            const packagePath = this.getPackagePath(packageName, version);

            // Check if package exists in cloud
            const existsInCloud = await this.provider.fileExists(packagePath);

            if (direction === 'upload' || direction === 'both') {
              if (!existsInCloud || force) {
                // Upload package
                await this.uploadPackage(packageName, version, localPath);
                uploadCount++;
              } else {
                skipCount++;
              }
            }

            if (direction === 'download' || direction === 'both') {
              if (existsInCloud && (force || !await fsUtils.directoryExists(localPath))) {
                // Download package
                await this.downloadPackage(packageName, version, localPath);
                downloadCount++;
              } else if (direction === 'download') {
                skipCount++;
              }
            }

            // Update progress
            progress.setStatus(`Processed ${uploadCount + downloadCount + skipCount} packages`);
          }
        }
      }

      // Stop progress
      progress.stop();

      logger.success(`Cache synchronization completed in ${timer.getElapsedFormatted()}`);
      logger.info(`Uploaded: ${uploadCount}, Downloaded: ${downloadCount}, Skipped: ${skipCount}`);

      return true;
    } catch (error) {
      logger.error(`Failed to synchronize cache: ${error}`);
      return false;
    }
  }
}

// Export a default cloud cache instance
export const cloudCache = new CloudCache();
