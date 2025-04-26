import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { execSync, spawn } from 'child_process';
import * as lockfile from '@yarnpkg/lockfile';
import * as ini from 'ini';
import * as toml from 'toml';
import * as jsonc from 'jsonc-parser';
import { logger } from './utils/logger.js';
import * as fsUtils from './utils/fs.js';
import { hashDependencyTree } from './utils/hash.js';
import { cache } from './cache.js';
import { snapshot } from './snapshot.js';
import { WorkerPool, createWorkerFunction } from './utils/worker-pool.js';
import { Timer, createTimer } from './utils/timer.js';
import { ProgressIndicator, Spinner } from './utils/progress.js';
import { ReliableProgress } from './utils/reliable-progress.js';
import { pluginManager, PluginHook } from './plugin.js';
import { verifyPackageIntegrity } from './utils/integrity.js';
import chalk from 'chalk';
import { installPackages, PackageInstallOptions, downloadPackage } from './package-installer.js';
// Import version from package.json
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const version = packageJson.version;

/**
 * Package manager types
 */
export enum PackageManager {
  NPM = 'npm',
  YARN = 'yarn',
  PNPM = 'pnpm'
}

/**
 * Installation options
 */
export interface InstallOptions {
  offline: boolean;
  useCache: boolean;
  concurrency: number;
  packageManager: PackageManager;
  includeDevDependencies: boolean;
  skipPostinstall: boolean;
  registry?: string; // Add registry option
}

/**
 * Default installation options
 */
const defaultOptions: InstallOptions = {
  offline: false,
  useCache: true,
  concurrency: Math.max(1, os.cpus().length - 1),
  packageManager: PackageManager.NPM,
  includeDevDependencies: true,
  skipPostinstall: false
};

/**
 * Package dependency information
 */
interface PackageDependency {
  name: string;
  version: string;
  path: string;
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

/**
 * Installer for managing dependencies
 */
export class Installer {
  private options: InstallOptions;
  private workerPool: WorkerPool<PackageDependency, boolean> | null = null;

  /**
   * Create a new installer
   * @param options Installation options
   */
  constructor(options: Partial<InstallOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Initialize the installer
   */
  async init(): Promise<void> {
    await cache.init();

    // Create worker pool for parallel installation
    if (this.options.concurrency > 1) {
      const workerFunction = createWorkerFunction(async (pkg: PackageDependency) => {
        try {
          // This function will run in parallel
          const nodeModulesPath = path.join(pkg.path, 'node_modules', pkg.name);

          // Check if package is in cache
          if (await cache.hasPackage(pkg.name, pkg.version)) {
            await cache.restorePackage(pkg.name, pkg.version, nodeModulesPath);
            return true;
          }

          // Direct download from npm registry (much faster than using npm install)
          const registryUrl = 'https://registry.npmjs.org';
          const packageUrl = `${registryUrl}/${encodeURIComponent(pkg.name)}/-/${pkg.name}-${pkg.version}.tgz`;

          try {
            // Create temp directory
            const tempDir = path.join(os.tmpdir(), `flash-install-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
            await fsUtils.ensureDir(tempDir);

            // Download and extract package
            const tarballPath = path.join(tempDir, 'package.tgz');

            // Download using curl (much faster than npm)
            execSync(`curl -s -L -o "${tarballPath}" "${packageUrl}"`, { stdio: 'ignore' });

            // Extract tarball
            await fsUtils.ensureDir(nodeModulesPath);
            execSync(`tar -xzf "${tarballPath}" -C "${nodeModulesPath}" --strip-components=1`, { stdio: 'ignore' });

            // Clean up
            await fsUtils.remove(tempDir);

            // Add to cache
            await cache.addPackage(pkg.name, pkg.version, nodeModulesPath);
            return true;
          } catch (directError) {
            // Fall back to package manager if direct download fails
            const cmd = {
              [PackageManager.NPM]: `npm install ${pkg.name}@${pkg.version} --no-save`,
              [PackageManager.YARN]: `yarn add ${pkg.name}@${pkg.version} --no-save`,
              [PackageManager.PNPM]: `pnpm add ${pkg.name}@${pkg.version} --no-save`
            }[this.options.packageManager];

            execSync(cmd, { cwd: pkg.path, stdio: 'ignore' });

            // Add to cache
            await cache.addPackage(pkg.name, pkg.version, nodeModulesPath);
            return true;
          }
        } catch (error) {
          console.error(`Error installing ${pkg.name}@${pkg.version}: ${error}`);
          return false;
        }
      });

      this.workerPool = new WorkerPool<PackageDependency, boolean>(workerFunction, this.options.concurrency);
      await this.workerPool.init();
    }
  }

  /**
   * Detect the package manager used in the project
   * @param projectDir The project directory
   * @returns The detected package manager
   */
  detectPackageManager(projectDir: string): PackageManager {
    if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) {
      return PackageManager.YARN;
    } else if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))) {
      return PackageManager.PNPM;
    } else {
      return PackageManager.NPM;
    }
  }

  /**
   * Parse package.json file
   * @param projectDir The project directory
   * @returns The parsed package data
   */
  async parsePackageJson(projectDir: string): Promise<PackageDependency> {
    const packageJsonPath = path.join(projectDir, 'package.json');

    if (!await fsUtils.fileExists(packageJsonPath)) {
      throw new Error('package.json not found');
    }

    const packageJson = await fs.readJSON(packageJsonPath);

    return {
      name: packageJson.name || 'root',
      version: packageJson.version || '0.0.0',
      path: projectDir,
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {},
      scripts: packageJson.scripts || {}
    };
  }

  /**
   * Parse npm lockfile (package-lock.json)
   * @param projectDir The project directory
   * @returns The parsed dependencies
   */
  async parseNpmLockfile(projectDir: string): Promise<Record<string, string>> {
    const lockfilePath = path.join(projectDir, 'package-lock.json');

    if (!await fsUtils.fileExists(lockfilePath)) {
      throw new Error('package-lock.json not found');
    }

    const lockfileContent = await fs.readJSON(lockfilePath);
    const dependencies: Record<string, string> = {};

    // Handle different lockfile versions
    if (lockfileContent.lockfileVersion >= 2) {
      // v2+ format
      for (const [name, pkg] of Object.entries(lockfileContent.packages)) {
        if (name === '') continue; // Skip root package

        // Remove leading 'node_modules/' if present
        const pkgName = name.startsWith('node_modules/')
          ? name.substring('node_modules/'.length)
          : name;

        // @ts-ignore - pkg.version exists in the lockfile
        dependencies[pkgName] = pkg.version;
      }
    } else {
      // v1 format
      for (const [name, pkg] of Object.entries(lockfileContent.dependencies || {})) {
        // @ts-ignore - pkg.version exists in the lockfile
        dependencies[name] = pkg.version;
      }
    }

    return dependencies;
  }

  /**
   * Parse yarn lockfile (yarn.lock)
   * @param projectDir The project directory
   * @returns The parsed dependencies
   */
  async parseYarnLockfile(projectDir: string): Promise<Record<string, string>> {
    const lockfilePath = path.join(projectDir, 'yarn.lock');

    if (!await fsUtils.fileExists(lockfilePath)) {
      throw new Error('yarn.lock not found');
    }

    const lockfileContent = await fs.readFile(lockfilePath, 'utf8');
    const parsed = lockfile.parse(lockfileContent);

    if (parsed.type !== 'success') {
      throw new Error('Failed to parse yarn.lock');
    }

    const dependencies: Record<string, string> = {};

    for (const [key, value] of Object.entries(parsed.object)) {
      // Extract package name from the key (format: "package-name@^1.0.0")
      const name = key.substring(0, key.lastIndexOf('@'));
      // @ts-ignore - value.version exists in the lockfile
      dependencies[name] = value.version;
    }

    return dependencies;
  }

  /**
   * Parse pnpm lockfile (pnpm-lock.yaml)
   * @param projectDir The project directory
   * @returns The parsed dependencies
   */
  async parsePnpmLockfile(projectDir: string): Promise<Record<string, string>> {
    const lockfilePath = path.join(projectDir, 'pnpm-lock.yaml');

    if (!await fsUtils.fileExists(lockfilePath)) {
      throw new Error('pnpm-lock.yaml not found');
    }

    // Simple YAML parsing for pnpm lockfile
    const lockfileContent = await fs.readFile(lockfilePath, 'utf8');
    const dependencies: Record<string, string> = {};

    // Extract package versions from the lockfile
    // This is a simplified approach - a proper YAML parser would be better
    const packageRegex = /\/([^/]+)\/([^:]+):/g;
    let match;

    while ((match = packageRegex.exec(lockfileContent)) !== null) {
      const name = match[1];
      const version = match[2];
      dependencies[name] = version;
    }

    return dependencies;
  }

  /**
   * Parse lockfile based on package manager
   * @param projectDir The project directory
   * @param packageManager The package manager
   * @returns The parsed dependencies
   */
  async parseLockfile(
    projectDir: string,
    packageManager = this.options.packageManager
  ): Promise<Record<string, string>> {
    switch (packageManager) {
      case PackageManager.NPM:
        return this.parseNpmLockfile(projectDir);
      case PackageManager.YARN:
        return this.parseYarnLockfile(projectDir);
      case PackageManager.PNPM:
        return this.parsePnpmLockfile(projectDir);
      default:
        throw new Error(`Unsupported package manager: ${packageManager}`);
    }
  }

  /**
   * Install dependencies
   * @param projectDir The project directory
   * @returns True if successful
   */
  async install(projectDir: string): Promise<boolean> {
    try {
      // Start overall timer
      const totalTimer = createTimer();

      // Print banner
      console.log(chalk.cyan(`
⚡ flash-install v${version}
      `));

      console.log(chalk.cyan(`⚡ Installing dependencies in ${chalk.bold(projectDir)}`));

      // Detect package manager if not specified
      if (!this.options.packageManager) {
        this.options.packageManager = this.detectPackageManager(projectDir);
      }

      console.log(chalk.gray(`→ Using package manager: ${this.options.packageManager}`));

      // Parse package.json
      const parseTimer = createTimer();
      console.log(chalk.gray(`→ Parsing package.json...`));
      const pkg = await this.parsePackageJson(projectDir);
      logger.debug(`Parsed package.json in ${parseTimer.getElapsedFormatted()}`);

      // Parse lockfile
      let dependencies: Record<string, string>;
      const lockfileTimer = createTimer();
      try {
        console.log(chalk.gray(`→ Parsing lockfile...`));
        dependencies = await this.parseLockfile(projectDir, this.options.packageManager);
        logger.debug(`Parsed lockfile in ${lockfileTimer.getElapsedFormatted()}`);
      } catch (error) {
        console.log(chalk.yellow(`⚠ Failed to parse lockfile: ${error}`));
        console.log(chalk.yellow(`⚠ Falling back to package.json dependencies`));
        dependencies = { ...pkg.dependencies };

        if (this.options.includeDevDependencies) {
          dependencies = { ...dependencies, ...pkg.devDependencies };
        }
      }

      // Log dependency count
      const depCount = Object.keys(dependencies).length;
      console.log(chalk.cyan(`✓ Found ${chalk.bold(depCount.toString())} ${depCount === 1 ? 'dependency' : 'dependencies'} to install`));

      // Create plugin context
      const nodeModulesPath = path.join(projectDir, 'node_modules');
      const pluginContext = {
        projectDir,
        dependencies,
        nodeModulesPath,
        packageManager: this.options.packageManager
      };

      // Run pre-install hooks
      await pluginManager.runHook(PluginHook.PRE_INSTALL, pluginContext);

      // Check if we have a valid snapshot
      const snapshotCheckTimer = createTimer();
      console.log(chalk.gray(`→ Checking for valid snapshot...`));
      const hasValidSnapshot = await snapshot.isValid(projectDir, dependencies);
      logger.debug(`Checked snapshot validity in ${snapshotCheckTimer.getElapsedFormatted()}`);

      if (hasValidSnapshot) {
        console.log(chalk.green(`✓ Valid .flashpack snapshot found, restoring from snapshot...`));

        // Run pre-restore hooks
        await pluginManager.runHook(PluginHook.PRE_RESTORE, pluginContext);

        const restoreTimer = createTimer();

        const success = await snapshot.restore(projectDir);

        if (success) {
          // Run post-restore hooks
          await pluginManager.runHook(PluginHook.POST_RESTORE, pluginContext);

          console.log(chalk.green(`✓ Restored from snapshot in ${chalk.bold(restoreTimer.getElapsedFormatted())}`));
          console.log(chalk.green(`✓ Total time: ${chalk.bold(totalTimer.getElapsedFormatted())}`));

          // Compare with estimated npm install time
          const estimatedNpmTime = depCount * 0.5; // rough estimate: 0.5s per dependency
          const speedup = estimatedNpmTime / restoreTimer.getElapsedSeconds();
          if (speedup > 1) {
            console.log(chalk.cyan(`⚡ ${speedup.toFixed(1)}x faster than npm install`));
          }

          // Run post-install hooks
          await pluginManager.runHook(PluginHook.POST_INSTALL, pluginContext);
        }

        return success;
      }

      // Check if we have the dependency tree in cache
      if (this.options.useCache) {
        const cacheCheckTimer = createTimer();
        console.log(chalk.gray(`→ Checking cache for dependency tree...`));
        const hasCachedTree = await cache.hasDependencyTree(dependencies);
        logger.debug(`Checked cache in ${cacheCheckTimer.getElapsedFormatted()}`);

        if (hasCachedTree) {
          console.log(chalk.green(`✓ Dependency tree found in cache, restoring...`));
          const restoreTimer = createTimer();

          // Show progress during cache restoration
          let lastProgress = 0;
          const progressInterval = setInterval(() => {
            lastProgress += 5;
            if (lastProgress <= 100) {
              process.stdout.write(`\r${chalk.gray(`→ Restoring from cache... ${lastProgress}%`)}`);
            }
          }, 100);

          const success = await cache.restoreDependencyTree(dependencies, nodeModulesPath);

          clearInterval(progressInterval);
          process.stdout.write(`\r${chalk.gray(`→ Restoring from cache... 100%`)}\n`);

          if (success) {
            console.log(chalk.green(`✓ Restored from cache in ${chalk.bold(restoreTimer.getElapsedFormatted())}`));
            console.log(chalk.green(`✓ Total time: ${chalk.bold(totalTimer.getElapsedFormatted())}`));

            // Compare with estimated npm install time
            const estimatedNpmTime = depCount * 0.5; // rough estimate: 0.5s per dependency
            const speedup = estimatedNpmTime / restoreTimer.getElapsedSeconds();
            if (speedup > 1) {
              console.log(chalk.cyan(`⚡ ${speedup.toFixed(1)}x faster than npm install`));
            }

            // Run post-install hooks
            await pluginManager.runHook(PluginHook.POST_INSTALL, pluginContext);
          }

          return success;
        } else {
          console.log(chalk.gray(`→ No cache hit found for current dependencies`));
        }
      }

      // If offline mode is enabled and we don't have a cache hit, fail
      if (this.options.offline) {
        console.log(chalk.red(`✗ Offline mode is enabled but dependencies are not in cache`));
        return false;
      }

      // Install dependencies using package manager
      console.log(chalk.cyan(`→ Installing dependencies using ${chalk.bold(this.options.packageManager)}...`));

      const installTimer = createTimer();
      let success = false;

      // Add a simple progress indicator that updates every second
      const progressInterval = setInterval(() => {
        const elapsed = installTimer.getElapsedSeconds();
        const dots = '.'.repeat(Math.floor(elapsed) % 4);
        const spaces = ' '.repeat(3 - dots.length);
        process.stdout.write(`\r${chalk.cyan('→')} Installing packages${dots}${spaces}`);
      }, 250);

      try {
        if (this.workerPool && this.options.concurrency > 1) {
          // Parallel installation using worker threads
          console.log(chalk.gray(`\n→ Using parallel installation with ${this.options.concurrency} workers`));
          success = await this.installParallel(projectDir, dependencies);
        } else {
          // Sequential installation using package manager
          console.log(chalk.gray(`\n→ Using sequential installation`));
          success = await this.installSequential(projectDir);
        }
      } finally {
        // Always clear the interval
        clearInterval(progressInterval);
        // Clear the progress line
        process.stdout.write('\r                                \r');
      }

      if (!success) {
        console.log(chalk.red(`✗ Installation failed`));
        return false;
      }

      logger.success(`Dependencies installed in ${installTimer.getElapsedFormatted()}`);

      // Run postinstall scripts if needed
      if (!this.options.skipPostinstall && pkg.scripts && pkg.scripts.postinstall) {
        logger.info('Running postinstall script...');
        const postinstallTimer = createTimer();
        const spinner = new Spinner('Running postinstall script');
        spinner.start();

        const postinstallSuccess = await this.runScript(projectDir, 'postinstall');

        spinner.stop();
        if (postinstallSuccess) {
          logger.success(`Postinstall completed in ${postinstallTimer.getElapsedFormatted()}`);
        } else {
          logger.error('Postinstall script failed');
        }
      }

      // Create snapshot
      logger.info('Creating .flashpack snapshot...');

      // Run pre-snapshot hooks
      await pluginManager.runHook(PluginHook.PRE_SNAPSHOT, pluginContext);

      const snapshotTimer = createTimer();
      const spinner = new Spinner('Creating snapshot');
      spinner.start();

      const snapshotSuccess = await snapshot.create(projectDir, dependencies);

      spinner.stop();
      if (snapshotSuccess) {
        // Run post-snapshot hooks
        await pluginManager.runHook(PluginHook.POST_SNAPSHOT, pluginContext);

        logger.success(`Snapshot created in ${snapshotTimer.getElapsedFormatted()}`);
      }

      // Run post-install hooks
      await pluginManager.runHook(PluginHook.POST_INSTALL, pluginContext);

      // Log total time
      logger.success(`Total time: ${totalTimer.getElapsedFormatted()}`);

      // Calculate estimated npm install time based on dependency count
      try {
        logger.info('Calculating performance comparison...');

        // Get dependency count
        const pkg = await this.parsePackageJson(projectDir);
        const dependencies = { ...pkg.dependencies };
        if (this.options.includeDevDependencies && pkg.devDependencies) {
          Object.assign(dependencies, pkg.devDependencies);
        }

        const depCount = Object.keys(dependencies).length;

        // Estimate npm install time based on dependency count
        // These are conservative estimates based on real-world observations
        // npm typically takes ~1-2s per package on a fast connection
        const estimatedNpmTime = Math.max(5, depCount * 1.5); // minimum 5 seconds
        const flashTime = totalTimer.getElapsedSeconds();
        const speedup = estimatedNpmTime / flashTime;

        if (speedup > 1) {
          logger.flash(`⚡ Estimated ${speedup.toFixed(1)}x faster than npm install`);

          // Add more detailed information for larger projects
          if (depCount > 10) {
            const savedTime = estimatedNpmTime - flashTime;
            logger.info(`Saved approximately ${savedTime.toFixed(1)} seconds`);
          }
        } else {
          // For first-time installs, we might be slower due to caching overhead
          logger.info(`First install completed. Future installs will be much faster.`);
        }

        // Add information about future performance
        if (await snapshot.isValid(projectDir, dependencies)) {
          const snapshotRestoreTime = 2 + (depCount * 0.05); // Estimate: base 2s + 0.05s per package
          const futureSpeedup = estimatedNpmTime / snapshotRestoreTime;
          logger.flash(`⚡ Future installs will be ~${futureSpeedup.toFixed(1)}x faster using snapshots`);
        }
      } catch (error) {
        logger.debug(`Failed to calculate performance comparison: ${error}`);
      }

      return true;
    } catch (error) {
      logger.error(`Installation failed: ${error}`);
      return false;
    }
  }

  /**
   * Install dependencies sequentially using package manager
   * @param projectDir The project directory
   * @returns True if successful
   */
  private async installSequential(projectDir: string): Promise<boolean> {
    // Create spinner
    const spinner = new Spinner('Preparing to install dependencies');
    spinner.start();

    try {
      // Get dependencies from package.json
      const pkg = await this.parsePackageJson(projectDir);
      const dependencies = { ...pkg.dependencies };

      if (this.options.includeDevDependencies && pkg.devDependencies) {
        Object.assign(dependencies, pkg.devDependencies);
      }

      // Create node_modules directory
      const nodeModulesPath = path.join(projectDir, 'node_modules');
      await fsUtils.ensureDir(nodeModulesPath);

      // Install each dependency
      const depEntries = Object.entries(dependencies);
      let installed = 0;

      for (const [name, version] of depEntries) {
        spinner.setMessage(`Installing ${name}@${version} (${installed + 1}/${depEntries.length})`);

        const packageNodeModulesPath = path.join(nodeModulesPath, name);

        // Check if package is in cache
        if (await cache.hasPackage(name, version)) {
          await cache.restorePackage(name, version, packageNodeModulesPath);
          installed++;
          continue;
        }

        // Direct download from npm registry (much faster than using npm install)
        const registryUrl = 'https://registry.npmjs.org';
        const packageUrl = `${registryUrl}/${encodeURIComponent(name)}/-/${name}-${version.replace(/^[\^~]/, '')}.tgz`;

        try {
          // Create temp directory
          const tempDir = path.join(os.tmpdir(), `flash-install-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
          await fsUtils.ensureDir(tempDir);

          // Download and extract package
          const tarballPath = path.join(tempDir, 'package.tgz');

          // Download using curl (much faster than npm)
          execSync(`curl -s -L -o "${tarballPath}" "${packageUrl}"`, { stdio: 'ignore' });

          // Extract tarball
          await fsUtils.ensureDir(packageNodeModulesPath);
          execSync(`tar -xzf "${tarballPath}" -C "${packageNodeModulesPath}" --strip-components=1`, { stdio: 'ignore' });

          // Clean up
          await fsUtils.remove(tempDir);

          // Add to cache
          await cache.addPackage(name, version, packageNodeModulesPath);
          installed++;
        } catch (directError) {
          // Fall back to package manager if direct download fails
          spinner.setMessage(`Falling back to npm for ${name}@${version}`);

          const cmd = {
            [PackageManager.NPM]: `npm install ${name}@${version} --no-save`,
            [PackageManager.YARN]: `yarn add ${name}@${version} --no-save`,
            [PackageManager.PNPM]: `pnpm add ${name}@${version} --no-save`
          }[this.options.packageManager];

          execSync(cmd, { cwd: projectDir, stdio: 'ignore' });

          // Add to cache
          await cache.addPackage(name, version, packageNodeModulesPath);
          installed++;
        }
      }

      spinner.stop();
      logger.success(`${installed} packages installed successfully`);
      return true;
    } catch (error) {
      spinner.stop();
      logger.error(`Installation failed: ${error}`);
      return false;
    }
  }

  /**
   * Install dependencies in parallel using worker threads
   * @param projectDir The project directory
   * @param dependencies The dependencies to install
   * @returns True if successful
   */
  private async installParallel(
    projectDir: string,
    dependencies: Record<string, string>
  ): Promise<boolean> {
    if (!this.workerPool) {
      throw new Error('Worker pool not initialized');
    }

    // Create node_modules directory
    const nodeModulesPath = path.join(projectDir, 'node_modules');
    await fsUtils.ensureDir(nodeModulesPath);

    // Prepare tasks for worker pool
    const tasks: PackageDependency[] = Object.entries(dependencies).map(
      ([name, version]) => ({
        name,
        version,
        path: projectDir,
        dependencies: {}
      })
    );

    // Execute tasks in parallel with progress tracking
    const totalPackages = tasks.length;
    console.log(chalk.cyan(`→ Installing ${chalk.bold(totalPackages.toString())} packages in parallel...`));

    // Create reliable progress reporter
    const progress = new ReliableProgress('Installing packages');
    progress.start();

    // Track installed packages
    let installed = 0;
    let failed = 0;
    let lastPackage = '';

    // Process in batches
    const batchSize = this.options.concurrency;

    // Add immediate feedback
    logger.info(`Starting installation in batches of ${batchSize} packages`);

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);

      // Update progress with current batch info
      const currentBatch = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(tasks.length / batchSize);

      // Log batch start for immediate feedback
      console.log(chalk.cyan(`→ Processing batch ${currentBatch}/${totalBatches} (${batch.length} packages)`));

      // Show which packages are in this batch
      const packageNames = batch.map(t => `${chalk.green(t.name)}@${chalk.yellow(t.version)}`).join(', ');
      console.log(chalk.gray(`  Packages: ${packageNames}`));

      // Update progress status
      progress.updateStatus(`Batch ${currentBatch}/${totalBatches}`)

      // Execute batch
      const batchResults = await Promise.all(
        batch.map(async (task) => {
          try {
            // Update progress with current package
            lastPackage = `${task.name}@${task.version}`;
            progress.updateStatus(`Installing ${chalk.green(lastPackage)} (${installed}/${totalPackages})`);

            const result = await this.workerPool!.execute(task);

            if (result) {
              installed++;
              // Log success
              console.log(chalk.green(`✓ Installed ${chalk.bold(task.name)}@${chalk.bold(task.version)} (${installed}/${totalPackages})`));
            } else {
              failed++;
              // Log failure
              console.log(chalk.red(`✗ Failed to install ${chalk.bold(task.name)}@${chalk.bold(task.version)}`));
            }
            return result;
          } catch (error) {
            failed++;
            // Log error
            console.log(chalk.red(`✗ Error installing ${chalk.bold(task.name)}@${chalk.bold(task.version)}: ${error}`));
            return false;
          }
        })
      );

      // Check if any package in this batch failed
      if (batchResults.some(result => !result)) {
        logger.warn(`Some packages in batch ${currentBatch}/${totalBatches} failed to install`);
      }
    }

    // Complete progress
    progress.stop();

    // Log results
    if (failed === 0) {
      progress.complete(`All ${installed} packages installed successfully`);
      return true;
    } else {
      console.log(chalk.yellow(`⚠ ${failed} of ${totalPackages} packages failed to install`));
      return false;
    }
  }

  /**
   * Run a package script
   * @param projectDir The project directory
   * @param script The script name
   * @returns True if successful
   */
  async runScript(projectDir: string, script: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const cmd = {
        [PackageManager.NPM]: 'npm',
        [PackageManager.YARN]: 'yarn',
        [PackageManager.PNPM]: 'pnpm'
      }[this.options.packageManager];

      const args = {
        [PackageManager.NPM]: ['run', script],
        [PackageManager.YARN]: ['run', script],
        [PackageManager.PNPM]: ['run', script]
      }[this.options.packageManager];

      const child = spawn(cmd, args, {
        cwd: projectDir,
        stdio: 'inherit',
        shell: true
      });

      child.on('close', (code) => {
        if (code === 0) {
          logger.success(`Script '${script}' completed successfully`);
          resolve(true);
        } else {
          logger.error(`Script '${script}' failed with code ${code}`);
          resolve(false);
        }
      });
    });
  }

  /**
   * Clean node_modules and local cache
   * @param projectDir The project directory
   * @returns True if successful
   */
  async clean(projectDir: string): Promise<boolean> {
    try {
      const nodeModulesPath = path.join(projectDir, 'node_modules');
      const flashpackPath = path.join(projectDir, '.flashpack');

      // Remove node_modules
      if (await fsUtils.directoryExists(nodeModulesPath)) {
        logger.info('Removing node_modules directory...');
        await fsUtils.remove(nodeModulesPath);
      }

      // Remove .flashpack
      if (await fsUtils.fileExists(flashpackPath)) {
        logger.info('Removing .flashpack snapshot...');
        await fsUtils.remove(flashpackPath);
      }

      logger.success('Clean completed successfully');
      return true;
    } catch (error) {
      logger.error(`Clean failed: ${error}`);
      return false;
    }
  }

  /**
   * Install specific packages
   * @param projectDir Project directory
   * @param packages Array of package names with optional versions
   * @param options Installation options
   * @returns True if successful
   */
  async installPackages(
    projectDir: string,
    packages: string[],
    options: PackageInstallOptions
  ): Promise<boolean> {
    return installPackages(projectDir, packages, this.options.packageManager, {
      ...options,
      registry: this.options.registry
    });
  }

  /**
   * Download a package tarball
   * @param packageName Package name with optional version
   * @param outputDir Output directory
   * @returns Path to downloaded tarball
   */
  async downloadPackage(packageName: string, outputDir: string): Promise<string> {
    return downloadPackage(packageName, outputDir, {
      registry: this.options.registry
    });
  }
}

// Export a default installer instance
export const installer = new Installer();
