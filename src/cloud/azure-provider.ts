/**
 * Azure Blob Storage provider for flash-install
 */
import fs from 'fs';
import path from 'path';
import { BlobServiceClient, StorageSharedKeyCredential, BlockBlobClient } from '@azure/storage-blob';
import { CloudProvider, CloudProviderConfig, CloudFileMetadata } from './provider.js';
import { logger } from '../utils/logger.js';
import * as fsUtils from '../utils/fs.js';

/**
 * Azure provider configuration
 */
export interface AzureProviderConfig extends CloudProviderConfig {
  type: 'azure';
  
  /**
   * Azure Storage account name
   */
  accountName: string;
  
  /**
   * Azure Storage container name (equivalent to S3 bucket)
   */
  containerName: string;
}

/**
 * Azure Blob Storage provider
 */
export class AzureProvider implements CloudProvider {
  private client: BlobServiceClient | null = null;
  private containerClient: any = null;
  private config: AzureProviderConfig;
  
  /**
   * Create a new Azure provider
   * @param config Provider configuration
   */
  constructor(config: AzureProviderConfig) {
    this.config = config;
  }
  
  /**
   * Initialize the provider
   */
  async init(): Promise<void> {
    try {
      // Create Azure Blob Service client
      if (this.config.credentials && this.config.credentials.accessKeyId) {
        // Use shared key credentials if provided
        const sharedKeyCredential = new StorageSharedKeyCredential(
          this.config.accountName,
          this.config.credentials.accessKeyId
        );
        
        this.client = new BlobServiceClient(
          `https://${this.config.accountName}.blob.core.windows.net`,
          sharedKeyCredential
        );
      } else if (this.config.endpoint) {
        // Use connection string or SAS token if endpoint is provided
        this.client = new BlobServiceClient(this.config.endpoint);
      } else {
        // Default to anonymous access (not recommended for production)
        this.client = new BlobServiceClient(
          `https://${this.config.accountName}.blob.core.windows.net`
        );
        logger.warn('No Azure credentials provided. Azure provider initialized with limited functionality.');
      }
      
      // Get container client
      this.containerClient = this.client.getContainerClient(this.config.containerName);
      
      // Test connection by listing blobs
      try {
        const iterator = this.containerClient.listBlobsFlat({ maxResults: 1 });
        await iterator.next();
        logger.debug(`Azure provider initialized successfully for container ${this.config.containerName}`);
      } catch (error) {
        logger.warn(`Failed to connect to Azure container ${this.config.containerName}: ${error}`);
        logger.warn('Azure provider initialized with limited functionality');
      }
    } catch (error) {
      logger.error(`Failed to initialize Azure provider: ${error}`);
      throw error;
    }
  }
  
  /**
   * Upload a file to Azure Blob Storage
   * @param localPath Local file path
   * @param remotePath Remote file path
   */
  async uploadFile(localPath: string, remotePath: string): Promise<void> {
    if (!this.containerClient) {
      throw new Error('Azure provider not initialized');
    }
    
    try {
      // Ensure the remote path has the prefix
      const fullRemotePath = this.getFullRemotePath(remotePath);
      
      // Get blob client
      const blockBlobClient = this.containerClient.getBlockBlobClient(fullRemotePath);
      
      // Upload file
      await blockBlobClient.uploadFile(localPath);
      
      logger.debug(`Uploaded ${localPath} to ${this.config.containerName}/${fullRemotePath}`);
    } catch (error) {
      logger.error(`Failed to upload ${localPath} to Azure: ${error}`);
      throw error;
    }
  }
  
  /**
   * Download a file from Azure Blob Storage
   * @param remotePath Remote file path
   * @param localPath Local file path
   */
  async downloadFile(remotePath: string, localPath: string): Promise<void> {
    if (!this.containerClient) {
      throw new Error('Azure provider not initialized');
    }
    
    try {
      // Ensure the remote path has the prefix
      const fullRemotePath = this.getFullRemotePath(remotePath);
      
      // Create directory if it doesn't exist
      await fsUtils.ensureDir(path.dirname(localPath));
      
      // Get blob client
      const blockBlobClient = this.containerClient.getBlockBlobClient(fullRemotePath);
      
      // Download file
      await blockBlobClient.downloadToFile(localPath);
      
      logger.debug(`Downloaded ${this.config.containerName}/${fullRemotePath} to ${localPath}`);
    } catch (error) {
      logger.error(`Failed to download ${remotePath} from Azure: ${error}`);
      throw error;
    }
  }
  
  /**
   * Check if a file exists in Azure Blob Storage
   * @param remotePath Remote file path
   */
  async fileExists(remotePath: string): Promise<boolean> {
    if (!this.containerClient) {
      throw new Error('Azure provider not initialized');
    }
    
    try {
      // Ensure the remote path has the prefix
      const fullRemotePath = this.getFullRemotePath(remotePath);
      
      // Get blob client
      const blockBlobClient = this.containerClient.getBlockBlobClient(fullRemotePath);
      
      // Check if blob exists
      return await blockBlobClient.exists();
    } catch (error) {
      return false;
    }
  }
  
  /**
   * List files in Azure Blob Storage
   * @param prefix Remote file prefix
   */
  async listFiles(prefix?: string): Promise<string[]> {
    if (!this.containerClient) {
      throw new Error('Azure provider not initialized');
    }
    
    try {
      // Ensure the prefix has the config prefix
      const fullPrefix = this.getFullRemotePath(prefix || '');
      
      // List blobs
      const files: string[] = [];
      const iterator = this.containerClient.listBlobsFlat({ prefix: fullPrefix });
      
      let blobItem = await iterator.next();
      while (!blobItem.done) {
        // Remove the config prefix
        const relativePath = this.getRelativeRemotePath(blobItem.value.name);
        files.push(relativePath);
        blobItem = await iterator.next();
      }
      
      return files;
    } catch (error) {
      logger.error(`Failed to list files in Azure: ${error}`);
      throw error;
    }
  }
  
  /**
   * Delete a file from Azure Blob Storage
   * @param remotePath Remote file path
   */
  async deleteFile(remotePath: string): Promise<void> {
    if (!this.containerClient) {
      throw new Error('Azure provider not initialized');
    }
    
    try {
      // Ensure the remote path has the prefix
      const fullRemotePath = this.getFullRemotePath(remotePath);
      
      // Get blob client
      const blockBlobClient = this.containerClient.getBlockBlobClient(fullRemotePath);
      
      // Delete blob
      await blockBlobClient.delete();
      
      logger.debug(`Deleted ${this.config.containerName}/${fullRemotePath}`);
    } catch (error) {
      logger.error(`Failed to delete ${remotePath} from Azure: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get metadata for a file in Azure Blob Storage
   * @param remotePath Remote file path
   */
  async getFileMetadata(remotePath: string): Promise<CloudFileMetadata | null> {
    if (!this.containerClient) {
      throw new Error('Azure provider not initialized');
    }
    
    try {
      // Ensure the remote path has the prefix
      const fullRemotePath = this.getFullRemotePath(remotePath);
      
      // Get blob client
      const blockBlobClient = this.containerClient.getBlockBlobClient(fullRemotePath);
      
      // Get blob properties
      const properties = await blockBlobClient.getProperties();
      
      // Extract metadata
      return {
        lastModified: properties.lastModified,
        size: properties.contentLength,
        etag: properties.etag,
        contentType: properties.contentType
      };
    } catch (error) {
      logger.debug(`Failed to get metadata for ${remotePath} from Azure: ${error}`);
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
