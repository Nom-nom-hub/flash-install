import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { logger } from './utils/logger.js';

/**
 * Plugin lifecycle hooks
 */
export enum PluginHook {
  PRE_INSTALL = 'preInstall',
  POST_INSTALL = 'postInstall',
  PRE_SNAPSHOT = 'preSnapshot',
  POST_SNAPSHOT = 'postSnapshot',
  PRE_RESTORE = 'preRestore',
  POST_RESTORE = 'postRestore',
  PRE_SYNC = 'preSync',
  POST_SYNC = 'postSync',
  PRE_CLEAN = 'preClean',
  POST_CLEAN = 'postClean'
}

/**
 * Plugin context
 */
export interface PluginContext {
  projectDir: string;
  dependencies: Record<string, string>;
  nodeModulesPath: string;
  packageManager: string;
  [key: string]: any;
}

/**
 * Plugin interface
 */
export interface Plugin {
  name: string;
  version: string;
  description?: string;
  author?: string;
  hooks: Partial<Record<PluginHook, (context: PluginContext) => Promise<void>>>;
}

/**
 * Plugin manager
 */
export class PluginManager {
  private plugins: Plugin[] = [];
  private pluginsDir: string;

  /**
   * Create a new plugin manager
   */
  constructor() {
    this.pluginsDir = path.join(os.homedir(), '.flash-install', 'plugins');
  }

  /**
   * Initialize the plugin manager
   */
  async init(): Promise<void> {
    await fs.ensureDir(this.pluginsDir);
    await this.loadPlugins();
  }

  /**
   * Load all plugins
   */
  private async loadPlugins(): Promise<void> {
    try {
      const entries = await fs.readdir(this.pluginsDir);
      
      for (const entry of entries) {
        const pluginPath = path.join(this.pluginsDir, entry);
        const stats = await fs.stat(pluginPath);
        
        if (stats.isDirectory()) {
          const pluginFile = path.join(pluginPath, 'index.js');
          
          if (await fs.pathExists(pluginFile)) {
            try {
              const plugin = await import(pluginFile);
              
              if (this.isValidPlugin(plugin.default)) {
                this.plugins.push(plugin.default);
                logger.debug(`Loaded plugin: ${plugin.default.name} v${plugin.default.version}`);
              } else {
                logger.warn(`Invalid plugin: ${entry}`);
              }
            } catch (error) {
              logger.warn(`Failed to load plugin ${entry}: ${error}`);
            }
          }
        }
      }
      
      logger.debug(`Loaded ${this.plugins.length} plugins`);
    } catch (error) {
      logger.warn(`Failed to load plugins: ${error}`);
    }
  }

  /**
   * Check if a plugin is valid
   * @param plugin The plugin to check
   * @returns Whether the plugin is valid
   */
  private isValidPlugin(plugin: any): plugin is Plugin {
    return (
      plugin &&
      typeof plugin.name === 'string' &&
      typeof plugin.version === 'string' &&
      typeof plugin.hooks === 'object'
    );
  }

  /**
   * Run a hook
   * @param hook The hook to run
   * @param context The context to pass to the hook
   */
  async runHook(hook: PluginHook, context: PluginContext): Promise<void> {
    for (const plugin of this.plugins) {
      const hookFn = plugin.hooks[hook];
      
      if (hookFn) {
        try {
          logger.debug(`Running ${hook} hook for ${plugin.name}`);
          await hookFn(context);
        } catch (error) {
          logger.warn(`Plugin ${plugin.name} failed on ${hook} hook: ${error}`);
        }
      }
    }
  }

  /**
   * Add a plugin
   * @param pluginPath Path to the plugin
   * @returns Whether the plugin was added successfully
   */
  async addPlugin(pluginPath: string): Promise<boolean> {
    try {
      // Check if path exists
      if (!await fs.pathExists(pluginPath)) {
        logger.error(`Plugin path not found: ${pluginPath}`);
        return false;
      }
      
      // Load plugin
      const plugin = await import(pluginPath);
      
      if (!this.isValidPlugin(plugin.default)) {
        logger.error('Invalid plugin format');
        return false;
      }
      
      // Create plugin directory
      const pluginDir = path.join(this.pluginsDir, plugin.default.name);
      await fs.ensureDir(pluginDir);
      
      // Copy plugin files
      if (await fs.stat(pluginPath).then(stats => stats.isDirectory())) {
        await fs.copy(pluginPath, pluginDir);
      } else {
        const pluginFile = path.join(pluginDir, 'index.js');
        await fs.copy(pluginPath, pluginFile);
      }
      
      // Reload plugins
      await this.loadPlugins();
      
      logger.success(`Added plugin: ${plugin.default.name} v${plugin.default.version}`);
      return true;
    } catch (error) {
      logger.error(`Failed to add plugin: ${error}`);
      return false;
    }
  }

  /**
   * Remove a plugin
   * @param pluginName The name of the plugin to remove
   * @returns Whether the plugin was removed successfully
   */
  async removePlugin(pluginName: string): Promise<boolean> {
    try {
      const pluginDir = path.join(this.pluginsDir, pluginName);
      
      if (!await fs.pathExists(pluginDir)) {
        logger.error(`Plugin not found: ${pluginName}`);
        return false;
      }
      
      await fs.remove(pluginDir);
      
      // Reload plugins
      this.plugins = this.plugins.filter(p => p.name !== pluginName);
      
      logger.success(`Removed plugin: ${pluginName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to remove plugin: ${error}`);
      return false;
    }
  }

  /**
   * List all plugins
   * @returns List of plugins
   */
  listPlugins(): Plugin[] {
    return this.plugins;
  }
}

// Export a default plugin manager instance
export const pluginManager = new PluginManager();
