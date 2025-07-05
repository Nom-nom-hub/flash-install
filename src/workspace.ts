/**
 * Workspace management for monorepo support
 */

import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import { logger } from './utils/logger.js';
import * as fsUtils from './utils/fs.js';

/**
 * Workspace package information
 */
export interface WorkspacePackage {
  /** Package name */
  name: string;
  /** Package version */
  version: string;
  /** Package directory */
  directory: string;
  /** Package dependencies */
  dependencies: Record<string, string>;
  /** Package dev dependencies */
  devDependencies: Record<string, string>;
  /** Package peer dependencies */
  peerDependencies: Record<string, string>;
}

/**
 * Workspace configuration
 */
export interface WorkspaceConfig {
  /** Whether workspaces are enabled */
  enabled: boolean;
  /** Workspace package patterns */
  packages: string[];
  /** Whether to hoist dependencies */
  hoistDependencies: boolean;
  /** Whether to install packages in parallel */
  parallelInstall: boolean;
  /** Maximum concurrency for parallel installation */
  maxConcurrency: number;
}

/**
 * Default workspace configuration
 */
const defaultWorkspaceConfig: WorkspaceConfig = {
  enabled: false,
  packages: [],
  hoistDependencies: true,
  parallelInstall: true,
  maxConcurrency: 4
};

/**
 * Workspace manager
 */
export class WorkspaceManager {
  private config: WorkspaceConfig;
  private packages: WorkspacePackage[] = [];
  private rootDir: string = '';

  /**
   * Create a new workspace manager
   * @param config Workspace configuration
   */
  constructor(config: Partial<WorkspaceConfig> = {}) {
    this.config = { ...defaultWorkspaceConfig, ...config };
  }

  /**
   * Initialize the workspace manager
   * @param rootDir Root directory
   */
  async init(rootDir: string): Promise<boolean> {
    this.rootDir = rootDir;

    // Check if workspaces are enabled
    if (!this.config.enabled) {
      // Try to detect workspaces from package.json
      const packageJsonPath = path.join(rootDir, 'package.json');
      if (await fsUtils.fileExists(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

          // Check for workspaces field (npm, yarn)
          if (packageJson.workspaces) {
            this.config.enabled = true;

            // Handle different workspace formats
            if (Array.isArray(packageJson.workspaces)) {
              this.config.packages = packageJson.workspaces;
            } else if (packageJson.workspaces.packages) {
              this.config.packages = packageJson.workspaces.packages;
            }
          }
        } catch (error) {
          logger.debug(`Failed to parse package.json: ${error}`);
          return false;
        }
      }

      // Check for pnpm-workspace.yaml
      const pnpmWorkspacePath = path.join(rootDir, 'pnpm-workspace.yaml');
      if (await fsUtils.fileExists(pnpmWorkspacePath)) {
        try {
          const yaml = await fs.readFile(pnpmWorkspacePath, 'utf8');
          const jsYaml = await import('js-yaml');
          const workspaceData = jsYaml.load(yaml) as any;

          if (workspaceData && workspaceData.packages) {
            this.config.enabled = true;
            this.config.packages = workspaceData.packages;
          }
        } catch (error) {
          logger.debug(`Failed to parse pnpm-workspace.yaml: ${error}`);
        }
      }

      // Check for .flashrc.json
      const flashRcPath = path.join(rootDir, '.flashrc.json');
      if (await fsUtils.fileExists(flashRcPath)) {
        try {
          const flashRc = JSON.parse(await fs.readFile(flashRcPath, 'utf8'));

          if (flashRc.workspaces) {
            this.config.enabled = true;
            this.config.packages = flashRc.workspaces.packages || [];
            this.config.hoistDependencies = flashRc.workspaces.hoistDependencies !== false;
            this.config.parallelInstall = flashRc.workspaces.parallelInstall !== false;
            this.config.maxConcurrency = flashRc.workspaces.maxConcurrency || 4;
          }
        } catch (error) {
          logger.debug(`Failed to parse .flashrc.json: ${error}`);
        }
      }
    }

    // If workspaces are enabled, discover packages
    if (this.config.enabled && this.config.packages.length > 0) {
      await this.discoverPackages();
      return true;
    }

    return false;
  }

  /**
   * Discover workspace packages
   */
  private async discoverPackages(): Promise<void> {
    this.packages = [];

    // Process each workspace pattern
    for (const pattern of this.config.packages) {
      const matches = glob.sync(pattern, { cwd: this.rootDir });

      for (const match of matches) {
        const packageDir = path.join(this.rootDir, match);
        const packageJsonPath = path.join(packageDir, 'package.json');

        if (await fsUtils.fileExists(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

            this.packages.push({
              name: packageJson.name,
              version: packageJson.version,
              directory: packageDir,
              dependencies: packageJson.dependencies || {},
              devDependencies: packageJson.devDependencies || {},
              peerDependencies: packageJson.peerDependencies || {}
            });
          } catch (error) {
            logger.debug(`Failed to parse package.json in ${packageDir}: ${error}`);
          }
        }
      }
    }

    logger.debug(`Discovered ${this.packages.length} workspace packages`);
  }

  /**
   * Get all workspace packages
   * @returns Array of workspace packages
   */
  getPackages(): WorkspacePackage[] {
    return this.packages;
  }

  /**
   * Get a workspace package by name
   * @param name Package name
   * @returns Workspace package or undefined
   */
  getPackage(name: string): WorkspacePackage | undefined {
    return this.packages.find(pkg => pkg.name === name);
  }

  /**
   * Get workspace configuration
   * @returns Workspace configuration
   */
  getConfig(): WorkspaceConfig {
    return this.config;
  }

  /**
   * Check if workspaces are enabled
   * @returns True if workspaces are enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get all dependencies across all workspace packages
   * @param includeDevDependencies Whether to include dev dependencies
   * @returns Record of dependencies and their versions
   */
  getAllDependencies(includeDevDependencies: boolean = true): Record<string, string> {
    const dependencies: Record<string, string> = {};

    // Process each package
    for (const pkg of this.packages) {
      // Add regular dependencies
      for (const [name, version] of Object.entries(pkg.dependencies)) {
        // Skip workspace packages
        if (this.getPackage(name)) {
          continue;
        }

        // Add dependency if not already added or if version is higher
        if (!dependencies[name] || this.compareVersions(version, dependencies[name]) > 0) {
          dependencies[name] = version;
        }
      }

      // Add dev dependencies if requested
      if (includeDevDependencies) {
        for (const [name, version] of Object.entries(pkg.devDependencies)) {
          // Skip workspace packages
          if (this.getPackage(name)) {
            continue;
          }

          // Add dependency if not already added or if version is higher
          if (!dependencies[name] || this.compareVersions(version, dependencies[name]) > 0) {
            dependencies[name] = version;
          }
        }
      }
    }

    return dependencies;
  }

  /**
   * Compare two semver versions
   * @param a First version
   * @param b Second version
   * @returns -1 if a < b, 0 if a = b, 1 if a > b
   */
  private compareVersions(a: string, b: string): number {
    // Remove any leading characters (e.g., ^, ~, >=)
    const cleanA = a.replace(/^[^0-9]*/, '');
    const cleanB = b.replace(/^[^0-9]*/, '');

    const partsA = cleanA.split('.').map(Number);
    const partsB = cleanB.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = i < partsA.length ? partsA[i] : 0;
      const partB = i < partsB.length ? partsB[i] : 0;

      if (partA > partB) return 1;
      if (partA < partB) return -1;
    }

    return 0;
  }

  /**
   * Build a dependency graph for workspace packages
   * @returns Dependency graph
   */
  buildDependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    // Add each package to the graph
    for (const pkg of this.packages) {
      const dependencies: string[] = [];

      // Check dependencies
      for (const depName of Object.keys(pkg.dependencies)) {
        const depPkg = this.getPackage(depName);
        if (depPkg) {
          dependencies.push(depName);
        }
      }

      // Check dev dependencies
      for (const depName of Object.keys(pkg.devDependencies)) {
        const depPkg = this.getPackage(depName);
        if (depPkg && !dependencies.includes(depName)) {
          dependencies.push(depName);
        }
      }

      graph.set(pkg.name, dependencies);
    }

    return graph;
  }

  /**
   * Get installation order for workspace packages
   * @returns Array of package names in installation order
   */
  getInstallationOrder(): string[] {
    const graph = this.buildDependencyGraph();
    const visited = new Set<string>();
    const order: string[] = [];

    // Depth-first search to find installation order
    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const dependencies = graph.get(name) || [];
      for (const dep of dependencies) {
        visit(dep);
      }

      order.push(name);
    };

    // Visit each package
    for (const pkg of this.packages) {
      visit(pkg.name);
    }

    return order;
  }
}

// Export singleton instance
export const workspaceManager = new WorkspaceManager();
