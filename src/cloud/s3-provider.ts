/**
 * S3 cloud provider for flash-install
 */
import fs from 'fs';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { CloudProvider, CloudProviderConfig, CloudFileMetadata } from './provider.js';
import { logger } from '../utils/logger.js';
import * as fsUtils from '../utils/fs.js';

/**
 * S3 provider configuration
 */
export interface S3ProviderConfig extends CloudProviderConfig {
  type: 's3';
}

/**
 * S3 cloud provider
 */
export class S3Provider implements CloudProvider {
  private client: S3Client | null = null;
  private config: S3ProviderConfig;

  /**
   * Create a new S3 provider
   * @param config Provider configuration
   */
  constructor(config: S3ProviderConfig) {
    this.config = config;
  }

  /**
   * Initialize the provider
   */
  async init(): Promise<void> {
    try {
      // Create S3 client
      this.client = new S3Client({
        region: this.config.region || 'us-east-1',
        endpoint: this.config.endpoint,
        credentials: this.config.credentials ? {
          accessKeyId: this.config.credentials.accessKeyId || '',
          secretAccessKey: this.config.credentials.secretAccessKey || '',
          sessionToken: this.config.credentials.sessionToken
        } : undefined
      });

      // Only test connection if credentials are provided
      if (this.config.credentials && this.config.credentials.accessKeyId && this.config.credentials.secretAccessKey) {
        try {
          // Test connection
          await this.client.send(new ListObjectsV2Command({
            Bucket: this.config.bucket,
            MaxKeys: 1,
            Prefix: this.config.prefix
          }));

          logger.debug(`S3 provider initialized successfully for bucket ${this.config.bucket}`);
        } catch (error) {
          logger.warn(`Failed to connect to S3 bucket ${this.config.bucket}: ${error}`);
          logger.warn('S3 provider initialized with limited functionality');
        }
      } else {
        logger.warn('No AWS credentials provided. S3 provider initialized with limited functionality.');
        logger.info('To use S3 provider, configure AWS credentials in ~/.aws/credentials or set environment variables.');
      }
    } catch (error) {
      logger.error(`Failed to initialize S3 provider: ${error}`);
      throw error;
    }
  }

  /**
   * Upload a file to S3
   * @param localPath Local file path
   * @param remotePath Remote file path
   */
  async uploadFile(localPath: string, remotePath: string): Promise<void> {
    if (!this.client) {
      throw new Error('S3 provider not initialized');
    }

    try {
      // Ensure the remote path has the prefix
      const fullRemotePath = this.getFullRemotePath(remotePath);

      // Create readable stream
      const fileStream = fs.createReadStream(localPath);

      // Upload file
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.config.bucket,
          Key: fullRemotePath,
          Body: fileStream
        }
      });

      // Wait for upload to complete
      await upload.done();

      logger.debug(`Uploaded ${localPath} to s3://${this.config.bucket}/${fullRemotePath}`);
    } catch (error) {
      logger.error(`Failed to upload ${localPath} to S3: ${error}`);
      throw error;
    }
  }

  /**
   * Download a file from S3
   * @param remotePath Remote file path
   * @param localPath Local file path
   */
  async downloadFile(remotePath: string, localPath: string): Promise<void> {
    if (!this.client) {
      throw new Error('S3 provider not initialized');
    }

    try {
      // Ensure the remote path has the prefix
      const fullRemotePath = this.getFullRemotePath(remotePath);

      // Create directory if it doesn't exist
      await fsUtils.ensureDir(path.dirname(localPath));

      // Download file
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: fullRemotePath
      }));

      // Create writable stream
      const fileStream = fs.createWriteStream(localPath);

      // Pipe response body to file
      if (response.Body) {
        const responseStream = response.Body as any;
        responseStream.pipe(fileStream);

        // Wait for download to complete
        await new Promise<void>((resolve, reject) => {
          fileStream.on('finish', resolve);
          fileStream.on('error', reject);
        });
      }

      logger.debug(`Downloaded s3://${this.config.bucket}/${fullRemotePath} to ${localPath}`);
    } catch (error) {
      logger.error(`Failed to download ${remotePath} from S3: ${error}`);
      throw error;
    }
  }

  /**
   * Check if a file exists in S3
   * @param remotePath Remote file path
   */
  async fileExists(remotePath: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('S3 provider not initialized');
    }

    try {
      // Ensure the remote path has the prefix
      const fullRemotePath = this.getFullRemotePath(remotePath);

      // Check if file exists
      await this.client.send(new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: fullRemotePath
      }));

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * List files in S3
   * @param prefix Remote file prefix
   */
  async listFiles(prefix?: string): Promise<string[]> {
    if (!this.client) {
      throw new Error('S3 provider not initialized');
    }

    try {
      // Ensure the prefix has the config prefix
      const fullPrefix = this.getFullRemotePath(prefix || '');

      // List files
      const response = await this.client.send(new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: fullPrefix
      }));

      // Extract file paths
      const files: string[] = [];

      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key) {
            // Remove the config prefix
            const relativePath = this.getRelativeRemotePath(object.Key);
            files.push(relativePath);
          }
        }
      }

      return files;
    } catch (error) {
      logger.error(`Failed to list files in S3: ${error}`);
      throw error;
    }
  }

  /**
   * Delete a file from S3
   * @param remotePath Remote file path
   */
  async deleteFile(remotePath: string): Promise<void> {
    if (!this.client) {
      throw new Error('S3 provider not initialized');
    }

    try {
      // Ensure the remote path has the prefix
      const fullRemotePath = this.getFullRemotePath(remotePath);

      // Delete file
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: fullRemotePath
      }));

      logger.debug(`Deleted s3://${this.config.bucket}/${fullRemotePath}`);
    } catch (error) {
      logger.error(`Failed to delete ${remotePath} from S3: ${error}`);
      throw error;
    }
  }

  /**
   * Get metadata for a file in S3
   * @param remotePath Remote file path
   */
  async getFileMetadata(remotePath: string): Promise<CloudFileMetadata | null> {
    if (!this.client) {
      throw new Error('S3 provider not initialized');
    }

    try {
      // Ensure the remote path has the prefix
      const fullRemotePath = this.getFullRemotePath(remotePath);

      // Get file metadata
      const response = await this.client.send(new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: fullRemotePath
      }));

      // Extract metadata
      return {
        lastModified: response.LastModified,
        size: response.ContentLength,
        etag: response.ETag,
        contentType: response.ContentType
      };
    } catch (error) {
      logger.debug(`Failed to get metadata for ${remotePath} from S3: ${error}`);
      return null;
    }
  }

  /**
   * Get the full remote path with the config prefix
   * @param remotePath Remote file path
   */
  private getFullRemotePath(remotePath: string): string {
    if (!this.config.prefix) {
      return remotePath;
    }

    // Remove leading slash from remote path
    const cleanRemotePath = remotePath.startsWith('/') ? remotePath.substring(1) : remotePath;

    // Remove trailing slash from prefix
    const cleanPrefix = this.config.prefix.endsWith('/') ?
      this.config.prefix.substring(0, this.config.prefix.length - 1) :
      this.config.prefix;

    return `${cleanPrefix}/${cleanRemotePath}`;
  }

  /**
   * Get the relative remote path without the config prefix
   * @param fullRemotePath Full remote file path
   */
  private getRelativeRemotePath(fullRemotePath: string): string {
    if (!this.config.prefix) {
      return fullRemotePath;
    }

    // Remove trailing slash from prefix
    const cleanPrefix = this.config.prefix.endsWith('/') ?
      this.config.prefix.substring(0, this.config.prefix.length - 1) :
      this.config.prefix;

    // Remove prefix from full path
    if (fullRemotePath.startsWith(cleanPrefix)) {
      return fullRemotePath.substring(cleanPrefix.length + 1);
    }

    return fullRemotePath;
  }
}
