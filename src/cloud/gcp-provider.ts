/**
 * Google Cloud Storage provider for flash-install
 */
import fs from 'fs';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import { CloudProvider, CloudProviderConfig, CloudFileMetadata } from './provider.js';
import { logger } from '../utils/logger.js';
import * as fsUtils from '../utils/fs.js';

/**
 * Google Cloud Storage provider configuration
 */
export interface GCPProviderConfig extends CloudProviderConfig {
  type: 'gcp';
  
  /**
   * GCP project ID
   */
  projectId?: string;
  
  /**
   * Path to service account key file
   */
  keyFilename?: string;
}

/**
 * Google Cloud Storage provider
 */
export class GCPProvider implements CloudProvider {
  private storage: Storage | null = null;
  private bucket: any = null;
  private config: GCPProviderConfig;
  
  /**
   * Create a new GCP provider
   * @param config Provider configuration
   */
  constructor(config: GCPProviderConfig) {
    this.config = config;
  }
  
  /**
   * Initialize the provider
   */
  async init(): Promise<void> {
    try {
      // Create GCP Storage client
      const options: any = {};
      
      if (this.config.projectId) {
        options.projectId = this.config.projectId;
      }
      
      if (this.config.keyFilename) {
        options.keyFilename = this.config.keyFilename;
      } else if (this.config.credentials && this.config.credentials.accessKeyId) {
        // Use credentials if provided
        options.credentials = {
          client_email: this.config.credentials.accessKeyId,
          private_key: this.config.credentials.secretAccessKey
        };
      }
      
      this.storage = new Storage(options);
      
      // Get bucket
      this.bucket = this.storage.bucket(this.config.bucket);
      
      // Test connection
      try {
        const [files] = await this.bucket.getFiles({ maxResults: 1 });
        logger.debug(`GCP provider initialized successfully for bucket ${this.config.bucket}`);
      } catch (error) {
        logger.warn(`Failed to connect to GCP bucket ${this.config.bucket}: ${error}`);
        logger.warn('GCP provider initialized with limited functionality');
        logger.info('To use GCP provider, configure credentials or set GOOGLE_APPLICATION_CREDENTIALS environment variable.');
      }
    } catch (error) {
      logger.error(`Failed to initialize GCP provider: ${error}`);
      throw error;
    }
  }
  
  /**
   * Upload a file to GCP
   * @param localPath Local file path
   * @param remotePath Remote file path
   */
  async uploadFile(localPath: string, remotePath: string): Promise<void> {
    if (!this.bucket) {
      throw new Error('GCP provider not initialized');
    }
    
    try {
      // Ensure the remote path has the prefix
      const fullRemotePath = this.getFullRemotePath(remotePath);
      
      // Upload file
      await this.bucket.upload(localPath, {
        destination: fullRemotePath,
        gzip: true
      });
      
      logger.debug(`Uploaded ${localPath} to gs://${this.config.bucket}/${fullRemotePath}`);
    } catch (error) {
      logger.error(`Failed to upload ${localPath} to GCP: ${error}`);
      throw error;
    }
  }
  
  /**
   * Download a file from GCP
   * @param remotePath Remote file path
   * @param localPath Local file path
   */
  async downloadFile(remotePath: string, localPath: string): Promise<void> {
    if (!this.bucket) {
      throw new Error('GCP provider not initialized');
    }
    
    try {
      // Ensure the remote path has the prefix
      const fullRemotePath = this.getFullRemotePath(remotePath);
      
      // Create directory if it doesn't exist
      await fsUtils.ensureDir(path.dirname(localPath));
      
      // Download file
      await this.bucket.file(fullRemotePath).download({
        destination: localPath
      });
      
      logger.debug(`Downloaded gs://${this.config.bucket}/${fullRemotePath} to ${localPath}`);
    } catch (error) {
      logger.error(`Failed to download ${remotePath} from GCP: ${error}`);
      throw error;
    }
  }
  
  /**
   * Check if a file exists in GCP
   * @param remotePath Remote file path
   */
  async fileExists(remotePath: string): Promise<boolean> {
    if (!this.bucket) {
      throw new Error('GCP provider not initialized');
    }
    
    try {
      // Ensure the remote path has the prefix
      const fullRemotePath = this.getFullRemotePath(remotePath);
      
      // Check if file exists
      const [exists] = await this.bucket.file(fullRemotePath).exists();
      return exists;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * List files in GCP
   * @param prefix Remote file prefix
   */
  async listFiles(prefix?: string): Promise<string[]> {
    if (!this.bucket) {
      throw new Error('GCP provider not initialized');
    }
    
    try {
      // Ensure the prefix has the config prefix
      const fullPrefix = this.getFullRemotePath(prefix || '');
      
      // List files
      const [files] = await this.bucket.getFiles({ prefix: fullPrefix });
      
      // Extract file paths
      return files.map(file => this.getRelativeRemotePath(file.name));
    } catch (error) {
      logger.error(`Failed to list files in GCP: ${error}`);
      throw error;
    }
  }
  
  /**
   * Delete a file from GCP
   * @param remotePath Remote file path
   */
  async deleteFile(remotePath: string): Promise<void> {
    if (!this.bucket) {
      throw new Error('GCP provider not initialized');
    }
    
    try {
      // Ensure the remote path has the prefix
      const fullRemotePath = this.getFullRemotePath(remotePath);
      
      // Delete file
      await this.bucket.file(fullRemotePath).delete();
      
      logger.debug(`Deleted gs://${this.config.bucket}/${fullRemotePath}`);
    } catch (error) {
      logger.error(`Failed to delete ${remotePath} from GCP: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get metadata for a file in GCP
   * @param remotePath Remote file path
   */
  async getFileMetadata(remotePath: string): Promise<CloudFileMetadata | null> {
    if (!this.bucket) {
      throw new Error('GCP provider not initialized');
    }
    
    try {
      // Ensure the remote path has the prefix
      const fullRemotePath = this.getFullRemotePath(remotePath);
      
      // Get file metadata
      const [metadata] = await this.bucket.file(fullRemotePath).getMetadata();
      
      // Extract metadata
      return {
        lastModified: new Date(metadata.updated),
        size: parseInt(metadata.size, 10),
        etag: metadata.etag,
        contentType: metadata.contentType
      };
    } catch (error) {
      logger.debug(`Failed to get metadata for ${remotePath} from GCP: ${error}`);
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
