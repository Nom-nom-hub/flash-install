import path from 'path';
import fs from 'fs-extra';
import { logger } from './utils/logger.js';
import * as fsUtils from './utils/fs.js';
import { hashDependencyTree } from './utils/hash.js';
import { cache } from './cache.js';
import { snapshot } from './snapshot.js';
import { installer, PackageManager } from './install.js';
import { Timer, createTimer } from './utils/timer.js';
import { Spinner, ProgressIndicator } from './utils/progress.js';
import { getLockfilePath } from './utils/integrity.js';

/**
 * Sync options
 */
export interface SyncOptions {
  force: boolean;
  skipSnapshot: boolean;
  skipCache: boolean;
}

/**
 * Default sync options
 */
const defaultOptions: SyncOptions = {
  force: false,
  skipSnapshot: false,
  skipCache: false
};

/**
 * Sync manager for updating dependencies
 */
export class Sync {
  private options: SyncOptions;

  /**
   * Create a new sync manager
   * @param options Sync options
   */
  constructor(options: Partial<SyncOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Synchronize dependencies
   * @param projectDir The project directory
   * @returns True if successful
   */
  async sync(projectDir: string): Promise<boolean> {
    try {
      // Start timer
      const timer = createTimer();

      // Parse package.json
      const pkg = await installer.parsePackageJson(projectDir);

      // Detect package manager
      const packageManager = installer.detectPackageManager(projectDir);

      // Parse lockfile
      let dependencies: Record<string, string>;
      try {
        dependencies = await installer.parseLockfile(projectDir, packageManager);
      } catch (error) {
        logger.warn(`Failed to parse lockfile: ${error}`);
        logger.warn('Falling back to package.json dependencies');
        dependencies = { ...pkg.dependencies };

        if (pkg.devDependencies) {
          dependencies = { ...dependencies, ...pkg.devDependencies };
        }
      }

      // Check if node_modules exists
      const nodeModulesPath = path.join(projectDir, 'node_modules');
      const nodeModulesExists = await fsUtils.directoryExists(nodeModulesPath);

      if (!nodeModulesExists) {
        logger.info('node_modules not found, performing full installation');
        return installer.install(projectDir);
      }

      // Check if snapshot exists and is valid
      const snapshotPath = snapshot.getSnapshotPath(projectDir);
      const snapshotExists = await fsUtils.fileExists(snapshotPath);

      if (snapshotExists && !this.options.force) {
        const isValid = await snapshot.isValid(projectDir, dependencies);

        if (isValid) {
          logger.info('Dependencies are already in sync');
          return true;
        } else {
          logger.info('Snapshot is invalid, updating dependencies');
        }
      }

      // Get lockfile path
      const lockfilePath = getLockfilePath(projectDir);

      // Check which packages need to be updated
      const spinner = new Spinner('Analyzing dependencies');
      spinner.start();

      // Get installed packages
      const installedPackages = await this.getInstalledPackages(nodeModulesPath);

      // Find missing or outdated packages
      const packagesToUpdate: { name: string; version: string }[] = [];

      for (const [name, version] of Object.entries(dependencies)) {
        const installedVersion = installedPackages[name];

        if (!installedVersion || installedVersion !== version) {
          packagesToUpdate.push({ name, version });
        }
      }

      spinner.stop();

      if (packagesToUpdate.length === 0) {
        logger.info('All dependencies are up to date');

        // Create snapshot if needed
        if (!snapshotExists && !this.options.skipSnapshot) {
          logger.info('Creating snapshot...');
          await snapshot.create(projectDir, dependencies);
        }

        return true;
      }

      logger.info(`Found ${packagesToUpdate.length} packages to update`);

      // Update packages
      const progress = new ProgressIndicator(
        packagesToUpdate.length,
        'Updating packages:'
      );

      for (const pkg of packagesToUpdate) {
        try {
          const packagePath = path.join(nodeModulesPath, pkg.name);

          // Remove existing package
          if (await fsUtils.directoryExists(packagePath)) {
            await fsUtils.remove(packagePath);
          }

          // Check if package is in cache
          if (!this.options.skipCache && await cache.hasPackage(pkg.name, pkg.version)) {
            await cache.restorePackage(pkg.name, pkg.version, packagePath);
          } else {
            // Install package
            const cmd = {
              [PackageManager.NPM]: `npm install ${pkg.name}@${pkg.version} --no-save`,
              [PackageManager.YARN]: `yarn add ${pkg.name}@${pkg.version} --no-save`,
              [PackageManager.PNPM]: `pnpm add ${pkg.name}@${pkg.version} --no-save`,
              [PackageManager.BUN]: `bun add ${pkg.name}@${pkg.version} --no-save`
            }[packageManager];

            await fs.ensureDir(packagePath);
            const { exec } = await import('child_process');
            await new Promise<void>((resolve, reject) => {
              const child = exec(cmd, { cwd: projectDir });
              child.on('close', (code: number) => {
                if (code === 0) {
                  resolve();
                } else {
                  reject(new Error(`Failed to install ${pkg.name}@${pkg.version}`));
                }
              });
            });

            // Add to cache
            if (!this.options.skipCache) {
              await cache.addPackage(pkg.name, pkg.version, packagePath);
            }
          }

          progress.update(1);
        } catch (error) {
          logger.error(`Failed to update ${pkg.name}@${pkg.version}: ${error}`);
          progress.update(1);
        }
      }

      progress.complete();

      // Create snapshot
      if (!this.options.skipSnapshot) {
        logger.info('Creating snapshot...');
        await snapshot.create(projectDir, dependencies);
      }

      logger.success(`Sync completed in ${timer.getElapsedFormatted()}`);
      return true;
    } catch (error) {
      logger.error(`Sync failed: ${error}`);
      return false;
    }
  }

  /**
   * Get installed packages
   * @param nodeModulesPath Path to node_modules
   * @returns Map of package names to versions
   */
  private async getInstalledPackages(nodeModulesPath: string): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    try {
      const entries = await fs.readdir(nodeModulesPath);

      for (const entry of entries) {
        // Skip hidden files and special directories
        if (entry.startsWith('.') || entry === 'node_modules') {
          continue;
        }

        // Handle scoped packages
        if (entry.startsWith('@')) {
          const scopePath = path.join(nodeModulesPath, entry);
          const scopedEntries = await fs.readdir(scopePath);

          for (const scopedEntry of scopedEntries) {
            const packagePath = path.join(scopePath, scopedEntry);
            const packageJsonPath = path.join(packagePath, 'package.json');

            if (await fsUtils.fileExists(packageJsonPath)) {
              const packageJson = await fs.readJSON(packageJsonPath);
              result[`${entry}/${scopedEntry}`] = packageJson.version;
            }
          }
        } else {
          const packagePath = path.join(nodeModulesPath, entry);
          const packageJsonPath = path.join(packagePath, 'package.json');

          if (await fsUtils.fileExists(packageJsonPath)) {
            const packageJson = await fs.readJSON(packageJsonPath);
            result[entry] = packageJson.version;
          }
        }
      }
    } catch (error) {
      logger.debug(`Failed to get installed packages: ${error}`);
    }

    return result;
  }
}

// Export a default sync instance
export const sync = new Sync();
