import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { ProgressIndicator } from './utils/progress.js';
import * as fsUtils from './utils/fs.js';
import { cache } from './cache.js';
import { PackageManager } from './install.js';

/**
 * Package installation options
 */
export interface PackageInstallOptions {
  saveToDependencies?: boolean;
  saveToDevDependencies?: boolean;
  saveExact?: boolean;
  registry?: string;
}

/**
 * Install specific packages
 * @param projectDir Project directory
 * @param packages Array of package names with optional versions
 * @param options Installation options
 * @returns True if successful
 */
export async function installPackages(
  projectDir: string,
  packages: string[],
  packageManager: PackageManager = PackageManager.NPM,
  options: PackageInstallOptions = {}
): Promise<boolean> {
  try {
    // Log options for debugging
    console.log('Install options:', JSON.stringify(options));
    console.log('Will save to dependencies:', options.saveToDependencies);
    console.log('Will save to devDependencies:', options.saveToDevDependencies);
    console.log('Will save exact version:', options.saveExact);

    // Start timer
    const startTime = Date.now();

    // Create node_modules directory if it doesn't exist
    const nodeModulesPath = path.join(projectDir, 'node_modules');
    await fsUtils.ensureDir(nodeModulesPath);

    // Filter out invalid packages
    const validPackages = packages.filter(pkg => {
      // Skip packages with invalid names or paths
      if (pkg.includes('/node_modules/') || pkg.includes('undefined')) {
        console.log(chalk.yellow(`⚠ Skipping invalid package: ${pkg}`));
        return false;
      }
      return true;
    });

    // If no valid packages, return early
    if (validPackages.length === 0) {
      console.log(chalk.yellow('No valid packages to install'));
      return true;
    }

    // Process each package
    console.log(chalk.cyan(`→ Installing ${validPackages.length} packages...`));

    // Track progress
    let installed = 0;
    const packageVersions: Record<string, string> = {};

    // Create progress indicator
    const progress = new ProgressIndicator(validPackages.length, 'Installing packages');

    // Use npm directly for more reliable installation
    try {
      // Determine the appropriate command based on package manager
      let cmd: string;
      let saveFlag = '';

      if (options.saveToDependencies) {
        saveFlag = '--save';
      } else if (options.saveToDevDependencies) {
        saveFlag = '--save-dev';
      } else {
        saveFlag = '--no-save';
      }

      if (options.saveExact) {
        saveFlag += ' --save-exact';
      }

      switch (packageManager) {
        case PackageManager.NPM:
          cmd = `npm install ${validPackages.join(' ')} ${saveFlag}`;
          break;
        case PackageManager.YARN:
          cmd = `yarn add ${validPackages.join(' ')} ${saveFlag.replace('--save', '').replace('--save-dev', '--dev')}`;
          break;
        case PackageManager.PNPM:
          cmd = `pnpm add ${validPackages.join(' ')} ${saveFlag}`;
          break;
        case PackageManager.BUN:
          // Bun uses different flags
          cmd = `bun add ${validPackages.join(' ')} ${saveFlag.replace('--save', '').replace('--save-dev', '--dev').replace('--save-exact', '--exact')}`;
          break;
        default:
          cmd = `npm install ${validPackages.join(' ')} ${saveFlag}`;
      }

      // Add registry option with the appropriate flag for each package manager
      if (options.registry) {
        switch (packageManager) {
          case PackageManager.NPM:
            cmd += ` --registry=${options.registry}`;
            break;
          case PackageManager.YARN:
            cmd += ` --registry ${options.registry}`;
            break;
          case PackageManager.PNPM:
            cmd += ` --registry=${options.registry}`;
            break;
          case PackageManager.BUN:
            cmd += ` --registry=${options.registry}`;
            break;
          default:
            cmd += ` --registry=${options.registry}`;
        }
      }

      console.log(`Executing: ${cmd}`);

      // Execute the command
      execSync(cmd, {
        cwd: projectDir,
        stdio: 'inherit' // Show output for better debugging
      });

      // Update progress
      installed = validPackages.length;
      progress.update(installed, 'Installation complete');

      // For each package, try to add it to the cache
      for (const pkg of validPackages) {
        try {
          // Parse package name and version
          let name = pkg;
          let version = 'latest';

          if (pkg.includes('@') && !pkg.startsWith('@')) {
            [name, version] = pkg.split('@');
          } else if (pkg.startsWith('@')) {
            // Handle scoped packages
            const parts = pkg.split('@');
            if (parts.length > 2) {
              name = `@${parts[1]}`;
              version = parts[2];
            } else {
              name = pkg;
            }
          }

          // Get the installed version from node_modules
          const packageJsonPath = path.join(nodeModulesPath, name, 'package.json');
          if (await fsUtils.fileExists(packageJsonPath)) {
            const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));
            const installedVersion = packageJson.version;
            packageVersions[name] = installedVersion;

            // Add to cache
            const packageNodeModulesPath = path.join(nodeModulesPath, name);
            await cache.addPackage(name, installedVersion, packageNodeModulesPath);
          }
        } catch (cacheError) {
          console.log(chalk.yellow(`⚠ Failed to cache package ${pkg}: ${cacheError}`));
          // Continue with next package
        }
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error installing packages: ${error instanceof Error ? error.message : String(error)}`));
      return false;
    }

    // Complete progress
    progress.complete();

    // Log completion
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(chalk.green(`✓ Installed ${installed} packages in ${elapsedTime}s`));

    return true;
  } catch (error) {
    console.error(chalk.red(`✗ Error installing packages: ${error instanceof Error ? error.message : String(error)}`));
    return false;
  }
}

/**
 * Resolve package version from npm registry
 */
async function resolvePackageVersion(name: string, version: string): Promise<string> {
  if (version !== 'latest' && !version.startsWith('^') && !version.startsWith('~')) {
    return version; // Exact version specified
  }

  try {
    // Use npm to get the latest version
    const cmd = `npm view ${name}@${version} version --json`;
    const result = execSync(cmd, { encoding: 'utf8' }).trim();
    return JSON.parse(result);
  } catch (error) {
    console.error(`Error resolving version for ${name}@${version}: ${error}`);
    return version; // Fall back to specified version
  }
}

/**
 * Update package.json with new dependencies
 */
async function updatePackageJson(
  projectDir: string,
  packages: Record<string, string>,
  options: PackageInstallOptions
): Promise<void> {
  const packageJsonPath = path.join(projectDir, 'package.json');

  if (!await fsUtils.fileExists(packageJsonPath)) {
    console.warn(chalk.yellow(`No package.json found in ${projectDir}`));
    return;
  }

  try {
    const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));

    if (options.saveToDependencies) {
      packageJson.dependencies = packageJson.dependencies || {};

      for (const [name, version] of Object.entries(packages)) {
        packageJson.dependencies[name] = options.saveExact ? version : `^${version}`;
      }
    }

    if (options.saveToDevDependencies) {
      packageJson.devDependencies = packageJson.devDependencies || {};

      for (const [name, version] of Object.entries(packages)) {
        packageJson.devDependencies[name] = options.saveExact ? version : `^${version}`;
      }
    }

    // Write updated package.json
    await fs.promises.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n',
      'utf8'
    );
  } catch (error) {
    console.error(`Error updating package.json: ${error}`);
  }
}

/**
 * Download a package tarball
 */
export async function downloadPackage(
  packageName: string,
  outputDir: string,
  options: { registry?: string } = {}
): Promise<string> {
  try {
    // Parse package name and version
    let name = packageName;
    let version = 'latest';

    if (packageName.includes('@') && !packageName.startsWith('@')) {
      [name, version] = packageName.split('@');
    } else if (packageName.startsWith('@')) {
      // Handle scoped packages
      const parts = packageName.split('@');
      if (parts.length > 2) {
        name = `@${parts[1]}`;
        version = parts[2];
      }
    }

    // Resolve the actual version
    const resolvedVersion = await resolvePackageVersion(name, version);

    // Get registry URL
    const registryUrl = options.registry ||
      execSync('npm config get registry', { encoding: 'utf8' }).trim().replace(/\/$/, '') ||
      'https://registry.npmjs.org';

    // Create output directory if it doesn't exist
    await fsUtils.ensureDir(outputDir);

    const packageUrl = `${registryUrl}/${encodeURIComponent(name)}/-/${name}-${resolvedVersion}.tgz`;
    const outputPath = path.join(outputDir, `${name}-${resolvedVersion}.tgz`);

    // Download package tarball
    console.log(`Downloading ${name}@${resolvedVersion}...`);
    execSync(`curl -s -L -o "${outputPath}" "${packageUrl}"`, { stdio: 'ignore' });

    return outputPath;
  } catch (error) {
    console.error(`Failed to download package ${packageName}: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
