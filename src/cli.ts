#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { logger, LogLevel } from './utils/logger.js';
import { installer, PackageManager, InstallOptions, Installer } from './install.js';
import { snapshot, SnapshotFormat, Snapshot } from './snapshot.js';
import { cache } from './cache.js';
import * as fsUtils from './utils/fs.js';
import { sync, Sync } from './sync.js';
import { pluginManager } from './plugin.js';

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
  .version(version);

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
  .action(async (packages, options) => {
    try {
      const projectDir = process.cwd();
      
      // If specific packages are provided, install them
      if (packages && packages.length > 0) {
        console.log(chalk.cyan(`
⚡ flash-install v${version}
        `));
        
        console.log(chalk.cyan(`⚡ Installing packages: ${packages.join(', ')}`));
        
        const installer = new Installer({
          concurrency: options.concurrency,
          packageManager: options.packageManager,
          includeDevDependencies: options.dev !== false,
          useCache: options.cache !== false,
          offline: options.offline || false,
          registry: options.registry
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
        // Original code for installing all dependencies
        // ...
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
      const pkg = await installer.parsePackageJson(projectDir);
      const packageManager = installer.detectPackageManager(projectDir);
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

// Cache info command
program
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

// Plugin commands
const pluginCommand = program
  .command('plugin')
  .description('Manage plugins');

pluginCommand
  .command('add')
  .description('Add a plugin')
  .argument('<path>', 'Path to plugin')
  .action(async (pluginPath) => {
    await pluginManager.init();
    const success = await pluginManager.addPlugin(path.resolve(pluginPath));

    if (!success) {
      process.exit(1);
    }
  });

pluginCommand
  .command('remove')
  .description('Remove a plugin')
  .argument('<name>', 'Plugin name')
  .action(async (pluginName) => {
    await pluginManager.init();
    const success = await pluginManager.removePlugin(pluginName);

    if (!success) {
      process.exit(1);
    }
  });

pluginCommand
  .command('list')
  .description('List installed plugins')
  .action(async () => {
    await pluginManager.init();
    const plugins = pluginManager.listPlugins();

    console.log(chalk.cyan('\n⚡ Flash Install Plugins\n'));

    if (plugins.length === 0) {
      console.log('No plugins installed');
    } else {
      for (const plugin of plugins) {
        console.log(`${chalk.bold(plugin.name)} v${plugin.version}`);

        if (plugin.description) {
          console.log(`  ${plugin.description}`);
        }

        if (plugin.author) {
          console.log(`  Author: ${plugin.author}`);
        }

        console.log('');
      }
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
