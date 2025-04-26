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
  packageManager: PackageManager,
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
    
    // Process each package
    console.log(chalk.cyan(`→ Installing ${packages.length} packages...`));
    
    // Track progress
    let installed = 0;
    const packageVersions: Record<string, string> = {};
    
    // Create progress indicator
    const progress = new ProgressIndicator(packages.length, 'Installing packages');
    
    for (const pkg of packages) {
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
      
      // Update progress text - use the correct method
      progress.update(installed, `Installing ${name}@${version}`);
      
      // Resolve the actual version from npm
      const resolvedVersion = await resolvePackageVersion(name, version);
      packageVersions[name] = resolvedVersion;
      
      const packageNodeModulesPath = path.join(nodeModulesPath, name);
      
      // Check if package is in cache
      if (await cache.hasPackage(name, resolvedVersion)) {
        await cache.restorePackage(name, resolvedVersion, packageNodeModulesPath);
        installed++;
        continue;
      }
      
      // Direct download from npm registry
      const registryUrl = options.registry || 
        execSync('npm config get registry', { encoding: 'utf8' }).trim().replace(/\/$/, '') || 
        'https://registry.npmjs.org';
      
      const packageUrl = `${registryUrl}/${encodeURIComponent(name)}/-/${name}-${resolvedVersion}.tgz`;
      
      try {
        // Create temp directory
        const tempDir = path.join(os.tmpdir(), `flash-install-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
        await fsUtils.ensureDir(tempDir);
        
        // Download and extract package
        const tarballPath = path.join(tempDir, 'package.tgz');
        
        // Download using curl
        execSync(`curl -s -L -o "${tarballPath}" "${packageUrl}"`, { stdio: 'ignore' });
        
        // Extract tarball
        await fsUtils.ensureDir(packageNodeModulesPath);
        execSync(`tar -xzf "${tarballPath}" -C "${packageNodeModulesPath}" --strip-components=1`, { stdio: 'ignore' });
        
        // Clean up
        await fsUtils.remove(tempDir);
        
        // Add to cache
        await cache.addPackage(name, resolvedVersion, packageNodeModulesPath);
        installed++;
      } catch (directError) {
        // Fall back to package manager if direct download fails
        const cmd = {
          [PackageManager.NPM]: `npm install ${name}@${version} --no-save`,
          [PackageManager.YARN]: `yarn add ${name}@${version} --no-save`,
          [PackageManager.PNPM]: `pnpm add ${name}@${version} --no-save`
        }[packageManager];
        
        execSync(cmd, { cwd: projectDir, stdio: 'ignore' });
        
        // Add to cache
        await cache.addPackage(name, resolvedVersion, packageNodeModulesPath);
        installed++;
      }
    }
    
    // Update package.json if needed
    if (options.saveToDependencies || options.saveToDevDependencies) {
      await updatePackageJson(projectDir, packageVersions, options);
    }
    
    // Complete progress - don't pass arguments if not supported
    progress.complete();
    
    // Log completion separately
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
