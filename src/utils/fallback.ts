/**
 * Fallback strategies for partial offline scenarios
 */

import path from 'path';
import fs from 'fs-extra';
import semver from 'semver';
import { logger } from './logger.js';
import { cache } from '../cache.js';
import { snapshot } from '../snapshot.js';
import { hashPackage } from './hash.js';
import { NetworkStatus, networkManager } from './network.js';

/**
 * Fallback result
 */
export interface FallbackResult {
  /** Whether a fallback was found */
  found: boolean;
  /** Fallback source (cache, snapshot, etc.) */
  source?: 'cache' | 'snapshot' | 'local';
  /** Package name */
  name: string;
  /** Package version */
  version: string;
  /** Path to the package */
  path?: string;
  /** Whether the version is exact or a fallback */
  exactVersion: boolean;
  /** Original requested version */
  requestedVersion: string;
}

/**
 * Fallback options
 */
export interface FallbackOptions {
  /** Whether to allow version fallbacks */
  allowVersionFallback?: boolean;
  /** Whether to use cache */
  useCache?: boolean;
  /** Whether to use snapshots */
  useSnapshot?: boolean;
  /** Whether to use local packages */
  useLocal?: boolean;
  /** Project directory */
  projectDir?: string;
  /** Whether to check network availability */
  checkNetwork?: boolean;
}

/**
 * Default fallback options
 */
const defaultOptions: FallbackOptions = {
  allowVersionFallback: true,
  useCache: true,
  useSnapshot: true,
  useLocal: true,
  checkNetwork: true
};

/**
 * Fallback manager for handling offline scenarios
 */
export class FallbackManager {
  private options: FallbackOptions;
  
  /**
   * Create a new fallback manager
   * @param options Fallback options
   */
  constructor(options: FallbackOptions = {}) {
    this.options = { ...defaultOptions, ...options };
  }
  
  /**
   * Find a fallback for a package
   * @param name Package name
   * @param version Package version
   * @param options Fallback options
   * @returns Fallback result
   */
  async findFallback(
    name: string,
    version: string,
    options: FallbackOptions = {}
  ): Promise<FallbackResult> {
    const opts = { ...this.options, ...options };
    
    // Check network availability if needed
    let networkAvailable = true;
    if (opts.checkNetwork) {
      try {
        networkAvailable = await networkManager.isNetworkAvailable();
      } catch (error) {
        logger.debug(`Network check failed: ${error}`);
        networkAvailable = false;
      }
    }
    
    // If network is available, no need for fallback
    if (networkAvailable) {
      return {
        found: false,
        name,
        version,
        exactVersion: true,
        requestedVersion: version
      };
    }
    
    // Try exact version first
    const exactResult = await this.findExactVersion(name, version, opts);
    if (exactResult.found) {
      return exactResult;
    }
    
    // If version fallback is not allowed, return not found
    if (!opts.allowVersionFallback) {
      return {
        found: false,
        name,
        version,
        exactVersion: true,
        requestedVersion: version
      };
    }
    
    // Try to find a compatible version
    return this.findCompatibleVersion(name, version, opts);
  }
  
  /**
   * Find an exact version of a package
   * @param name Package name
   * @param version Package version
   * @param options Fallback options
   * @returns Fallback result
   */
  private async findExactVersion(
    name: string,
    version: string,
    options: FallbackOptions
  ): Promise<FallbackResult> {
    // Try cache first
    if (options.useCache) {
      const inCache = await cache.hasPackage(name, version);
      if (inCache) {
        return {
          found: true,
          source: 'cache',
          name,
          version,
          path: cache.getPackagePath(name, version),
          exactVersion: true,
          requestedVersion: version
        };
      }
    }
    
    // Try snapshot
    if (options.useSnapshot && options.projectDir) {
      const snapshotPath = snapshot.getSnapshotPath(options.projectDir);
      const snapshotExists = await fs.pathExists(snapshotPath);
      
      if (snapshotExists) {
        try {
          const metadata = await snapshot.getMetadata(snapshotPath);
          
          // Check if package is in snapshot
          if (metadata.dependencies && metadata.dependencies[name] === version) {
            return {
              found: true,
              source: 'snapshot',
              name,
              version,
              path: snapshotPath,
              exactVersion: true,
              requestedVersion: version
            };
          }
        } catch (error) {
          logger.debug(`Failed to check snapshot: ${error}`);
        }
      }
    }
    
    // Try local node_modules
    if (options.useLocal && options.projectDir) {
      const nodeModulesPath = path.join(options.projectDir, 'node_modules', name);
      const packageJsonPath = path.join(nodeModulesPath, 'package.json');
      
      if (await fs.pathExists(packageJsonPath)) {
        try {
          const packageJson = await fs.readJson(packageJsonPath);
          
          if (packageJson.version === version) {
            return {
              found: true,
              source: 'local',
              name,
              version,
              path: nodeModulesPath,
              exactVersion: true,
              requestedVersion: version
            };
          }
        } catch (error) {
          logger.debug(`Failed to check local package: ${error}`);
        }
      }
    }
    
    // No exact version found
    return {
      found: false,
      name,
      version,
      exactVersion: true,
      requestedVersion: version
    };
  }
  
  /**
   * Find a compatible version of a package
   * @param name Package name
   * @param version Package version
   * @param options Fallback options
   * @returns Fallback result
   */
  private async findCompatibleVersion(
    name: string,
    version: string,
    options: FallbackOptions
  ): Promise<FallbackResult> {
    // Parse version range
    const range = semver.validRange(version);
    if (!range) {
      return {
        found: false,
        name,
        version,
        exactVersion: false,
        requestedVersion: version
      };
    }
    
    // Get available versions from cache
    const availableVersions: { version: string; path: string; source: 'cache' | 'snapshot' | 'local' }[] = [];
    
    // Check cache
    if (options.useCache) {
      try {
        const cacheStats = await cache.getStats();
        
        // Find packages with matching name
        for (const entry of Object.values(cacheStats.packages || {})) {
          if (entry.name === name) {
            availableVersions.push({
              version: entry.version,
              path: cache.getPackagePath(name, entry.version),
              source: 'cache'
            });
          }
        }
      } catch (error) {
        logger.debug(`Failed to check cache: ${error}`);
      }
    }
    
    // Check snapshot
    if (options.useSnapshot && options.projectDir) {
      const snapshotPath = snapshot.getSnapshotPath(options.projectDir);
      const snapshotExists = await fs.pathExists(snapshotPath);
      
      if (snapshotExists) {
        try {
          const metadata = await snapshot.getMetadata(snapshotPath);
          
          // Check if package is in snapshot
          if (metadata.dependencies) {
            for (const [depName, depVersion] of Object.entries(metadata.dependencies)) {
              if (depName === name) {
                availableVersions.push({
                  version: depVersion as string,
                  path: snapshotPath,
                  source: 'snapshot'
                });
              }
            }
          }
        } catch (error) {
          logger.debug(`Failed to check snapshot: ${error}`);
        }
      }
    }
    
    // Check local node_modules
    if (options.useLocal && options.projectDir) {
      const nodeModulesPath = path.join(options.projectDir, 'node_modules', name);
      const packageJsonPath = path.join(nodeModulesPath, 'package.json');
      
      if (await fs.pathExists(packageJsonPath)) {
        try {
          const packageJson = await fs.readJson(packageJsonPath);
          
          availableVersions.push({
            version: packageJson.version,
            path: nodeModulesPath,
            source: 'local'
          });
        } catch (error) {
          logger.debug(`Failed to check local package: ${error}`);
        }
      }
    }
    
    // Find best matching version
    let bestMatch: { version: string; path: string; source: 'cache' | 'snapshot' | 'local' } | null = null;
    
    for (const available of availableVersions) {
      if (semver.satisfies(available.version, range)) {
        if (!bestMatch || semver.gt(available.version, bestMatch.version)) {
          bestMatch = available;
        }
      }
    }
    
    // Return best match if found
    if (bestMatch) {
      return {
        found: true,
        source: bestMatch.source,
        name,
        version: bestMatch.version,
        path: bestMatch.path,
        exactVersion: false,
        requestedVersion: version
      };
    }
    
    // No compatible version found
    return {
      found: false,
      name,
      version,
      exactVersion: false,
      requestedVersion: version
    };
  }
  
  /**
   * Find fallbacks for multiple packages
   * @param dependencies Record of dependencies
   * @param options Fallback options
   * @returns Record of fallback results
   */
  async findFallbacks(
    dependencies: Record<string, string>,
    options: FallbackOptions = {}
  ): Promise<Record<string, FallbackResult>> {
    const results: Record<string, FallbackResult> = {};
    
    // Process each dependency
    for (const [name, version] of Object.entries(dependencies)) {
      results[name] = await this.findFallback(name, version, options);
    }
    
    return results;
  }
  
  /**
   * Check if all dependencies have fallbacks
   * @param dependencies Record of dependencies
   * @param options Fallback options
   * @returns True if all dependencies have fallbacks
   */
  async hasAllFallbacks(
    dependencies: Record<string, string>,
    options: FallbackOptions = {}
  ): Promise<boolean> {
    const fallbacks = await this.findFallbacks(dependencies, options);
    
    // Check if all dependencies have fallbacks
    for (const result of Object.values(fallbacks)) {
      if (!result.found) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get missing dependencies (those without fallbacks)
   * @param dependencies Record of dependencies
   * @param options Fallback options
   * @returns Record of missing dependencies
   */
  async getMissingDependencies(
    dependencies: Record<string, string>,
    options: FallbackOptions = {}
  ): Promise<Record<string, string>> {
    const fallbacks = await this.findFallbacks(dependencies, options);
    const missing: Record<string, string> = {};
    
    // Find missing dependencies
    for (const [name, version] of Object.entries(dependencies)) {
      if (!fallbacks[name] || !fallbacks[name].found) {
        missing[name] = version;
      }
    }
    
    return missing;
  }
}

// Export singleton instance
export const fallbackManager = new FallbackManager();
