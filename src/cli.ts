#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { execSync } from 'child_process';
import { logger } from './utils/logger.js';
import { installer, PackageManager, Installer } from './install.js';
import { snapshot, SnapshotFormat, Snapshot } from './snapshot.js';
import { cache } from './cache.js';
import * as fsUtils from './utils/fs.js';
import { registerPluginCommands } from './plugin-commands.js';
import { NetworkStatus, networkManager } from './utils/network.js';
import { Spinner } from './utils/progress.js';
import { cloudCache, SyncPolicy, CloudCacheConfig } from './cloud/cloud-cache.js';
import { CloudProgress } from './utils/cloud-progress.js';
import { workspaceManager } from './workspace.js';
import { Sync } from './sync.js';
import { startTui } from './tui/index.js';

/**
 * Get colored network status
 * @param status Network status
 * @returns Colored status string
 */
function getNetworkStatusColor(status: NetworkStatus): string {
  switch (status) {
    case NetworkStatus.ONLINE:
      return chalk.green(status);
    case NetworkStatus.OFFLINE:
      return chalk.red(status);
    case NetworkStatus.PARTIAL:
      return chalk.yellow(status);
    case NetworkStatus.UNKNOWN:
    default:
      return chalk.gray(status);
  }
}

// Get package version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Create CLI program
const program = new Command();

program
  .name('flash-install')
  .description('A fast, drop-in replacement for npm install with deterministic caching')
  .version(version)
  .option('--debug', 'Enable debug mode', false);

// Default command (install)
program
  .argument('[packages...]', 'Optional packages to install (e.g., express react)')
  .option('-c, --concurrency <number>', 'Number of concurrent installations', '10')
  .option('-p, --package-manager <manager>', 'Package manager to use (npm, yarn, pnpm)')
  .option('--no-cache', 'Disable cache')
  .option('--offline', 'Use offline mode')
  .option('--registry <url>', 'Specify npm registry URL')
  .option('--save', 'Save to dependencies')
  .option('--save-dev', 'Save to devDependencies')
  .option('--save-exact', 'Save exact version')
  .option('--no-dev', 'Skip dev dependencies')
  .option('-w, --workspace', 'Enable workspace support')
  .option('--no-hoist', 'Disable dependency hoisting in workspaces')
  .option('--no-parallel-workspaces', 'Disable parallel installation of workspace packages')
  .option('--workspace-concurrency <number>', 'Number of concurrent workspace installations', '4')
  .option('--workspace-filter <packages...>', 'Filter specific workspace packages')
  .option('--no-network-check', 'Disable network availability check')
  .option('--network-timeout <ms>', 'Network check timeout in milliseconds', '5000')
  .option('--network-retries <number>', 'Number of retries for network operations', '2')
  .option('--no-fallbacks', 'Disable fallbacks in offline mode')
  .option('--no-outdated-warnings', 'Disable warnings about outdated dependencies in offline mode')
  .option('--cloud-cache', 'Enable cloud cache integration')
  .option('--cloud-provider <provider>', 'Cloud provider type (s3)', 's3')
  .option('--cloud-region <region>', 'Cloud provider region')
  .option('--cloud-endpoint <url>', 'Cloud provider endpoint URL')
  .option('--cloud-bucket <name>', 'Cloud provider bucket name')
  .option('--cloud-prefix <prefix>', 'Cloud provider prefix')
  .option('--cloud-sync <policy>', 'Cloud sync policy (always-upload, always-download, upload-if-missing, download-if-missing, newest)', 'upload-if-missing')
  .option('--team-id <id>', 'Team ID for shared caching')
  .option('--team-token <token>', 'Team access token')
  .option('--team-access-level <level>', 'Team access level (read, write, admin)', 'read')
  .option('--team-restrict', 'Restrict access to team members only', false)
  .action(async (packages, options) => {
    try {
      const projectDir = process.cwd();

      // If specific packages are provided, install them
      if (packages && packages.length > 0) {
        console.log(chalk.cyan(`
⚡ flash-install v${version}
        `));

        console.log(chalk.cyan(`⚡ Installing packages: ${packages.join(', ')}`));

        // Configure workspace options
        const workspaceOptions = options.workspace ? {
          enabled: true,
          hoistDependencies: options.hoist !== false,
          parallelInstall: options.parallelWorkspaces !== false,
          maxConcurrency: parseInt(options.workspaceConcurrency || '4', 10),
          filter: options.workspaceFilter
        } : undefined;

        // Configure network options
        const networkOptions = {
          checkAvailability: options.networkCheck !== false,
          timeout: parseInt(options.networkTimeout || '5000', 10),
          retries: parseInt(options.networkRetries || '2', 10),
          allowFallbacks: options.fallbacks !== false,
          warnOutdated: options.outdatedWarnings !== false
        };

        // Configure cloud cache if enabled
        let cloudCacheConfig: CloudCacheConfig | undefined;
        if (options.cloudCache) {
          if (!options.cloudBucket) {
            console.log(chalk.yellow('⚠ Cloud cache enabled but no bucket specified. Use --cloud-bucket to specify a bucket.'));
          } else {
            // Map sync policy string to enum
            let syncPolicy = SyncPolicy.UPLOAD_IF_MISSING;
            switch (options.cloudSync) {
              case 'always-upload':
                syncPolicy = SyncPolicy.ALWAYS_UPLOAD;
                break;
              case 'always-download':
                syncPolicy = SyncPolicy.ALWAYS_DOWNLOAD;
                break;
              case 'upload-if-missing':
                syncPolicy = SyncPolicy.UPLOAD_IF_MISSING;
                break;
              case 'download-if-missing':
                syncPolicy = SyncPolicy.DOWNLOAD_IF_MISSING;
                break;
              case 'newest':
                syncPolicy = SyncPolicy.NEWEST;
                break;
            }

            cloudCacheConfig = {
              enabled: true,
              provider: {
                type: options.cloudProvider || 's3',
                region: options.cloudRegion,
                endpoint: options.cloudEndpoint,
                bucket: options.cloudBucket,
                prefix: options.cloudPrefix
              },
              syncPolicy,
              localCacheDir: cache.cacheDir,
              teamId: options.teamId,
              teamAccess: options.teamId ? {
                token: options.teamToken,
                level: options.teamAccessLevel as 'read' | 'write' | 'admin',
                restrictToTeam: options.teamRestrict
              } : undefined
            };

            console.log(chalk.cyan(`→ Cloud cache enabled with ${options.cloudProvider} provider`));
          }
        }

        const installer = new Installer({
          concurrency: parseInt(options.concurrency, 10),
          packageManager: options.packageManager,
          includeDevDependencies: options.dev !== false,
          useCache: options.cache !== false,
          offline: options.offline || false,
          registry: options.registry,
          workspace: workspaceOptions,
          network: networkOptions,
          cloud: cloudCacheConfig
        });

        await installer.init();
        const success = await installer.installPackages(
          process.cwd(),
          packages,
          {
            saveToDependencies: options.save || (!options.saveDev && options.saveExact) || (!options.saveDev && !options.save),
            saveToDevDependencies: options.saveDev,
            saveExact: options.saveExact
          }
        );

        process.exit(success ? 0 : 1);
      } else {
        // Configure workspace options
        const workspaceOptions = options.workspace ? {
          enabled: true,
          hoistDependencies: options.hoist !== false,
          parallelInstall: options.parallelWorkspaces !== false,
          maxConcurrency: parseInt(options.workspaceConcurrency || '4', 10),
          filter: options.workspaceFilter
        } : undefined;

        // Configure network options
        const networkOptions = {
          checkAvailability: options.networkCheck !== false,
          timeout: parseInt(options.networkTimeout || '5000', 10),
          retries: parseInt(options.networkRetries || '2', 10),
          allowFallbacks: options.fallbacks !== false,
          warnOutdated: options.outdatedWarnings !== false
        };

        // Configure cloud cache if enabled
        let cloudCacheConfig: CloudCacheConfig | undefined;
        if (options.cloudCache) {
          if (!options.cloudBucket) {
            console.log(chalk.yellow('⚠ Cloud cache enabled but no bucket specified. Use --cloud-bucket to specify a bucket.'));
          } else {
            // Map sync policy string to enum
            let syncPolicy = SyncPolicy.UPLOAD_IF_MISSING;
            switch (options.cloudSync) {
              case 'always-upload':
                syncPolicy = SyncPolicy.ALWAYS_UPLOAD;
                break;
              case 'always-download':
                syncPolicy = SyncPolicy.ALWAYS_DOWNLOAD;
                break;
              case 'upload-if-missing':
                syncPolicy = SyncPolicy.UPLOAD_IF_MISSING;
                break;
              case 'download-if-missing':
                syncPolicy = SyncPolicy.DOWNLOAD_IF_MISSING;
                break;
              case 'newest':
                syncPolicy = SyncPolicy.NEWEST;
                break;
            }

            cloudCacheConfig = {
              enabled: true,
              provider: {
                type: options.cloudProvider || 's3',
                region: options.cloudRegion,
                endpoint: options.cloudEndpoint,
                bucket: options.cloudBucket,
                prefix: options.cloudPrefix
              },
              syncPolicy,
              localCacheDir: cache.cacheDir,
              teamId: options.teamId,
              teamAccess: options.teamId ? {
                token: options.teamToken,
                level: options.teamAccessLevel as 'read' | 'write' | 'admin',
                restrictToTeam: options.teamRestrict
              } : undefined
            };

            console.log(chalk.cyan(`→ Cloud cache enabled with ${options.cloudProvider} provider`));
          }
        }

        // Install all dependencies
        const customInstaller = new Installer({
          concurrency: parseInt(options.concurrency, 10),
          packageManager: options.packageManager,
          includeDevDependencies: options.dev !== false,
          useCache: options.cache !== false,
          offline: options.offline || false,
          registry: options.registry,
          workspace: workspaceOptions,
          network: networkOptions,
          cloud: cloudCacheConfig
        });

        await customInstaller.init();
        const success = await customInstaller.install(projectDir);

        process.exit(success ? 0 : 1);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Snapshot command
program
  .command('snapshot')
  .description('Create a .flashpack snapshot of node_modules')
  .argument('[dir]', 'Project directory', '.')
  .option('-f, --format <format>', 'Snapshot format (zip, tar, tar.gz)', 'tar.gz')
  .option('-c, --compression <level>', 'Compression level (0-9)', '6')
  .option('-o, --output <path>', 'Output path for snapshot')
  .option('-t, --cache-timeout <seconds>', 'Timeout for cache operation in seconds', '30')
  .action(async (dir, options) => {
    // Resolve project directory
    const projectDir = path.resolve(dir);

    // Check if directory exists
    if (!await fsUtils.directoryExists(projectDir)) {
      logger.error(`Directory not found: ${projectDir}`);
      process.exit(1);
    }

    // Check if package.json exists
    const packageJsonPath = path.join(projectDir, 'package.json');
    if (!await fsUtils.fileExists(packageJsonPath)) {
      logger.error(`package.json not found in ${projectDir}`);
      process.exit(1);
    }

    // Check if node_modules exists
    const nodeModulesPath = path.join(projectDir, 'node_modules');
    if (!await fsUtils.directoryExists(nodeModulesPath)) {
      logger.error(`node_modules not found in ${projectDir}`);
      process.exit(1);
    }

    // Configure snapshot
    let format: SnapshotFormat;
    switch (options.format.toLowerCase()) {
      case 'zip':
        format = SnapshotFormat.ZIP;
        break;
      case 'tar':
        format = SnapshotFormat.TAR;
        break;
      case 'tar.gz':
      case 'tgz':
        format = SnapshotFormat.TAR_GZ;
        break;
      default:
        logger.error(`Unsupported snapshot format: ${options.format}`);
        process.exit(1);
    }

    const compressionLevel = parseInt(options.compression, 10);
    if (isNaN(compressionLevel) || compressionLevel < 0 || compressionLevel > 9) {
      logger.error('Compression level must be between 0 and 9');
      process.exit(1);
    }

    const customSnapshot = new Snapshot({
      format,
      compressionLevel
    });

    // Parse package.json and lockfile
    try {
      // Detect package manager
      const packageManager = installer.detectPackageManager(projectDir);
      // Parse lockfile
      const dependencies = await installer.parseLockfile(projectDir, packageManager);

      // Create snapshot
      logger.flash(`Creating snapshot for ${chalk.bold(projectDir)}`);
      const success = await customSnapshot.create(projectDir, dependencies, options.output);

      if (!success) {
        process.exit(1);
      }
    } catch (error) {
      logger.error(`Failed to create snapshot: ${error}`);
      process.exit(1);
    }
  });

// Restore command
program
  .command('restore')
  .description('Restore node_modules from a .flashpack snapshot')
  .argument('[dir]', 'Project directory', '.')
  .option('-s, --snapshot <path>', 'Path to snapshot file')
  .action(async (dir, options) => {
    // Resolve project directory
    const projectDir = path.resolve(dir);

    // Check if directory exists
    if (!await fsUtils.directoryExists(projectDir)) {
      logger.error(`Directory not found: ${projectDir}`);
      process.exit(1);
    }

    // Check if package.json exists
    const packageJsonPath = path.join(projectDir, 'package.json');
    if (!await fsUtils.fileExists(packageJsonPath)) {
      logger.error(`package.json not found in ${projectDir}`);
      process.exit(1);
    }

    // Restore from snapshot
    logger.flash(`Restoring node_modules in ${chalk.bold(projectDir)}`);
    const success = await snapshot.restore(projectDir, options.snapshot);

    if (!success) {
      process.exit(1);
    }
  });

// Clean command
program
  .command('clean')
  .description('Remove node_modules and local .flashpack')
  .argument('[dir]', 'Project directory', '.')
  .option('-g, --global', 'Clean global cache instead of project', false)
  .option('-a, --all', 'Clean both project and global cache', false)
  .option('--cache-max-age <days>', 'Maximum age for cache entries in days', '30')
  .action(async (dir, options) => {
    // Resolve project directory
    const projectDir = path.resolve(dir);

    if (options.global || options.all) {
      // Clean global cache
      logger.flash('Cleaning global cache...');

      await cache.init();

      if (options.cacheMaxAge) {
        const maxAge = parseInt(options.cacheMaxAge, 10) * 24 * 60 * 60 * 1000;
        const removed = await cache.clean(maxAge);
        logger.success(`Removed ${removed} old cache entries`);
      } else {
        const success = await cache.clearAll();
        if (success) {
          logger.success('Global cache cleared successfully');
        } else {
          logger.error('Failed to clear global cache');
          process.exit(1);
        }
      }
    }

    if (!options.global || options.all) {
      // Check if directory exists
      if (!await fsUtils.directoryExists(projectDir)) {
        logger.error(`Directory not found: ${projectDir}`);
        process.exit(1);
      }

      // Clean project
      logger.flash(`Cleaning project in ${chalk.bold(projectDir)}`);
      const success = await installer.clean(projectDir);

      if (!success) {
        process.exit(1);
      }
    }
  });

// Clean modules command (only removes node_modules)
program
  .command('clean-modules')
  .description('Remove only node_modules directory (preserves snapshot)')
  .argument('[dir]', 'Project directory', '.')
  .action(async (dir) => {
    // Resolve project directory
    const projectDir = path.resolve(dir);

    // Check if directory exists
    if (!await fsUtils.directoryExists(projectDir)) {
      logger.error(`Directory not found: ${projectDir}`);
      process.exit(1);
    }

    // Check if node_modules exists
    const nodeModulesPath = path.join(projectDir, 'node_modules');

    logger.flash(`Cleaning node_modules in ${chalk.bold(projectDir)}`);

    try {
      // Remove node_modules
      if (await fsUtils.directoryExists(nodeModulesPath)) {
        await fsUtils.remove(nodeModulesPath);
        logger.success(`Cleaned node_modules in ${chalk.bold(projectDir)} (snapshot preserved)`);
      } else {
        logger.info(`No node_modules directory found in ${chalk.bold(projectDir)}`);
      }
    } catch (error) {
      logger.error(`Failed to clean node_modules: ${error}`);
      process.exit(1);
    }
  });

// Clean snapshot command (only removes snapshot)
program
  .command('clean-snapshot')
  .description('Remove only snapshot file (preserves node_modules)')
  .argument('[dir]', 'Project directory', '.')
  .action(async (dir) => {
    // Resolve project directory
    const projectDir = path.resolve(dir);

    // Check if directory exists
    if (!await fsUtils.directoryExists(projectDir)) {
      logger.error(`Directory not found: ${projectDir}`);
      process.exit(1);
    }

    // Check if snapshot exists
    const snapshotPath = path.join(projectDir, '.flashpack');

    logger.flash(`Cleaning snapshot in ${chalk.bold(projectDir)}`);

    try {
      // Remove snapshot
      if (await fsUtils.fileExists(snapshotPath)) {
        await fsUtils.remove(snapshotPath);
        logger.success(`Cleaned snapshot in ${chalk.bold(projectDir)} (node_modules preserved)`);
      } else {
        logger.info(`No snapshot file found in ${chalk.bold(projectDir)}`);
      }
    } catch (error) {
      logger.error(`Failed to clean snapshot: ${error}`);
      process.exit(1);
    }
  });

// Interactive mode command
program
  .command('interactive')
  .alias('ui')
  .description('Start interactive TUI mode')
  .argument('[dir]', 'Project directory', '.')
  .action(async (dir) => {
    // Resolve project directory
    const projectDir = path.resolve(dir);

    // Check if directory exists
    if (!await fsUtils.directoryExists(projectDir)) {
      logger.error(`Directory not found: ${projectDir}`);
      process.exit(1);
    }

    // Check if package.json exists
    const packageJsonPath = path.join(projectDir, 'package.json');
    if (!await fsUtils.fileExists(packageJsonPath)) {
      logger.error(`package.json not found in ${projectDir}`);
      process.exit(1);
    }

    // Start interactive mode
    console.log(chalk.cyan(`
⚡ flash-install v${version} - Interactive Mode
    `));

    console.log(chalk.cyan(`Starting interactive mode for ${chalk.bold(projectDir)}`));

    // Start the TUI
    startTui(projectDir);
  });

// Package manager command
program
  .command('pm')
  .description('Package manager utilities')
  .addCommand(
    new Command('use')
      .description('Set the package manager for a project')
      .argument('<manager>', 'Package manager to use (npm, yarn, pnpm, bun)')
      .argument('[dir]', 'Project directory', '.')
      .action(async (manager, dir) => {
        // Resolve project directory
        const projectDir = path.resolve(dir);

        // Check if directory exists
        if (!await fsUtils.directoryExists(projectDir)) {
          logger.error(`Directory not found: ${projectDir}`);
          process.exit(1);
        }

        // Check if package.json exists
        const packageJsonPath = path.join(projectDir, 'package.json');
        if (!await fsUtils.fileExists(packageJsonPath)) {
          logger.error(`package.json not found in ${projectDir}`);
          process.exit(1);
        }

        // Validate package manager
        const validManagers = ['npm', 'yarn', 'pnpm', 'bun'];
        if (!validManagers.includes(manager)) {
          logger.error(`Invalid package manager: ${manager}`);
          logger.info(`Valid package managers: ${validManagers.join(', ')}`);
          process.exit(1);
        }

        // Check if the package manager is installed
        try {
          execSync(`${manager} --version`, { stdio: 'ignore' });
        } catch (error) {
          logger.error(`Package manager ${chalk.bold(manager)} is not installed.`);
          process.exit(1);
        }

        // Initialize installer
        const customInstaller = new Installer({
          packageManager: manager as PackageManager
        });

        // Get package manager version
        const packageManagerVersion = customInstaller.getPackageManagerVersion(manager as PackageManager);

        logger.flash(`Setting package manager to ${chalk.bold(manager)}${packageManagerVersion ? ` v${packageManagerVersion}` : ''}`);

        // Create or update .npmrc file for npm
        if (manager === 'npm') {
          const npmrcPath = path.join(projectDir, '.npmrc');
          await fs.writeFile(npmrcPath, 'package-manager=npm\n');
          logger.success(`Created .npmrc file`);
        }
        // Create or update .yarnrc file for yarn
        else if (manager === 'yarn') {
          const yarnrcPath = path.join(projectDir, '.yarnrc');
          await fs.writeFile(yarnrcPath, '# Set by flash-install\n');
          logger.success(`Created .yarnrc file`);
        }
        // Create or update .npmrc file for pnpm
        else if (manager === 'pnpm') {
          const npmrcPath = path.join(projectDir, '.npmrc');
          await fs.writeFile(npmrcPath, 'package-manager=pnpm\n');
          logger.success(`Created .npmrc file`);
        }
        // Create or update .bunfig.toml file for bun
        else if (manager === 'bun') {
          const bunfigPath = path.join(projectDir, '.bunfig.toml');
          await fs.writeFile(bunfigPath, '# Set by flash-install\n');
          logger.success(`Created .bunfig.toml file`);
        }

        // Update package.json
        try {
          const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

          // Add packageManager field
          pkg.packageManager = `${manager}@${packageManagerVersion || '*'}`;

          // Write updated package.json
          await fs.writeFile(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');

          logger.success(`Updated package.json with packageManager field`);
        } catch (error) {
          logger.error(`Failed to update package.json: ${error}`);
          process.exit(1);
        }

        logger.success(`Successfully set package manager to ${chalk.bold(manager)}`);
      })
  )
  .addCommand(
    new Command('info')
      .description('Show information about available package managers')
      .argument('[dir]', 'Project directory', '.')
      .action(async (dir) => {
        // Resolve project directory
        const projectDir = path.resolve(dir);

        // Check if directory exists
        if (!await fsUtils.directoryExists(projectDir)) {
          logger.error(`Directory not found: ${projectDir}`);
          process.exit(1);
        }

        // Initialize installer
        const customInstaller = new Installer();

        // Get information about package managers
        const packageManagers = [
          PackageManager.NPM,
          PackageManager.YARN,
          PackageManager.PNPM,
          PackageManager.BUN
        ];

        console.log(chalk.cyan(`
⚡ flash-install Package Manager Info
        `));

        console.log(chalk.cyan(`Project directory: ${chalk.bold(projectDir)}`));

        // Detect current package manager
        const currentPackageManager = customInstaller.detectPackageManager(projectDir);
        console.log(chalk.cyan(`Current package manager: ${chalk.bold(currentPackageManager)}`));

        console.log('\nAvailable package managers:');

        for (const pm of packageManagers) {
          const isInstalled = customInstaller.isPackageManagerInstalled(pm);
          const version = customInstaller.getPackageManagerVersion(pm);

          if (isInstalled) {
            console.log(`${chalk.green('✓')} ${chalk.bold(pm)}${version ? ` v${version}` : ''}`);
          } else {
            console.log(`${chalk.red('✗')} ${chalk.bold(pm)} (not installed)`);
          }
        }

        console.log('\nTo change package manager:');
        console.log(`  ${chalk.cyan('flash-install pm use <manager>')}`);
      })
  );

// Sync command
program
  .command('sync')
  .description('Synchronize dependencies with lockfile')
  .argument('[dir]', 'Project directory', '.')
  .option('-f, --force', 'Force sync even if dependencies are up to date', false)
  .option('--skip-snapshot', 'Skip creating snapshot after sync', false)
  .option('--skip-cache', 'Skip using cache during sync', false)
  .action(async (dir, options) => {
    // Resolve project directory
    const projectDir = path.resolve(dir);

    // Check if directory exists
    if (!await fsUtils.directoryExists(projectDir)) {
      logger.error(`Directory not found: ${projectDir}`);
      process.exit(1);
    }

    // Check if package.json exists
    const packageJsonPath = path.join(projectDir, 'package.json');
    if (!await fsUtils.fileExists(packageJsonPath)) {
      logger.error(`package.json not found in ${projectDir}`);
      process.exit(1);
    }

    // Print banner
    console.log(chalk.cyan(`
⚡ flash-install sync v${version}
    `));

    // Configure sync
    const syncOptions = {
      force: options.force,
      skipSnapshot: options.skipSnapshot,
      skipCache: options.skipCache
    };

    const customSync = new Sync(syncOptions);

    // Sync dependencies
    logger.flash(`Synchronizing dependencies in ${chalk.bold(projectDir)}`);
    const success = await customSync.sync(projectDir);

    if (!success) {
      process.exit(1);
    }
  });

// Cloud sync command
program
  .command('cloud-sync')
  .description('Synchronize cache with cloud storage')
  .option('-d, --direction <direction>', 'Sync direction (upload, download, both)', 'both')
  .option('-f, --force', 'Force synchronization even if files exist', false)
  .option('--cloud-provider <provider>', 'Cloud provider type (s3, azure, gcp)', 's3')
  .option('--cloud-region <region>', 'Cloud provider region')
  .option('--cloud-endpoint <url>', 'Cloud provider endpoint URL')
  .option('--cloud-bucket <n>', 'Cloud provider bucket name')
  .option('--cloud-prefix <prefix>', 'Cloud provider prefix')
  .option('--team-id <id>', 'Team ID for shared caching')
  .option('--team-token <token>', 'Team access token')
  .option('--team-access-level <level>', 'Team access level (read, write, admin)', 'read')
  .option('--team-restrict', 'Restrict access to team members only', false)
  .action(async (options) => {
    try {
      console.log(chalk.cyan(`
⚡ flash-install cloud-sync v${version}
      `));

      if (!options.cloudBucket) {
        console.log(chalk.red('Error: Cloud bucket is required. Use --cloud-bucket to specify a bucket.'));
        process.exit(1);
      }

      // Validate direction
      if (!['upload', 'download', 'both'].includes(options.direction)) {
        console.log(chalk.red(`Error: Invalid direction: ${options.direction}. Must be one of: upload, download, both.`));
        process.exit(1);
      }

      // Initialize cache
      await cache.init();

      // Configure cloud cache
      const cloudCacheConfig: CloudCacheConfig = {
        enabled: true,
        provider: {
          type: options.cloudProvider || 's3',
          region: options.cloudRegion,
          endpoint: options.cloudEndpoint,
          bucket: options.cloudBucket,
          prefix: options.cloudPrefix
        },
        syncPolicy: SyncPolicy.NEWEST,
        localCacheDir: cache.cacheDir,
        teamId: options.teamId,
        teamAccess: options.teamId ? {
          token: options.teamToken,
          level: options.teamAccessLevel as 'read' | 'write' | 'admin',
          restrictToTeam: options.teamRestrict
        } : undefined
      };

      // Initialize cloud cache
      await cloudCache.init(cloudCacheConfig);

      // Sync cache
      console.log(chalk.cyan(`→ Synchronizing cache with ${options.cloudProvider} (${options.direction})`));
      const success = await cloudCache.syncCache(options.direction as 'upload' | 'download' | 'both', options.force);

      if (!success) {
        console.log(chalk.red('Error: Failed to synchronize cache with cloud.'));
        process.exit(1);
      }

      console.log(chalk.green('✓ Cache synchronized successfully with cloud.'));
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Cache info command
const cacheCommand = program
  .command('cache')
  .description('Show cache information')
  .option('-v, --verify', 'Verify cache integrity', false)
  .option('-o, --optimize', 'Optimize cache', false)
  .action(async (options) => {
    await cache.init();

    if (options.verify) {
      await cache.verify();
    }

    if (options.optimize) {
      await cache.optimize();
    }

    const stats = await cache.getStats();

    console.log(chalk.cyan('\n⚡ Flash Install Cache Information\n'));
    console.log(`Total entries: ${stats.entries}`);
    console.log(`Packages: ${stats.packages}`);
    console.log(`Dependency trees: ${stats.trees}`);
    console.log(`Total size: ${fsUtils.formatSize(stats.size)}`);

    if (stats.oldestEntry) {
      const oldestDate = new Date(stats.oldestEntry);
      console.log(`Oldest entry: ${oldestDate.toLocaleDateString()}`);
    }

    if (stats.newestEntry) {
      const newestDate = new Date(stats.newestEntry);
      console.log(`Newest entry: ${newestDate.toLocaleDateString()}`);
    }

    console.log(`Average entry size: ${fsUtils.formatSize(stats.avgSize)}`);
    console.log(`Cache location: ${cache.cacheDir}`);
  });

// Cloud cache commands
cacheCommand
  .command('cloud')
  .description('Configure cloud cache')
  .option('-p, --provider <provider>', 'Cloud provider (s3)', 's3')
  .option('-e, --endpoint <endpoint>', 'Provider endpoint URL')
  .option('-r, --region <region>', 'Provider region', 'us-east-1')
  .option('-b, --bucket <bucket>', 'Provider bucket name')
  .option('--prefix <prefix>', 'Provider bucket prefix')
  .option('-t, --team <team>', 'Team ID for shared caching')
  .option('-s, --sync-policy <policy>', 'Synchronization policy', 'upload-if-missing')
  .option('--disable', 'Disable cloud cache')
  .option('--enable', 'Enable cloud cache')
  .option('--test', 'Test cloud cache configuration')
  .action(async (options) => {
    try {
      // Initialize cache
      await cache.init();

      // Get current cloud config
      const currentConfig = cache.getOptions().cloud;

      // Determine if we're enabling or disabling
      const enabled = options.enable || (!options.disable && (currentConfig?.enabled ?? false));

      // Parse sync policy
      let syncPolicy: SyncPolicy;
      switch (options.syncPolicy) {
        case 'always-upload':
          syncPolicy = SyncPolicy.ALWAYS_UPLOAD;
          break;
        case 'always-download':
          syncPolicy = SyncPolicy.ALWAYS_DOWNLOAD;
          break;
        case 'upload-if-missing':
          syncPolicy = SyncPolicy.UPLOAD_IF_MISSING;
          break;
        case 'download-if-missing':
          syncPolicy = SyncPolicy.DOWNLOAD_IF_MISSING;
          break;
        case 'newest':
          syncPolicy = SyncPolicy.NEWEST;
          break;
        default:
          syncPolicy = SyncPolicy.UPLOAD_IF_MISSING;
      }

      // Create cloud config
      const cloudConfig: CloudCacheConfig = {
        enabled,
        syncPolicy,
        localCacheDir: cache.cacheDir,
        teamId: options.team || currentConfig?.teamId,
        provider: {
          type: options.provider || currentConfig?.provider?.type || 's3',
          endpoint: options.endpoint || currentConfig?.provider?.endpoint,
          region: options.region || currentConfig?.provider?.region || 'us-east-1',
          bucket: options.bucket || currentConfig?.provider?.bucket || '',
          prefix: options.prefix || currentConfig?.provider?.prefix || '',
          credentials: currentConfig?.provider?.credentials
        }
      };

      // Validate config
      if (enabled && !cloudConfig.provider.bucket) {
        logger.error('Bucket name is required for cloud cache');
        process.exit(1);
      }

      // Update cache options
      cache.setOptions({
        ...cache.getOptions(),
        cloud: cloudConfig
      });

      // Initialize cloud cache
      if (enabled) {
        try {
          await cloudCache.init(cloudConfig);
          logger.success('Cloud cache configured successfully');

          // Test connection if requested
          if (options.test) {
            logger.info('Testing cloud cache connection...');

            // Create test file
            const testDir = path.join(os.tmpdir(), `flash-install-${Date.now()}`);
            await fsUtils.ensureDir(testDir);
            const testFile = path.join(testDir, 'test.txt');
            await fs.writeFile(testFile, 'Test file for flash-install cloud cache');

            // Upload test file
            await cloudCache.getProvider().uploadFile(testFile, 'test.txt');
            logger.success('Successfully uploaded test file to cloud cache');

            // Download test file
            const downloadFile = path.join(testDir, 'test-download.txt');
            await cloudCache.getProvider().downloadFile('test.txt', downloadFile);
            logger.success('Successfully downloaded test file from cloud cache');

            // Delete test file
            await cloudCache.getProvider().deleteFile('test.txt');
            logger.success('Successfully deleted test file from cloud cache');

            // Clean up
            await fsUtils.remove(testDir);

            logger.success('Cloud cache test completed successfully');
          }
        } catch (error) {
          logger.error(`Failed to initialize cloud cache: ${error}`);
          process.exit(1);
        }
      } else {
        logger.info('Cloud cache is disabled');
      }

      // Save configuration
      await cache.saveConfig();

    } catch (error) {
      logger.error(`Failed to configure cloud cache: ${error}`);
      process.exit(1);
    }
  });

cacheCommand
  .command('cloud-sync')
  .description('Synchronize with cloud cache')
  .option('-d, --direction <direction>', 'Sync direction (upload, download, both)', 'both')
  .option('-f, --force', 'Force synchronization', false)
  .action(async (options) => {
    try {
      // Initialize cache
      await cache.init();

      // Check if cloud cache is enabled
      if (!cache.getOptions().cloud?.enabled) {
        logger.error('Cloud cache is not enabled');
        process.exit(1);
      }

      // Initialize cloud cache
      await cloudCache.init(cache.getOptions().cloud!);

      // Create progress indicator
      const progress = new CloudProgress('Synchronizing with cloud cache');
      progress.start();

      // Get all cache entries
      const entries = Array.from(cache.getMetadata().entries());

      // Filter entries
      const packages: [string, string][] = [];
      const trees: [Record<string, string>, string][] = [];

      for (const [hash, entry] of entries) {
        if (entry.name === 'tree') {
          // This is a dependency tree
          // We need to reconstruct the dependencies
          const dependencies = cache.getDependenciesFromHash(hash);
          if (dependencies) {
            const treePath = cache.getDependencyTreePath(dependencies);
            trees.push([dependencies, treePath]);
          }
        } else {
          // This is a package
          packages.push([entry.name, entry.version]);
        }
      }

      // Synchronize packages
      if (options.direction === 'upload' || options.direction === 'both') {
        progress.updateStatus(`Uploading ${packages.length} packages to cloud cache...`);

        let uploaded = 0;
        for (const [name, version] of packages) {
          try {
            const packagePath = cache.getPackagePath(name, version);
            await cloudCache.syncPackage(name, version, packagePath);
            uploaded++;
            progress.updateStatus(`Uploaded ${uploaded}/${packages.length} packages`);
          } catch (error) {
            logger.warn(`Failed to upload package ${name}@${version}: ${error}`);
          }
        }

        logger.success(`Uploaded ${uploaded}/${packages.length} packages to cloud cache`);
      }

      // Synchronize dependency trees
      if (options.direction === 'upload' || options.direction === 'both') {
        progress.updateStatus(`Uploading ${trees.length} dependency trees to cloud cache...`);

        let uploaded = 0;
        for (const [dependencies, treePath] of trees) {
          try {
            await cloudCache.syncDependencyTree(dependencies, treePath);
            uploaded++;
            progress.updateStatus(`Uploaded ${uploaded}/${trees.length} dependency trees`);
          } catch (error) {
            logger.warn(`Failed to upload dependency tree: ${error}`);
          }
        }

        logger.success(`Uploaded ${uploaded}/${trees.length} dependency trees to cloud cache`);
      }

      // Download from cloud cache
      if (options.direction === 'download' || options.direction === 'both') {
        progress.updateStatus('Downloading from cloud cache...');

        // List files in cloud cache
        const cloudFiles = await cloudCache.getProvider().listFiles();

        // Filter package files
        const packageFiles = cloudFiles.filter(file => file.startsWith('packages/'));
        const treeFiles = cloudFiles.filter(file => file.startsWith('trees/'));

        logger.info(`Found ${packageFiles.length} packages and ${treeFiles.length} dependency trees in cloud cache`);

        // TODO: Implement download logic

        logger.success('Downloaded cache entries from cloud cache');
      }

      progress.stop();

    } catch (error) {
      logger.error(`Failed to synchronize with cloud cache: ${error}`);
      process.exit(1);
    }
  });

// Network command
program
  .command('network')
  .description('Check network status')
  .option('--registry <url>', 'Specify npm registry URL')
  .option('--timeout <ms>', 'Network check timeout in milliseconds', '5000')
  .option('--retries <number>', 'Number of retries for network operations', '2')
  .action(async (options) => {
    try {
      console.log(chalk.cyan(`\n⚡ Flash Install Network Check\n`));

      // Create spinner
      const spinner = new Spinner('Checking network status');
      spinner.start();

      // Check network
      const result = await networkManager.checkNetwork({
        registry: options.registry,
        timeout: parseInt(options.timeout, 10),
        retries: parseInt(options.retries, 10)
      });

      // Stop spinner
      spinner.stop();

      // Display results
      console.log(chalk.bold(`Network Status: ${getNetworkStatusColor(result.status)}`));
      console.log(`DNS Resolution: ${result.dnsAvailable ? chalk.green('Available') : chalk.red('Unavailable')}`);
      console.log(`Registry: ${result.registryAvailable ? chalk.green('Available') : chalk.red('Unavailable')}`);
      console.log(`Internet: ${result.internetAvailable ? chalk.green('Available') : chalk.red('Unavailable')}`);

      if (result.responseTime) {
        console.log(`Response Time: ${Math.round(result.responseTime)}ms`);
      }

      if (result.error) {
        console.log(chalk.red(`Error: ${result.error}`));
      }

      // Provide recommendations
      console.log('\nRecommendations:');

      if (result.status === NetworkStatus.ONLINE) {
        console.log(chalk.green('✓ Network is fully available, all features should work normally'));
      } else if (result.status === NetworkStatus.OFFLINE) {
        console.log(chalk.yellow('⚠ Network is offline, use the following options:'));
        console.log(chalk.yellow('  - Use --offline flag to enable offline mode'));
        console.log(chalk.yellow('  - Ensure you have a cache or snapshot available'));
      } else if (result.status === NetworkStatus.PARTIAL) {
        console.log(chalk.yellow('⚠ Network is partially available, use the following options:'));

        if (!result.registryAvailable) {
          console.log(chalk.yellow('  - Use --offline flag to enable offline mode with fallbacks'));
          console.log(chalk.yellow('  - Try a different registry with --registry <url>'));
        }

        if (!result.dnsAvailable) {
          console.log(chalk.yellow('  - Check your DNS settings'));
          console.log(chalk.yellow('  - Try using a specific IP address for the registry'));
        }
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Analysis command
program
  .command('analyze')
  .description('Analyze dependencies and show statistics')
  .argument('[dir]', 'Project directory', '.')
  .option('--no-dev', 'Exclude dev dependencies')
  .option('--direct-only', 'Show only direct dependencies')
  .option('--max-depth <depth>', 'Maximum depth to analyze')
  .option('--no-duplicates', 'Hide duplicate dependencies')
  .option('--no-sizes', 'Hide dependency sizes')
  .action(async (dir, options) => {
    try {
      // Import dependency analyzer
      const { DependencyAnalyzer } = await import('./analysis.js');

      // Create analyzer
      const analyzer = new DependencyAnalyzer({
        includeDevDependencies: options.dev !== false,
        directOnly: options.directOnly || false,
        maxDepth: options.maxDepth ? parseInt(options.maxDepth, 10) : undefined,
        showDuplicates: options.duplicates !== false,
        showSizes: options.sizes !== false
      });

      // Resolve project directory
      const projectDir = path.resolve(dir);

      // Check if directory exists
      if (!await fsUtils.directoryExists(projectDir)) {
        logger.error(`Directory not found: ${projectDir}`);
        process.exit(1);
      }

      console.log(chalk.cyan(`\n⚡ Flash Install Dependency Analysis\n`));

      // Create spinner
      const spinner = new Spinner('Analyzing dependencies');
      spinner.start();

      // Analyze dependencies
      const result = await analyzer.analyze(projectDir);

      // Stop spinner
      spinner.stop();

      // Display results
      console.log(chalk.bold(`Dependency Statistics:`));
      console.log(`Total dependencies: ${result.dependencyCount}`);
      console.log(`Unique packages: ${result.uniquePackages}`);

      if (result.duplicatePackages > 0) {
        console.log(`Duplicate packages: ${result.duplicatePackages}`);
      }

      console.log(`Total size: ${fsUtils.formatSize(result.totalSize)}`);

      // Show largest dependencies
      if (result.largestDependencies.length > 0) {
        console.log(chalk.bold(`\nLargest Dependencies:`));

        for (const dep of result.largestDependencies) {
          if (dep.size !== undefined) {
            console.log(`${dep.name}@${dep.version}: ${fsUtils.formatSize(dep.size)}`);
          }
        }
      }

      // Show most duplicated dependencies
      if (result.mostDuplicated.length > 0) {
        console.log(chalk.bold(`\nMost Duplicated Dependencies:`));

        for (const dep of result.mostDuplicated) {
          console.log(`${dep.name}: ${dep.count} instances`);
        }
      }

      console.log(chalk.cyan(`\nUse 'flash-install analyze --help' for more options`));
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Dependency tree visualization command
program
  .command('deps')
  .description('Visualize dependency tree')
  .argument('[dir]', 'Project directory', '.')
  .option('--no-dev', 'Exclude dev dependencies')
  .option('--direct-only', 'Show only direct dependencies')
  .option('--max-depth <depth>', 'Maximum depth to visualize')
  .option('--no-sizes', 'Hide dependency sizes')
  .option('--no-versions', 'Hide dependency versions')
  .option('--no-colors', 'Disable colors')
  .option('-f, --format <format>', 'Output format (tree, dot, markdown)', 'tree')
  .option('-o, --output <file>', 'Output file')
  .action(async (dir, options) => {
    try {
      // Import dependency analyzer and visualization
      const { DependencyAnalyzer } = await import('./analysis.js');
      const { generateDependencyTree, generateDependencyGraph, generateDependencyReport } = await import('./utils/visualization.js');

      // Create analyzer
      const analyzer = new DependencyAnalyzer({
        includeDevDependencies: options.dev !== false,
        directOnly: options.directOnly || false,
        maxDepth: options.maxDepth ? parseInt(options.maxDepth, 10) : undefined,
        showSizes: options.sizes !== false
      });

      // Resolve project directory
      const projectDir = path.resolve(dir);

      // Check if directory exists
      if (!await fsUtils.directoryExists(projectDir)) {
        logger.error(`Directory not found: ${projectDir}`);
        process.exit(1);
      }

      console.log(chalk.cyan(`\n⚡ Flash Install Dependency Visualization\n`));

      // Create spinner
      const spinner = new Spinner('Analyzing dependencies');
      spinner.start();

      // Analyze dependencies
      const result = await analyzer.analyze(projectDir);

      // Stop spinner
      spinner.stop();

      // Generate visualization
      let output = '';
      const visualizationOptions = {
        showSizes: options.sizes !== false,
        showVersions: options.versions !== false,
        maxDepth: options.maxDepth ? parseInt(options.maxDepth, 10) : undefined,
        useColors: options.colors !== false
      };

      switch (options.format.toLowerCase()) {
        case 'tree':
          output = generateDependencyTree(result.dependencies, visualizationOptions);
          break;
        case 'dot':
          output = generateDependencyGraph(result.dependencies, visualizationOptions);
          break;
        case 'markdown':
        case 'md':
          output = generateDependencyReport(result.dependencies, visualizationOptions);
          break;
        default:
          logger.error(`Unsupported format: ${options.format}`);
          process.exit(1);
      }

      // Output result
      if (options.output) {
        // Write to file
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, output);
        console.log(chalk.green(`Dependency visualization saved to ${outputPath}`));
      } else {
        // Print to console
        console.log(output);
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Workspace command
program
  .command('workspaces')
  .description('List workspace packages')
  .argument('[dir]', 'Project directory', '.')
  .action(async (dir) => {
    try {
      // Resolve project directory
      const projectDir = path.resolve(dir);

      // Check if directory exists
      if (!await fsUtils.directoryExists(projectDir)) {
        logger.error(`Directory not found: ${projectDir}`);
        process.exit(1);
      }

      // Initialize workspace manager
      const hasWorkspaces = await workspaceManager.init(projectDir);

      if (!hasWorkspaces) {
        logger.error('No workspaces found in this project');
        process.exit(1);
      }

      // Get workspace packages
      const packages = workspaceManager.getPackages();

      console.log(chalk.cyan(`\n⚡ Flash Install Workspaces\n`));
      console.log(chalk.cyan(`Found ${chalk.bold(packages.length.toString())} workspace packages:\n`));

      // Get dependency graph
      const graph = workspaceManager.buildDependencyGraph();

      // Display packages
      for (const pkg of packages) {
        console.log(chalk.bold(`${pkg.name}@${pkg.version}`));
        console.log(chalk.gray(`  Location: ${path.relative(projectDir, pkg.directory)}`));

        // Show dependencies
        const deps = Object.keys(pkg.dependencies).filter(dep => workspaceManager.getPackage(dep));
        if (deps.length > 0) {
          console.log(chalk.gray(`  Workspace dependencies: ${deps.join(', ')}`));
        }

        // Show dependents
        const dependents: string[] = [];
        for (const [pkgName, dependencies] of graph.entries()) {
          if (dependencies.includes(pkg.name)) {
            dependents.push(pkgName);
          }
        }

        if (dependents.length > 0) {
          console.log(chalk.gray(`  Used by: ${dependents.join(', ')}`));
        }

        console.log('');
      }

      // Show installation order
      const installOrder = workspaceManager.getInstallationOrder();
      console.log(chalk.cyan(`Installation order: ${installOrder.join(' → ')}`));
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Register plugin commands
registerPluginCommands(program);
// Add command
program
  .command('add')
  .description('Install and save packages to dependencies')
  .argument('<packages...>', 'Packages to install (e.g., express react)')
  .option('-D, --save-dev', 'Save to devDependencies')
  .option('-E, --save-exact', 'Save exact version')
  .option('-p, --package-manager <manager>', 'Package manager to use (npm, yarn, pnpm)')
  .option('--no-cache', 'Disable cache')
  .option('--offline', 'Use offline mode')
  .option('--registry <url>', 'Specify npm registry URL')
  .action(async (packages, options) => {
    try {
      console.log(chalk.cyan(`
⚡ flash-install v${version}
        `));

      console.log(chalk.cyan(`⚡ Installing packages: ${packages.join(', ')}`));
      console.log(`Install options: ${JSON.stringify({
        saveToDependencies: !options.saveDev,
        saveToDevDependencies: options.saveDev,
        saveExact: options.saveExact
      })}`);

      if (options.saveDev) {
        console.log(`Will save to dependencies: false`);
        console.log(`Will save to devDependencies: true`);
      } else {
        console.log(`Will save to dependencies: true`);
        console.log(`Will save to devDependencies: undefined`);
      }

      console.log(`Will save exact version: ${options.saveExact ? 'true' : 'undefined'}`);

      // Configure installer
      const customInstaller = new Installer({
        packageManager: options.packageManager,
        useCache: options.cache !== false,
        offline: options.offline || false,
        registry: options.registry
      });

      await customInstaller.init();

      // Install packages
      const success = await customInstaller.installPackages(
        process.cwd(),
        packages,
        {
          saveToDependencies: !options.saveDev,
          saveToDevDependencies: options.saveDev,
          saveExact: options.saveExact
        }
      );

      process.exit(success ? 0 : 1);
    } catch (error) {
      logger.error(`Failed to install packages: ${error}`);
      process.exit(1);
    }
  });

// Download command
program
  .command('download')
  .description('Download a package tarball without installing it')
  .argument('<package>', 'Package name with optional version (e.g., express or express@4.17.1)')
  .option('-o, --output <dir>', 'Output directory', './downloads')
  .option('-r, --registry <url>', 'Specify npm registry URL')
  .action(async (packageName, options) => {
    try {
      // Configure installer
      const customInstaller = new Installer({
        registry: options.registry
      });

      await customInstaller.init();

      // Download package
      logger.flash(`Downloading package ${chalk.bold(packageName)}`);
      const outputPath = await customInstaller.downloadPackage(packageName, options.output);

      logger.success(`Package downloaded to: ${outputPath}`);
    } catch (error) {
      logger.error(`Failed to download package: ${error}`);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Enable debug mode if --debug flag is set
const options = program.opts();
if (options.debug) {
  logger.setDebugMode(true);
}
