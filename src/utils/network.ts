/**
 * Network utilities for detecting connectivity and managing offline mode
 */

import dns from 'dns';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { logger } from './logger.js';
import { performance } from 'perf_hooks';

/**
 * Network status
 */
export enum NetworkStatus {
  /** Network is available */
  ONLINE = 'online',
  /** Network is unavailable */
  OFFLINE = 'offline',
  /** Network is partially available */
  PARTIAL = 'partial',
  /** Network status is unknown */
  UNKNOWN = 'unknown'
}

/**
 * Network check result
 */
export interface NetworkCheckResult {
  /** Network status */
  status: NetworkStatus;
  /** Whether DNS resolution is available */
  dnsAvailable: boolean;
  /** Whether the registry is available */
  registryAvailable: boolean;
  /** Whether the internet is generally available */
  internetAvailable: boolean;
  /** Response time in milliseconds (if available) */
  responseTime?: number;
  /** Error message (if any) */
  error?: string;
  /** Timestamp of the check */
  timestamp: number;
}

/**
 * Network check options
 */
export interface NetworkCheckOptions {
  /** Registry URL to check */
  registry?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Number of retries */
  retries?: number;
  /** Whether to use DNS check */
  useDnsCheck?: boolean;
  /** Whether to use registry check */
  useRegistryCheck?: boolean;
  /** Whether to use internet check */
  useInternetCheck?: boolean;
}

/**
 * Default network check options
 */
const defaultOptions: NetworkCheckOptions = {
  registry: 'https://registry.npmjs.org',
  timeout: 5000,
  retries: 2,
  useDnsCheck: true,
  useRegistryCheck: true,
  useInternetCheck: true
};

/**
 * Network manager for detecting connectivity
 */
export class NetworkManager {
  private options: NetworkCheckOptions;
  private lastCheck: NetworkCheckResult | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: ((status: NetworkCheckResult) => void)[] = [];
  
  /**
   * Create a new network manager
   * @param options Network check options
   */
  constructor(options: NetworkCheckOptions = {}) {
    this.options = { ...defaultOptions, ...options };
  }
  
  /**
   * Check network availability
   * @param options Network check options
   * @returns Network check result
   */
  async checkNetwork(options: NetworkCheckOptions = {}): Promise<NetworkCheckResult> {
    const opts = { ...this.options, ...options };
    const startTime = performance.now();
    
    let dnsAvailable = false;
    let registryAvailable = false;
    let internetAvailable = false;
    let error: string | undefined;
    
    try {
      // Check DNS resolution
      if (opts.useDnsCheck) {
        try {
          dnsAvailable = await this.checkDns(opts.timeout);
        } catch (err) {
          dnsAvailable = false;
          logger.debug(`DNS check failed: ${err}`);
        }
      }
      
      // Check registry availability
      if (opts.useRegistryCheck && opts.registry) {
        try {
          registryAvailable = await this.checkRegistry(opts.registry, opts.timeout, opts.retries);
        } catch (err) {
          registryAvailable = false;
          logger.debug(`Registry check failed: ${err}`);
        }
      }
      
      // Check general internet connectivity
      if (opts.useInternetCheck) {
        try {
          internetAvailable = await this.checkInternet(opts.timeout, opts.retries);
        } catch (err) {
          internetAvailable = false;
          logger.debug(`Internet check failed: ${err}`);
        }
      }
      
      // Determine overall status
      let status: NetworkStatus;
      if (registryAvailable && internetAvailable && dnsAvailable) {
        status = NetworkStatus.ONLINE;
      } else if (!registryAvailable && !internetAvailable && !dnsAvailable) {
        status = NetworkStatus.OFFLINE;
      } else {
        status = NetworkStatus.PARTIAL;
      }
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Create result
      const result: NetworkCheckResult = {
        status,
        dnsAvailable,
        registryAvailable,
        internetAvailable,
        responseTime,
        timestamp: Date.now()
      };
      
      // Update last check
      this.lastCheck = result;
      
      // Notify listeners
      this.notifyListeners(result);
      
      return result;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      
      // Create error result
      const result: NetworkCheckResult = {
        status: NetworkStatus.UNKNOWN,
        dnsAvailable: false,
        registryAvailable: false,
        internetAvailable: false,
        error,
        timestamp: Date.now()
      };
      
      // Update last check
      this.lastCheck = result;
      
      // Notify listeners
      this.notifyListeners(result);
      
      return result;
    }
  }
  
  /**
   * Check DNS resolution
   * @param timeout Timeout in milliseconds
   * @returns True if DNS resolution is available
   */
  private async checkDns(timeout: number = 5000): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      // Set timeout
      const timeoutId = setTimeout(() => {
        reject(new Error('DNS check timed out'));
      }, timeout);
      
      // Check DNS resolution
      dns.lookup('registry.npmjs.org', (err) => {
        clearTimeout(timeoutId);
        
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
  
  /**
   * Check registry availability
   * @param registry Registry URL
   * @param timeout Timeout in milliseconds
   * @param retries Number of retries
   * @returns True if registry is available
   */
  private async checkRegistry(registry: string, timeout: number = 5000, retries: number = 2): Promise<boolean> {
    // Parse URL
    const url = new URL(registry);
    
    // Create request options
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/-/ping',
      method: 'GET',
      timeout
    };
    
    // Try multiple times
    for (let i = 0; i <= retries; i++) {
      try {
        await this.makeRequest(url.protocol === 'https:' ? https : http, options);
        return true;
      } catch (err) {
        if (i === retries) {
          throw err;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return false;
  }
  
  /**
   * Check general internet connectivity
   * @param timeout Timeout in milliseconds
   * @param retries Number of retries
   * @returns True if internet is available
   */
  private async checkInternet(timeout: number = 5000, retries: number = 2): Promise<boolean> {
    // List of reliable endpoints to check
    const endpoints = [
      { protocol: 'https:', hostname: 'www.google.com', path: '/' },
      { protocol: 'https:', hostname: 'www.cloudflare.com', path: '/' },
      { protocol: 'https:', hostname: '1.1.1.1', path: '/' }
    ];
    
    // Try each endpoint
    for (const endpoint of endpoints) {
      try {
        // Create request options
        const options = {
          hostname: endpoint.hostname,
          port: endpoint.protocol === 'https:' ? 443 : 80,
          path: endpoint.path,
          method: 'HEAD',
          timeout
        };
        
        // Try multiple times
        for (let i = 0; i <= retries; i++) {
          try {
            await this.makeRequest(endpoint.protocol === 'https:' ? https : http, options);
            return true;
          } catch (err) {
            if (i === retries) {
              // Try next endpoint
              break;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } catch (err) {
        logger.debug(`Internet check failed for ${endpoint.hostname}: ${err}`);
        // Try next endpoint
      }
    }
    
    // All endpoints failed
    return false;
  }
  
  /**
   * Make an HTTP/HTTPS request
   * @param protocol HTTP or HTTPS module
   * @param options Request options
   * @returns Response data
   */
  private makeRequest(protocol: typeof http | typeof https, options: http.RequestOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = protocol.request(options, (res) => {
        // Check status code
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          reject(new Error(`HTTP error: ${res.statusCode}`));
          return;
        }
        
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve(data);
        });
      });
      
      req.on('error', (err) => {
        reject(err);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
      
      req.end();
    });
  }
  
  /**
   * Start monitoring network status
   * @param interval Check interval in milliseconds
   * @returns This instance for chaining
   */
  startMonitoring(interval: number = 60000): NetworkManager {
    // Stop existing monitoring
    this.stopMonitoring();
    
    // Start new monitoring
    this.checkInterval = setInterval(() => {
      this.checkNetwork().catch(err => {
        logger.debug(`Network monitoring error: ${err}`);
      });
    }, interval);
    
    // Prevent keeping Node.js process alive
    if (this.checkInterval.unref) {
      this.checkInterval.unref();
    }
    
    return this;
  }
  
  /**
   * Stop monitoring network status
   * @returns This instance for chaining
   */
  stopMonitoring(): NetworkManager {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    return this;
  }
  
  /**
   * Add a network status listener
   * @param listener Listener function
   * @returns This instance for chaining
   */
  addListener(listener: (status: NetworkCheckResult) => void): NetworkManager {
    this.listeners.push(listener);
    return this;
  }
  
  /**
   * Remove a network status listener
   * @param listener Listener function
   * @returns This instance for chaining
   */
  removeListener(listener: (status: NetworkCheckResult) => void): NetworkManager {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
    return this;
  }
  
  /**
   * Notify all listeners of a network status change
   * @param status Network status
   */
  private notifyListeners(status: NetworkCheckResult): void {
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch (err) {
        logger.debug(`Error in network status listener: ${err}`);
      }
    }
  }
  
  /**
   * Get the last network check result
   * @returns Last network check result or null if no check has been performed
   */
  getLastCheck(): NetworkCheckResult | null {
    return this.lastCheck;
  }
  
  /**
   * Check if the network is available
   * @param options Network check options
   * @returns True if network is available
   */
  async isNetworkAvailable(options: NetworkCheckOptions = {}): Promise<boolean> {
    const result = await this.checkNetwork(options);
    return result.status === NetworkStatus.ONLINE || result.status === NetworkStatus.PARTIAL;
  }
  
  /**
   * Check if the registry is available
   * @param registry Registry URL
   * @param timeout Timeout in milliseconds
   * @param retries Number of retries
   * @returns True if registry is available
   */
  async isRegistryAvailable(registry?: string, timeout?: number, retries?: number): Promise<boolean> {
    const opts: NetworkCheckOptions = {
      registry: registry || this.options.registry,
      timeout: timeout || this.options.timeout,
      retries: retries || this.options.retries,
      useDnsCheck: false,
      useInternetCheck: false,
      useRegistryCheck: true
    };
    
    const result = await this.checkNetwork(opts);
    return result.registryAvailable;
  }
}

// Export singleton instance
export const networkManager = new NetworkManager();
