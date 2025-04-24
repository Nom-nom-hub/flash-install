import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import { logger } from './logger.js';
import { hashString, hashFile } from './hash.js';

/**
 * Package integrity information
 */
export interface PackageIntegrity {
  name: string;
  version: string;
  shasum: string;
  integrity?: string;
  verified: boolean;
}

/**
 * Snapshot fingerprint information
 */
export interface SnapshotFingerprint {
  dependencies: Record<string, string>;
  lockfileHash: string;
  nodeVersion: string;
  timestamp: number;
  platform: string;
  arch: string;
}

/**
 * Verify package integrity against npm registry
 * @param name Package name
 * @param version Package version
 * @param filePath Path to the package tarball
 * @returns Package integrity information
 */
export async function verifyPackageIntegrity(
  name: string,
  version: string,
  filePath: string
): Promise<PackageIntegrity> {
  try {
    // Calculate file hash
    const fileHash = await hashFile(filePath);
    
    // Get package metadata from npm registry
    const registryData = await getPackageMetadata(name, version);
    
    // Check if shasum matches
    const verified = registryData.shasum === fileHash;
    
    if (!verified) {
      logger.warn(`Integrity check failed for ${name}@${version}`);
      logger.debug(`Expected: ${registryData.shasum}, Got: ${fileHash}`);
    }
    
    return {
      name,
      version,
      shasum: fileHash,
      integrity: registryData.integrity,
      verified
    };
  } catch (error) {
    logger.debug(`Failed to verify package integrity: ${error}`);
    
    // Return unverified package
    return {
      name,
      version,
      shasum: await hashFile(filePath),
      verified: false
    };
  }
}

/**
 * Get package metadata from npm registry
 * @param name Package name
 * @param version Package version
 * @returns Package metadata
 */
async function getPackageMetadata(
  name: string,
  version: string
): Promise<{ shasum: string; integrity?: string }> {
  return new Promise((resolve, reject) => {
    const url = `https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const metadata = JSON.parse(data);
          
          if (metadata.dist && metadata.dist.shasum) {
            resolve({
              shasum: metadata.dist.shasum,
              integrity: metadata.dist.integrity
            });
          } else {
            reject(new Error('No shasum found in package metadata'));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Create a snapshot fingerprint
 * @param dependencies Dependency tree
 * @param lockfilePath Path to lockfile
 * @returns Snapshot fingerprint
 */
export async function createSnapshotFingerprint(
  dependencies: Record<string, string>,
  lockfilePath?: string
): Promise<SnapshotFingerprint> {
  // Get lockfile hash if available
  let lockfileHash = '';
  
  if (lockfilePath && await fs.pathExists(lockfilePath)) {
    lockfileHash = await hashFile(lockfilePath);
  }
  
  return {
    dependencies,
    lockfileHash,
    nodeVersion: process.version,
    timestamp: Date.now(),
    platform: process.platform,
    arch: process.arch
  };
}

/**
 * Verify snapshot fingerprint
 * @param fingerprint Snapshot fingerprint
 * @param dependencies Current dependencies
 * @param lockfilePath Path to lockfile
 * @returns Whether the fingerprint is valid
 */
export async function verifySnapshotFingerprint(
  fingerprint: SnapshotFingerprint,
  dependencies: Record<string, string>,
  lockfilePath?: string
): Promise<{ valid: boolean; reason?: string }> {
  // Check if dependencies match
  const depsMatch = Object.entries(dependencies).every(
    ([name, version]) => fingerprint.dependencies[name] === version
  );
  
  if (!depsMatch) {
    return { valid: false, reason: 'Dependencies have changed' };
  }
  
  // Check if lockfile has changed
  if (lockfilePath && await fs.pathExists(lockfilePath)) {
    const currentLockfileHash = await hashFile(lockfilePath);
    
    if (fingerprint.lockfileHash && currentLockfileHash !== fingerprint.lockfileHash) {
      return { valid: false, reason: 'Lockfile has changed' };
    }
  }
  
  // Check if Node.js version is compatible
  const currentMajorVersion = process.version.split('.')[0];
  const fingerprintMajorVersion = fingerprint.nodeVersion.split('.')[0];
  
  if (currentMajorVersion !== fingerprintMajorVersion) {
    return { 
      valid: false, 
      reason: `Node.js version mismatch (snapshot: ${fingerprint.nodeVersion}, current: ${process.version})` 
    };
  }
  
  // Check if platform and architecture match
  if (fingerprint.platform !== process.platform || fingerprint.arch !== process.arch) {
    return { 
      valid: false, 
      reason: `Platform or architecture mismatch (snapshot: ${fingerprint.platform}-${fingerprint.arch}, current: ${process.platform}-${process.arch})` 
    };
  }
  
  return { valid: true };
}

/**
 * Get the appropriate lockfile path based on package manager
 * @param projectDir Project directory
 * @returns Lockfile path
 */
export function getLockfilePath(projectDir: string): string | undefined {
  const lockfiles = [
    path.join(projectDir, 'package-lock.json'),
    path.join(projectDir, 'yarn.lock'),
    path.join(projectDir, 'pnpm-lock.yaml')
  ];
  
  for (const lockfile of lockfiles) {
    if (fs.existsSync(lockfile)) {
      return lockfile;
    }
  }
  
  return undefined;
}
