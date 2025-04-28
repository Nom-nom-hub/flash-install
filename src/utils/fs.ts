import fs from 'fs-extra';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { logger } from './logger.js';
import { performance } from 'perf_hooks';
import { exec } from 'child_process';

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
 * Copy a file or directory with memory-efficient streaming
 * @param srcPath The source path
 * @param destPath The destination path
 * @param useHardLinks Whether to use hardlinks for files when possible
 * @param onProgress Optional progress callback
 */
export async function copy(
  srcPath: string,
  destPath: string,
  useHardLinks = true,
  onProgress?: (copied: number, total: number) => void
): Promise<void> {
  try {
    // Check if source path exists
    if (!await exists(srcPath)) {
      logger.error(`Source path does not exist: ${srcPath}`);
      throw new Error(`Source path does not exist: ${srcPath}`);
    }

    const stats = await fs.stat(srcPath);

    if (stats.isDirectory()) {
      // Ensure destination directory exists
      await ensureDir(destPath);

      // Use streaming directory copy for better memory efficiency
      await copyDirStream(srcPath, destPath, {
        useHardLinks,
        onProgress
      });
    } else {
      // Use streaming file copy for better memory efficiency
      if (useHardLinks) {
        // Try hardlink first
        await fs.ensureDir(path.dirname(destPath));
        const linked = await createHardLink(srcPath, destPath);

        if (!linked) {
          // Fall back to streaming copy if hardlinking fails
          await copyFileStream(srcPath, destPath, { onProgress });
        } else if (onProgress) {
          // Report progress for hardlinked file
          const fileSize = stats.size;
          onProgress(fileSize, fileSize);
        }
      } else {
        // Use streaming copy
        await copyFileStream(srcPath, destPath, { onProgress });
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

/**
 * Copy a file using streams for memory efficiency
 * @param srcPath Source file path
 * @param destPath Destination file path
 * @param options Options for the copy operation
 * @returns Promise that resolves when the copy is complete
 */
export async function copyFileStream(
  srcPath: string,
  destPath: string,
  options: {
    chunkSize?: number;
    onProgress?: (copied: number, total: number) => void;
  } = {}
): Promise<void> {
  // Ensure destination directory exists
  await ensureDir(path.dirname(destPath));

  // Get file size
  const stats = await fs.stat(srcPath);
  const fileSize = stats.size;

  // Create read and write streams
  const readStream = createReadStream(srcPath, {
    highWaterMark: options.chunkSize || 64 * 1024 // Default 64KB chunks
  });

  const writeStream = createWriteStream(destPath);

  // Track progress
  if (options.onProgress) {
    let bytesCopied = 0;

    readStream.on('data', (chunk) => {
      bytesCopied += chunk.length;
      options.onProgress!(bytesCopied, fileSize);
    });
  }

  // Use pipeline for proper error handling
  try {
    await pipeline(readStream, writeStream);
  } catch (error) {
    logger.error(`Failed to copy file from ${srcPath} to ${destPath}: ${error}`);
    throw error;
  }
}

/**
 * Copy a directory using streams for memory efficiency
 * @param srcDir Source directory path
 * @param destDir Destination directory path
 * @param options Options for the copy operation
 * @returns Promise that resolves when the copy is complete
 */
export async function copyDirStream(
  srcDir: string,
  destDir: string,
  options: {
    useHardLinks?: boolean;
    filter?: (src: string) => boolean;
    onProgress?: (copied: number, total: number) => void;
  } = {}
): Promise<void> {
  // Ensure destination directory exists
  await ensureDir(destDir);

  try {
    // Get all files in the source directory
    const files = await getAllFiles(srcDir);

    // Apply filter if provided
    const filteredFiles = options.filter
      ? files.filter(file => options.filter!(file))
      : files;

    // Get total size for progress reporting
    let totalSize = 0;
    let copiedSize = 0;

    if (options.onProgress) {
      for (const file of filteredFiles) {
        try {
          const stats = await fs.stat(file);
          totalSize += stats.size;
        } catch (error) {
          logger.debug(`Failed to get stats for ${file}: ${error}`);
          // Continue with the next file
        }
      }
    }

    // Copy each file
    for (const srcFile of filteredFiles) {
      try {
        // Get relative path
        const relPath = path.relative(srcDir, srcFile);
        const destFile = path.join(destDir, relPath);

        // Ensure destination directory exists
        await ensureDir(path.dirname(destFile));

        // Check if source file still exists (it might have been deleted)
        if (!await exists(srcFile)) {
          logger.debug(`Source file no longer exists: ${srcFile}`);
          continue;
        }

        // Use hardlinks if requested
        if (options.useHardLinks) {
          try {
            await fs.ensureDir(path.dirname(destFile));
            await fs.link(srcFile, destFile);

            if (options.onProgress) {
              const stats = await fs.stat(srcFile);
              copiedSize += stats.size;
              options.onProgress(copiedSize, totalSize);
            }

            continue;
          } catch (error) {
            logger.debug(`Failed to create hardlink, falling back to stream copy: ${error}`);
          }
        }

        // Copy file using streams
        await copyFileStream(srcFile, destFile, {
          onProgress: options.onProgress ? (copied, total) => {
            const newCopiedSize = copiedSize + copied;
            options.onProgress!(newCopiedSize, totalSize);
          } : undefined
        });

        if (options.onProgress) {
          try {
            const stats = await fs.stat(srcFile);
            copiedSize += stats.size;
          } catch (error) {
            logger.debug(`Failed to get stats for ${srcFile}: ${error}`);
            // Continue with the next file
          }
        }
      } catch (error) {
        logger.warn(`Failed to copy file ${srcFile}: ${error}`);
        // Continue with the next file instead of failing the entire operation
      }
    }
  } catch (error) {
    logger.error(`Failed to copy directory ${srcDir} to ${destDir}: ${error}`);
    throw error;
  }
}

/**
 * Get all files in a directory recursively
 * @param dir Directory path
 * @returns Array of file paths
 */
export async function getAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  // Read directory contents
  const entries = await fs.readdir(dir, { withFileTypes: true });

  // Process each entry
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively get files from subdirectory
      const subFiles = await getAllFiles(fullPath);
      files.push(...subFiles);
    } else {
      // Add file to list
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Check if a path exists
 * @param targetPath The path to check
 * @returns True if the path exists
 */
export async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Create a tarball from a directory
 * @param sourceDir Source directory
 * @param outputFile Output tarball file
 * @returns Promise that resolves when the tarball is created
 */
export async function createTarball(sourceDir: string, outputFile: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Ensure output directory exists
    fs.ensureDirSync(path.dirname(outputFile));

    // Use tar command for better performance
    const cmd = `tar -czf "${outputFile}" -C "${path.dirname(sourceDir)}" "${path.basename(sourceDir)}"`;

    exec(cmd, (error) => {
      if (error) {
        logger.error(`Failed to create tarball: ${error}`);
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Extract a tarball to a directory
 * @param tarballFile Tarball file
 * @param outputDir Output directory
 * @returns Promise that resolves when the tarball is extracted
 */
export async function extractTarball(tarballFile: string, outputDir: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Ensure output directory exists
    fs.ensureDirSync(outputDir);

    // Use tar command for better performance
    const cmd = `tar -xzf "${tarballFile}" -C "${outputDir}"`;

    exec(cmd, (error) => {
      if (error) {
        logger.error(`Failed to extract tarball: ${error}`);
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get file or directory stats
 * @param targetPath Path to get stats for
 * @returns Stats object or null if the path doesn't exist
 */
export async function getStats(targetPath: string): Promise<fs.Stats | null> {
  try {
    return await fs.stat(targetPath);
  } catch (error) {
    logger.debug(`Failed to get stats for ${targetPath}: ${error}`);
    return null;
  }
}

/**
 * Get all directories in a directory
 * @param dirPath Directory path
 * @returns Array of directory names
 */
export async function getDirectories(dirPath: string): Promise<string[]> {
  try {
    // Check if directory exists
    if (!await directoryExists(dirPath)) {
      return [];
    }

    // Get all entries in the directory
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    // Filter directories
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch (error) {
    logger.error(`Failed to get directories in ${dirPath}: ${error}`);
    return [];
  }
}
