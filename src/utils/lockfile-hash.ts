/**
 * Utilities for handling lockfile hashing and change detection
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as lockfile from '@yarnpkg/lockfile';
import * as fsUtils from './fs.js';
import { logger } from './logger.js';

/**
 * Lockfile types
 */
export enum LockfileType {
  NPM = 'package-lock.json',
  YARN = 'yarn.lock',
  PNPM = 'pnpm-lock.yaml'
}

/**
 * Get the hash of a lockfile
 * @param projectDir Project directory
 * @param lockfileType Lockfile type
 * @returns Hash of the lockfile or null if not found
 */
export async function getLockfileHash(
  projectDir: string,
  lockfileType: LockfileType = LockfileType.NPM
): Promise<string | null> {
  try {
    const lockfilePath = path.join(projectDir, lockfileType);

    // Check if lockfile exists
    if (!await fsUtils.fileExists(lockfilePath)) {
      logger.debug(`Lockfile not found: ${lockfilePath}`);
      return null;
    }

    // Read lockfile content
    const content = await fs.promises.readFile(lockfilePath, 'utf8');

    // Create hash
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    return hash;
  } catch (error) {
    logger.error(`Failed to get lockfile hash: ${error}`);
    return null;
  }
}

/**
 * Detect the lockfile type in a project
 * @param projectDir Project directory
 * @returns Detected lockfile type or null if not found
 */
export async function detectLockfileType(projectDir: string): Promise<LockfileType | null> {
  // Check for package-lock.json (NPM)
  if (await fsUtils.fileExists(path.join(projectDir, LockfileType.NPM))) {
    return LockfileType.NPM;
  }

  // Check for yarn.lock (Yarn)
  if (await fsUtils.fileExists(path.join(projectDir, LockfileType.YARN))) {
    return LockfileType.YARN;
  }

  // Check for pnpm-lock.yaml (PNPM)
  if (await fsUtils.fileExists(path.join(projectDir, LockfileType.PNPM))) {
    return LockfileType.PNPM;
  }

  return null;
}

/**
 * Parse dependencies from a lockfile
 * @param projectDir Project directory
 * @param lockfileType Lockfile type
 * @returns Dependencies object or null if parsing failed
 */
export async function parseLockfileDependencies(
  projectDir: string,
  lockfileType: LockfileType | null = null
): Promise<Record<string, string> | null> {
  try {
    // Detect lockfile type if not provided
    const type = lockfileType || await detectLockfileType(projectDir);

    if (!type) {
      logger.warn('No lockfile found in project directory');
      return null;
    }

    const lockfilePath = path.join(projectDir, type);

    // Read lockfile content
    const content = await fs.promises.readFile(lockfilePath, 'utf8');

    // Parse lockfile based on type
    switch (type) {
      case LockfileType.NPM:
        return parseNpmLockfile(content);
      case LockfileType.YARN:
        return parseYarnLockfile(content);
      case LockfileType.PNPM:
        return parsePnpmLockfile(content);
      default:
        logger.warn(`Unsupported lockfile type: ${type}`);
        return null;
    }
  } catch (error) {
    logger.error(`Failed to parse lockfile dependencies: ${error}`);
    return null;
  }
}

/**
 * Parse NPM lockfile
 * @param content Lockfile content
 * @returns Dependencies object
 */
function parseNpmLockfile(content: string): Record<string, string> {
  try {
    const parsed = JSON.parse(content);
    const dependencies: Record<string, string> = {};

    // Extract dependencies from packages
    if (parsed.packages) {
      Object.entries(parsed.packages).forEach(([pkgPath, pkgInfo]: [string, any]) => {
        if (pkgPath && pkgPath !== '' && !pkgPath.startsWith('node_modules/')) {
          const name = pkgPath.split('/').pop();
          if (name && pkgInfo.version) {
            dependencies[name] = pkgInfo.version;
          }
        }
      });
    } else if (parsed.dependencies) {
      // Legacy format
      Object.entries(parsed.dependencies).forEach(([name, info]: [string, any]) => {
        if (info.version) {
          dependencies[name] = info.version;
        }
      });
    }

    return dependencies;
  } catch (error) {
    logger.error(`Failed to parse NPM lockfile: ${error}`);
    return {};
  }
}

/**
 * Parse Yarn lockfile
 * @param content Lockfile content
 * @returns Dependencies object
 */
function parseYarnLockfile(content: string): Record<string, string> {
  try {
    const parsed = lockfile.parse(content);
    const dependencies: Record<string, string> = {};

    if (parsed.object) {
      Object.entries(parsed.object).forEach(([key, info]: [string, any]) => {
        const name = key.split('@')[0];
        if (name && info.version) {
          dependencies[name] = info.version;
        }
      });
    }

    return dependencies;
  } catch (error) {
    logger.error(`Failed to parse Yarn lockfile: ${error}`);
    return {};
  }
}

/**
 * Parse PNPM lockfile
 * @param content Lockfile content
 * @returns Dependencies object
 */
function parsePnpmLockfile(content: string): Record<string, string> {
  try {
    // Simple YAML parsing for PNPM lockfile
    const dependencies: Record<string, string> = {};
    const lines = content.split('\n');

    let currentPackage = '';

    for (const line of lines) {
      if (line.startsWith('  /')) {
        // Package definition line
        const match = line.match(/\/([^/]+)\/([^:]+):/);
        if (match) {
          currentPackage = match[1];
        }
      } else if (line.trim().startsWith('version:') && currentPackage) {
        // Version line
        const version = line.split(':')[1].trim().replace(/["']/g, '');
        dependencies[currentPackage] = version;
        currentPackage = '';
      }
    }

    return dependencies;
  } catch (error) {
    logger.error(`Failed to parse PNPM lockfile: ${error}`);
    return {};
  }
}

/**
 * Check if the lockfile has changed
 * @param projectDir Project directory
 * @param previousHash Previous lockfile hash
 * @returns True if the lockfile has changed, false otherwise
 */
export async function hasLockfileChanged(
  projectDir: string,
  previousHash: string | null | undefined
): Promise<boolean> {
  // If no previous hash, consider it changed
  if (!previousHash) {
    return true;
  }

  // Detect lockfile type
  const lockfileType = await detectLockfileType(projectDir);

  if (!lockfileType) {
    logger.warn('No lockfile found in project directory');
    return true;
  }

  // Get current hash
  const currentHash = await getLockfileHash(projectDir, lockfileType);

  // If no current hash, consider it changed
  if (!currentHash) {
    return true;
  }

  // Compare hashes
  return currentHash !== previousHash;
}
