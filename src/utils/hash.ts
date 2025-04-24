import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';

/**
 * Generate a hash from a string
 * @param content The content to hash
 * @param algorithm The hashing algorithm to use
 * @returns The generated hash
 */
export function hashString(content: string, algorithm = 'sha256'): string {
  return crypto.createHash(algorithm).update(content).digest('hex');
}

/**
 * Generate a hash from a file
 * @param filePath The path to the file
 * @param algorithm The hashing algorithm to use
 * @returns The generated hash
 */
export async function hashFile(filePath: string, algorithm = 'sha256'): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Generate a hash from a directory
 * @param dirPath The path to the directory
 * @param algorithm The hashing algorithm to use
 * @returns The generated hash
 */
export async function hashDirectory(dirPath: string, algorithm = 'sha256'): Promise<string> {
  const hash = crypto.createHash(algorithm);
  const files = await fs.readdir(dirPath);
  
  // Sort files for deterministic hashing
  const sortedFiles = files.sort();
  
  for (const file of sortedFiles) {
    const filePath = path.join(dirPath, file);
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      // Recursively hash subdirectories
      const dirHash = await hashDirectory(filePath, algorithm);
      hash.update(`${file}:dir:${dirHash}`);
    } else {
      // Hash files
      const fileHash = await hashFile(filePath, algorithm);
      hash.update(`${file}:file:${fileHash}:${stats.size}`);
    }
  }
  
  return hash.digest('hex');
}

/**
 * Generate a hash for a package based on its name and version
 * @param name The package name
 * @param version The package version
 * @returns The generated hash
 */
export function hashPackage(name: string, version: string): string {
  return hashString(`${name}@${version}`);
}

/**
 * Generate a hash for a dependency tree
 * @param dependencies The dependency tree object
 * @returns The generated hash
 */
export function hashDependencyTree(dependencies: Record<string, string>): string {
  // Sort dependencies by name for deterministic hashing
  const sortedDeps = Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b));
  const depString = sortedDeps.map(([name, version]) => `${name}@${version}`).join('|');
  return hashString(depString);
}
