import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger.js';

/**
 * Check if a file exists
 * @param filePath The path to check
 * @returns True if the file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch (error) {
    return false;
  }
}

/**
 * Check if a directory exists
 * @param dirPath The path to check
 * @returns True if the directory exists, false otherwise
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Create a directory if it doesn't exist
 * @param dirPath The directory path to create
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.ensureDir(dirPath);
  } catch (error) {
    logger.error(`Failed to create directory ${dirPath}: ${error}`);
    throw error;
  }
}

/**
 * Create a hardlink between two files
 * @param srcPath The source file path
 * @param destPath The destination file path
 * @returns True if successful, false otherwise
 */
export async function createHardLink(srcPath: string, destPath: string): Promise<boolean> {
  try {
    await fs.ensureDir(path.dirname(destPath));
    await fs.link(srcPath, destPath);
    return true;
  } catch (error) {
    logger.debug(`Failed to create hardlink from ${srcPath} to ${destPath}: ${error}`);
    return false;
  }
}

/**
 * Copy a file or directory
 * @param srcPath The source path
 * @param destPath The destination path
 * @param useHardLinks Whether to use hardlinks for files when possible
 */
export async function copy(srcPath: string, destPath: string, useHardLinks = true): Promise<void> {
  try {
    const stats = await fs.stat(srcPath);
    
    if (stats.isDirectory()) {
      await fs.ensureDir(destPath);
      const files = await fs.readdir(srcPath);
      
      await Promise.all(files.map(async (file) => {
        const src = path.join(srcPath, file);
        const dest = path.join(destPath, file);
        await copy(src, dest, useHardLinks);
      }));
    } else {
      await fs.ensureDir(path.dirname(destPath));
      
      if (useHardLinks) {
        const linked = await createHardLink(srcPath, destPath);
        if (!linked) {
          // Fall back to regular copy if hardlinking fails
          await fs.copy(srcPath, destPath);
        }
      } else {
        await fs.copy(srcPath, destPath);
      }
    }
  } catch (error) {
    logger.error(`Failed to copy from ${srcPath} to ${destPath}: ${error}`);
    throw error;
  }
}

/**
 * Remove a file or directory
 * @param targetPath The path to remove
 */
export async function remove(targetPath: string): Promise<void> {
  try {
    await fs.remove(targetPath);
  } catch (error) {
    logger.error(`Failed to remove ${targetPath}: ${error}`);
    throw error;
  }
}

/**
 * Get the size of a file or directory in bytes
 * @param targetPath The path to check
 * @returns The size in bytes
 */
export async function getSize(targetPath: string): Promise<number> {
  try {
    const stats = await fs.stat(targetPath);
    
    if (stats.isDirectory()) {
      let size = 0;
      const files = await fs.readdir(targetPath);
      
      for (const file of files) {
        const filePath = path.join(targetPath, file);
        size += await getSize(filePath);
      }
      
      return size;
    } else {
      return stats.size;
    }
  } catch (error) {
    logger.error(`Failed to get size of ${targetPath}: ${error}`);
    return 0;
  }
}

/**
 * Format a size in bytes to a human-readable string
 * @param bytes The size in bytes
 * @returns A human-readable string
 */
export function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
