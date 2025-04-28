/**
 * Cloud provider factory for flash-install
 */
import { CloudProvider, CloudProviderConfig, CloudProviderFactory } from './provider.js';
import { S3Provider, S3ProviderConfig } from './s3-provider.js';
import { AzureProvider, AzureProviderConfig } from './azure-provider.js';
import { GCPProvider, GCPProviderConfig } from './gcp-provider.js';
import { logger } from '../utils/logger.js';

/**
 * Default cloud provider factory
 */
export class DefaultCloudProviderFactory implements CloudProviderFactory {
  /**
   * Create a cloud provider
   * @param config Provider configuration
   */
  createProvider(config: CloudProviderConfig): CloudProvider {
    switch (config.type) {
      case 's3':
        return new S3Provider(config as S3ProviderConfig);
      case 'azure':
        return new AzureProvider(config as AzureProviderConfig);
      case 'gcp':
        return new GCPProvider(config as GCPProviderConfig);
      default:
        logger.error(`Unsupported cloud provider type: ${config.type}`);
        throw new Error(`Unsupported cloud provider type: ${config.type}`);
    }
  }
}

// Export a default provider factory
export const cloudProviderFactory = new DefaultCloudProviderFactory();
