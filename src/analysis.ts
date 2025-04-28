/**
 * Dependency analysis tools
 */

import path from 'path';
import fs from 'fs-extra';
import { logger } from './utils/logger.js';
import { installer, PackageManager } from './install.js';
import * as fsUtils from './utils/fs.js';

/**
 * Analysis options
 */
export interface AnalysisOptions {
  /** Include dev dependencies */
  includeDevDependencies: boolean;
  /** Maximum depth to analyze */
  maxDepth?: number;
  /** Show only direct dependencies */
  directOnly?: boolean;
  /** Show duplicate dependencies */
  showDuplicates?: boolean;
  /** Show dependency sizes */
  showSizes?: boolean;
}

/**
 * Default analysis options
 */
const defaultOptions: AnalysisOptions = {
  includeDevDependencies: true,
  maxDepth: undefined,
  directOnly: false,
  showDuplicates: true,
  showSizes: true
};

/**
 * Dependency information
 */
export interface DependencyInfo {
  /** Package name */
  name: string;
  /** Package version */
  version: string;
  /** Package size in bytes */
  size?: number;
  /** Dependencies of this package */
  dependencies?: Record<string, DependencyInfo>;
  /** Whether this is a duplicate */
  duplicate?: boolean;
  /** Dependency depth */
  depth: number;
  /** Whether this is a dev dependency */
  dev?: boolean;
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  /** Root dependencies */
  dependencies: Record<string, DependencyInfo>;
  /** Total size in bytes */
  totalSize: number;
  /** Number of dependencies */
  dependencyCount: number;
  /** Number of unique packages */
  uniquePackages: number;
  /** Number of duplicate packages */
  duplicatePackages: number;
  /** Largest dependencies */
  largestDependencies: DependencyInfo[];
  /** Most duplicated dependencies */
  mostDuplicated: {name: string, count: number}[];
}

/**
 * Dependency analyzer
 */
export class DependencyAnalyzer {
  private options: AnalysisOptions;
  
  /**
   * Create a new dependency analyzer
   * @param options Analysis options
   */
  constructor(options: Partial<AnalysisOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }
  
  /**
   * Analyze dependencies in a project
   * @param projectDir Project directory
   * @returns Analysis result
   */
  async analyze(projectDir: string): Promise<AnalysisResult> {
    try {
      // Resolve project directory
      const resolvedDir = path.resolve(projectDir);
      
      // Check if directory exists
      if (!await fsUtils.directoryExists(resolvedDir)) {
        throw new Error(`Directory not found: ${resolvedDir}`);
      }
      
      // Check if package.json exists
      const packageJsonPath = path.join(resolvedDir, 'package.json');
      if (!await fsUtils.fileExists(packageJsonPath)) {
        throw new Error(`package.json not found in ${resolvedDir}`);
      }
      
      // Parse package.json
      const pkg = await installer.parsePackageJson(resolvedDir);
      
      // Detect package manager
      const packageManager = installer.detectPackageManager(resolvedDir);
      
      // Parse lockfile
      const dependencies = await installer.parseLockfile(resolvedDir, packageManager);
      
      // Build dependency tree
      const dependencyTree = await this.buildDependencyTree(
        resolvedDir,
        dependencies,
        pkg,
        packageManager
      );
      
      // Calculate statistics
      const stats = this.calculateStatistics(dependencyTree);
      
      return {
        dependencies: dependencyTree,
        ...stats
      };
    } catch (error) {
      logger.error(`Failed to analyze dependencies: ${error}`);
      throw error;
    }
  }
  
  /**
   * Build dependency tree
   * @param projectDir Project directory
   * @param dependencies Flat dependencies
   * @param pkg Package.json content
   * @param packageManager Package manager
   * @returns Dependency tree
   */
  private async buildDependencyTree(
    projectDir: string,
    dependencies: Record<string, string>,
    pkg: any,
    packageManager: PackageManager
  ): Promise<Record<string, DependencyInfo>> {
    // This is a placeholder implementation
    // In a real implementation, we would parse the lockfile to build the tree
    const tree: Record<string, DependencyInfo> = {};
    const nodeModulesPath = path.join(projectDir, 'node_modules');
    
    // Process direct dependencies
    const directDeps = { ...pkg.dependencies };
    if (this.options.includeDevDependencies && pkg.devDependencies) {
      Object.entries(pkg.devDependencies).forEach(([name, version]) => {
        directDeps[name] = version;
        // Mark as dev dependency
      });
    }
    
    // Build tree for direct dependencies
    for (const [name, version] of Object.entries(directDeps)) {
      const depPath = path.join(nodeModulesPath, name);
      const depInfo: DependencyInfo = {
        name,
        version: dependencies[name] || String(version),
        depth: 0
      };
      
      // Get size if needed
      if (this.options.showSizes && await fsUtils.directoryExists(depPath)) {
        depInfo.size = await fsUtils.getSize(depPath);
      }
      
      // Add to tree
      tree[name] = depInfo;
    }
    
    return tree;
  }
  
  /**
   * Calculate statistics from dependency tree
   * @param tree Dependency tree
   * @returns Statistics
   */
  private calculateStatistics(tree: Record<string, DependencyInfo>): Omit<AnalysisResult, 'dependencies'> {
    // Count dependencies
    const dependencyCount = Object.keys(tree).length;
    
    // Calculate total size
    const totalSize = Object.values(tree).reduce((sum, dep) => sum + (dep.size || 0), 0);
    
    // Find duplicates (placeholder implementation)
    const uniquePackages = dependencyCount;
    const duplicatePackages = 0;
    
    // Find largest dependencies
    const largestDependencies = Object.values(tree)
      .filter(dep => dep.size !== undefined)
      .sort((a, b) => (b.size || 0) - (a.size || 0))
      .slice(0, 10);
    
    // Find most duplicated (placeholder implementation)
    const mostDuplicated: {name: string, count: number}[] = [];
    
    return {
      totalSize,
      dependencyCount,
      uniquePackages,
      duplicatePackages,
      largestDependencies,
      mostDuplicated
    };
  }
}

// Export singleton instance
export const dependencyAnalyzer = new DependencyAnalyzer();
