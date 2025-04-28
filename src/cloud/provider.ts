/**
 * Cloud provider interface for flash-install
 */

/**
 * Cloud provider configuration
 */
export interface CloudProviderConfig {
  /**
   * Provider type
   */
  type: string;

  /**
   * Provider endpoint
   */
  endpoint?: string;

  /**
   * Provider region
   */
  region?: string;

  /**
   * Provider credentials
   */
  credentials?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
  };

  /**
   * Provider bucket
   */
  bucket: string;

  /**
   * Provider prefix
   */
  prefix?: string;
}

/**
 * Cloud file metadata
 */
export interface CloudFileMetadata {
  /**
   * Last modified date
   */
  lastModified?: Date;

  /**
   * File size in bytes
   */
  size?: number;

  /**
   * ETag or other identifier
   */
  etag?: string;

  /**
   * Content type
   */
  contentType?: string;
}

/**
 * Cloud provider interface
 */
export interface CloudProvider {
  /**
   * Initialize the provider
   */
  init(): Promise<void>;

  /**
   * Upload a file to the cloud
   * @param localPath Local file path
   * @param remotePath Remote file path
   */
  uploadFile(localPath: string, remotePath: string): Promise<void>;

  /**
   * Download a file from the cloud
   * @param remotePath Remote file path
   * @param localPath Local file path
   */
  downloadFile(remotePath: string, localPath: string): Promise<void>;

  /**
   * Check if a file exists in the cloud
   * @param remotePath Remote file path
   */
  fileExists(remotePath: string): Promise<boolean>;

  /**
   * List files in the cloud
   * @param prefix Remote file prefix
   */
  listFiles(prefix?: string): Promise<string[]>;

  /**
   * Delete a file from the cloud
   * @param remotePath Remote file path
   */
  deleteFile(remotePath: string): Promise<void>;

  /**
   * Get metadata for a file in the cloud
   * @param remotePath Remote file path
   */
  getFileMetadata(remotePath: string): Promise<CloudFileMetadata | null>;

  /**
   * Upload a buffer to the cloud
   * @param buffer Buffer to upload
   * @param remotePath Remote file path
   */
  uploadBuffer?(buffer: Buffer, remotePath: string): Promise<void>;

  /**
   * Upload a large file to the cloud with progress reporting
   * @param localPath Local file path
   * @param remotePath Remote file path
   * @param progressCallback Callback for progress updates
   */
  uploadLargeFile?(localPath: string, remotePath: string, progressCallback?: (percent: number) => void): Promise<void>;

  /**
   * Download a large file from the cloud with progress reporting
   * @param remotePath Remote file path
   * @param localPath Local file path
   * @param progressCallback Callback for progress updates
   */
  downloadLargeFile?(remotePath: string, localPath: string, progressCallback?: (percent: number) => void): Promise<void>;

  /**
   * Initialize a multipart upload
   * @param remotePath Remote file path
   */
  initMultipartUpload?(remotePath: string): Promise<string>;

  /**
   * Upload a part of a multipart upload
   * @param buffer Buffer containing the part data
   * @param remotePath Remote file path
   * @param uploadId Upload ID from initMultipartUpload
   * @param partNumber Part number (1-based)
   */
  uploadPart?(buffer: Buffer, remotePath: string, uploadId: string, partNumber: number): Promise<any>;

  /**
   * Complete a multipart upload
   * @param remotePath Remote file path
   * @param uploadId Upload ID from initMultipartUpload
   * @param parts Parts metadata from uploadPart
   */
  completeMultipartUpload?(remotePath: string, uploadId: string, parts: any[]): Promise<void>;

  /**
   * Abort a multipart upload
   * @param remotePath Remote file path
   * @param uploadId Upload ID from initMultipartUpload
   */
  abortMultipartUpload?(remotePath: string, uploadId: string): Promise<void>;
}

/**
 * Cloud provider factory
 */
export interface CloudProviderFactory {
  /**
   * Create a cloud provider
   * @param config Provider configuration
   */
  createProvider(config: CloudProviderConfig): CloudProvider;
}
