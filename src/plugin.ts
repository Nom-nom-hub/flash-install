import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { logger } from './utils/logger.js';

/**
 * Plugin lifecycle hooks
 */
export enum PluginHook {
  // Installation hooks
  PRE_INSTALL = 'preInstall',
  POST_INSTALL = 'postInstall',
  PRE_PACKAGE_INSTALL = 'prePackageInstall',
  POST_PACKAGE_INSTALL = 'postPackageInstall',
  PACKAGE_ERROR = 'packageError',

  // Snapshot hooks
  PRE_SNAPSHOT = 'preSnapshot',
  POST_SNAPSHOT = 'postSnapshot',

  // Restore hooks
  PRE_RESTORE = 'preRestore',
  POST_RESTORE = 'postRestore',

  // Sync hooks
  PRE_SYNC = 'preSync',
  POST_SYNC = 'postSync',

  // Clean hooks
  PRE_CLEAN = 'preClean',
  POST_CLEAN = 'postClean',

  // Dependency resolution hooks
  PRE_DEPENDENCY_RESOLUTION = 'preDependencyResolution',
  POST_DEPENDENCY_RESOLUTION = 'postDependencyResolution',
  DEPENDENCY_RESOLUTION_ERROR = 'dependencyResolutionError',

  // Network hooks
  PRE_DOWNLOAD = 'preDownload',
  POST_DOWNLOAD = 'postDownload',
  DOWNLOAD_ERROR = 'downloadError',
  NETWORK_CHECK = 'networkCheck',

  // Cache hooks
  PRE_CACHE_READ = 'preCacheRead',
  POST_CACHE_READ = 'postCacheRead',
  PRE_CACHE_WRITE = 'preCacheWrite',
  POST_CACHE_WRITE = 'postCacheWrite',

  // Configuration hooks
  CONFIG_LOADED = 'configLoaded',
  CONFIG_CHANGED = 'configChanged'
}

/**
 * Plugin context
 */
export interface PluginContext {
  // Project information
  projectDir: string;
  nodeModulesPath: string;
  packageJson?: Record<string, any>;

  // Dependencies
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;

  // Package manager
  packageManager: string;
  packageManagerVersion?: string;

  // Installation options
  options?: {
    cache?: boolean;
    offline?: boolean;
    registry?: string;
    workspaces?: boolean;
    [key: string]: any;
  };

  // Current operation
  operation?: string;
  currentPackage?: {
    name: string;
    version: string;
    path?: string;
  };

  // Cache information
  cacheDir?: string;
  cacheEnabled?: boolean;

  // Network information
  networkAvailable?: boolean;

  // Cloud cache information
  cloudCache?: {
    enabled: boolean;
    provider?: string;
    teamId?: string;
  };

  // Additional data
  [key: string]: any;
}

/**
 * Plugin interface
 */
export interface Plugin {
  // Basic metadata
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  license?: string;

  // Plugin hooks
  hooks: Partial<Record<PluginHook, (context: PluginContext) => Promise<void>>>;

  // Plugin configuration
  config?: {
    enabled?: boolean;
    priority?: number;
    [key: string]: any;
  };

  // Plugin dependencies
  dependencies?: string[];

  // Plugin initialization and cleanup
  init?: (context: PluginContext) => Promise<void>;
  cleanup?: (context: PluginContext) => Promise<void>;
}

/**
 * Plugin source
 */
export enum PluginSource {
  GLOBAL = 'global',
  LOCAL = 'local',
  NODE_MODULES = 'node_modules',
  REGISTRY = 'registry'
}

/**
 * Plugin manager
 */
export class PluginManager {
  private plugins: Plugin[] = [];
  private globalPluginsDir: string;
  private projectDir: string = process.cwd();
  private initialized: boolean = false;
  private pluginSources: Map<string, PluginSource> = new Map();
  private pluginDependencies: Map<string, string[]> = new Map();
  private pluginRegistry: string = 'https://registry.npmjs.org';

  /**
   * Create a new plugin manager
   */
  constructor() {
    this.globalPluginsDir = path.join(os.homedir(), '.flash-install', 'plugins');
  }

  /**
   * Initialize the plugin manager
   * @param projectDir Project directory
   */
  async init(projectDir?: string): Promise<void> {
    if (this.initialized) {
      logger.debug(`Plugin manager already initialized for ${this.projectDir}`);
      return;
    }

    if (projectDir) {
      this.projectDir = projectDir;
    }

    logger.debug(`Initializing plugin manager for project: ${this.projectDir}`);

    // Ensure global plugins directory exists
    await fs.ensureDir(this.globalPluginsDir);
    logger.debug(`Global plugins directory: ${this.globalPluginsDir}`);

    // Load plugins from all sources
    await this.discoverAndLoadPlugins();

    this.initialized = true;
    logger.debug(`Plugin manager initialized with ${this.plugins.length} plugins`);
  }

  /**
   * Discover and load plugins from all sources
   */
  private async discoverAndLoadPlugins(): Promise<void> {
    try {
      // Clear existing plugins
      this.plugins = [];
      this.pluginSources.clear();
      this.pluginDependencies.clear();

      // Discover plugins from all sources
      const discoveredPlugins = await this.discoverPlugins();

      // Sort plugins by priority
      discoveredPlugins.sort((a, b) => {
        const priorityA = a.plugin.config?.priority || 0;
        const priorityB = b.plugin.config?.priority || 0;
        return priorityB - priorityA; // Higher priority first
      });

      // Load plugins in order
      for (const { plugin, source, path: pluginPath } of discoveredPlugins) {
        // Skip disabled plugins
        if (plugin.config?.enabled === false) {
          logger.debug(`Skipping disabled plugin: ${plugin.name}`);
          continue;
        }

        // Check plugin dependencies
        if (plugin.dependencies && plugin.dependencies.length > 0) {
          this.pluginDependencies.set(plugin.name, plugin.dependencies);
        }

        // Add plugin to list
        this.plugins.push(plugin);
        this.pluginSources.set(plugin.name, source);

        logger.debug(`Loaded plugin: ${plugin.name} v${plugin.version} from ${source}`);
      }

      // Check plugin dependencies
      this.checkPluginDependencies();

      // Initialize plugins
      await this.initializePlugins();

      logger.debug(`Loaded ${this.plugins.length} plugins`);
    } catch (error) {
      logger.warn(`Failed to discover and load plugins: ${error}`);
    }
  }

  /**
   * Discover plugins from all sources
   */
  private async discoverPlugins(): Promise<Array<{ plugin: Plugin; source: PluginSource; path: string }>> {
    const discoveredPlugins: Array<{ plugin: Plugin; source: PluginSource; path: string }> = [];

    // 1. Discover global plugins
    const globalPlugins = await this.discoverGlobalPlugins();
    discoveredPlugins.push(...globalPlugins);

    // 2. Discover local project plugins
    const localPlugins = await this.discoverLocalPlugins();
    discoveredPlugins.push(...localPlugins);

    // 3. Discover plugins from node_modules
    const nodeModulesPlugins = await this.discoverNodeModulesPlugins();
    discoveredPlugins.push(...nodeModulesPlugins);

    return discoveredPlugins;
  }

  /**
   * Discover global plugins
   */
  private async discoverGlobalPlugins(): Promise<Array<{ plugin: Plugin; source: PluginSource; path: string }>> {
    const discoveredPlugins: Array<{ plugin: Plugin; source: PluginSource; path: string }> = [];

    try {
      const entries = await fs.readdir(this.globalPluginsDir);

      for (const entry of entries) {
        const pluginPath = path.join(this.globalPluginsDir, entry);
        const stats = await fs.stat(pluginPath);

        if (stats.isDirectory()) {
          const pluginFile = path.join(pluginPath, 'index.js');

          if (await fs.pathExists(pluginFile)) {
            try {
              const plugin = await import(this.toFileUrlIfNeeded(pluginFile));

              if (this.isValidPlugin(plugin.default)) {
                discoveredPlugins.push({
                  plugin: plugin.default,
                  source: PluginSource.GLOBAL,
                  path: pluginPath
                });
              } else {
                logger.warn(`Invalid global plugin: ${entry}`);
              }
            } catch (error) {
              logger.warn(`Failed to load global plugin ${entry}: ${error}`);
            }
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to discover global plugins: ${error}`);
    }

    return discoveredPlugins;
  }

  /**
   * Discover local project plugins
   */
  private async discoverLocalPlugins(): Promise<Array<{ plugin: Plugin; source: PluginSource; path: string }>> {
    const discoveredPlugins: Array<{ plugin: Plugin; source: PluginSource; path: string }> = [];

    try {
      // 1. Check for .flash-plugins directory in current project
      await this.discoverPluginsFromDir(path.join(this.projectDir, '.flash-plugins'), discoveredPlugins);

      // 2. Check for .flash-plugins directory in parent directory (for subprojects)
      const parentDir = path.dirname(this.projectDir);
      if (parentDir !== this.projectDir) { // Avoid infinite loop at root
        await this.discoverPluginsFromDir(path.join(parentDir, '.flash-plugins'), discoveredPlugins);
      }
    } catch (error) {
      logger.warn(`Failed to discover local plugins: ${error}`);
    }

    return discoveredPlugins;
  }

  /**
   * Discover plugins from a directory
   * @param localPluginsDir Directory to search for plugins
   * @param discoveredPlugins Array to add discovered plugins to
   */
  private async discoverPluginsFromDir(
    localPluginsDir: string,
    discoveredPlugins: Array<{ plugin: Plugin; source: PluginSource; path: string }>
  ): Promise<void> {
    if (await fs.pathExists(localPluginsDir)) {
      const entries = await fs.readdir(localPluginsDir);

      for (const entry of entries) {
        // Skip hidden files
        if (entry.startsWith('.')) {
          continue;
        }

        const pluginPath = path.join(localPluginsDir, entry);
        const stats = await fs.stat(pluginPath);

        if (stats.isDirectory() || entry.endsWith('.js')) {
          const pluginFile = stats.isDirectory()
            ? path.join(pluginPath, 'index.js')
            : pluginPath;

          if (await fs.pathExists(pluginFile)) {
            try {
              const plugin = await import(this.toFileUrlIfNeeded(pluginFile));

              if (this.isValidPlugin(plugin.default)) {
                discoveredPlugins.push({
                  plugin: plugin.default,
                  source: PluginSource.LOCAL,
                  path: pluginPath
                });
                logger.debug(`Discovered local plugin: ${plugin.default.name} at ${pluginPath}`);
              } else {
                logger.warn(`Invalid local plugin: ${entry}`);
              }
            } catch (error) {
              logger.warn(`Failed to load local plugin ${entry}: ${error}`);
            }
          }
        }
      }
    }

    // 3. Check for plugins in package.json
    try {
      const packageJsonPath = path.join(this.projectDir, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

        if (packageJson['flash-install'] && packageJson['flash-install'].plugins) {
          const pluginPaths = packageJson['flash-install'].plugins;

          for (const pluginPath of pluginPaths) {
            const resolvedPath = path.resolve(this.projectDir, pluginPath);

            if (await fs.pathExists(resolvedPath)) {
              try {
                const plugin = await import(this.toFileUrlIfNeeded(resolvedPath));

                if (this.isValidPlugin(plugin.default)) {
                  discoveredPlugins.push({
                    plugin: plugin.default,
                    source: PluginSource.LOCAL,
                    path: resolvedPath
                  });
                  logger.debug(`Discovered package.json plugin: ${plugin.default.name} at ${resolvedPath}`);
                } else {
                  logger.warn(`Invalid package.json plugin: ${pluginPath}`);
                }
              } catch (error) {
                logger.warn(`Failed to load package.json plugin ${pluginPath}: ${error}`);
              }
            } else {
              logger.warn(`Plugin path not found: ${resolvedPath}`);
            }
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to discover plugins from package.json: ${error}`);
    }
  }

  /**
   * Discover plugins from node_modules
   */
  private async discoverNodeModulesPlugins(): Promise<Array<{ plugin: Plugin; source: PluginSource; path: string }>> {
    const discoveredPlugins: Array<{ plugin: Plugin; source: PluginSource; path: string }> = [];

    try {
      const nodeModulesPath = path.join(this.projectDir, 'node_modules');
      if (!await fs.pathExists(nodeModulesPath)) {
        return discoveredPlugins;
      }

      // 1. Discover plugins with naming pattern flash-plugin-*
      const entries = await fs.readdir(nodeModulesPath);

      for (const entry of entries) {
        // Skip hidden directories and non-plugin packages
        if (entry.startsWith('.') || (!entry.startsWith('flash-plugin-') && !entry.startsWith('@'))) {
          continue;
        }

        if (entry.startsWith('@')) {
          // Handle scoped packages
          const scopePath = path.join(nodeModulesPath, entry);
          const scopedEntries = await fs.readdir(scopePath);

          for (const scopedEntry of scopedEntries) {
            if (scopedEntry.startsWith('flash-plugin-')) {
              const pluginPath = path.join(scopePath, scopedEntry);
              const plugin = await this.loadNodeModulePlugin(pluginPath, `${entry}/${scopedEntry}`);

              if (plugin) {
                discoveredPlugins.push({
                  plugin,
                  source: PluginSource.NODE_MODULES,
                  path: pluginPath
                });
              }
            }
          }
        } else if (entry.startsWith('flash-plugin-')) {
          // Handle regular packages
          const pluginPath = path.join(nodeModulesPath, entry);
          const plugin = await this.loadNodeModulePlugin(pluginPath, entry);

          if (plugin) {
            discoveredPlugins.push({
              plugin,
              source: PluginSource.NODE_MODULES,
              path: pluginPath
            });
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to discover node_modules plugins: ${error}`);
    }

    return discoveredPlugins;
  }

  /**
   * Load a plugin from node_modules
   */
  private async loadNodeModulePlugin(pluginPath: string, packageName: string): Promise<Plugin | null> {
    try {
      // Check if package.json exists
      const packageJsonPath = path.join(pluginPath, 'package.json');
      if (!await fs.pathExists(packageJsonPath)) {
        return null;
      }

      // Read package.json
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

      // Check if main file exists
      const mainFile = packageJson.main || 'index.js';
      const mainFilePath = path.join(pluginPath, mainFile);

      if (!await fs.pathExists(mainFilePath)) {
        logger.warn(`Main file not found for plugin ${packageName}: ${mainFilePath}`);
        return null;
      }

      // Load plugin
      const plugin = await import(this.toFileUrlIfNeeded(mainFilePath));

      if (this.isValidPlugin(plugin.default)) {
        return plugin.default;
      } else {
        logger.warn(`Invalid node_modules plugin: ${packageName}`);
        return null;
      }
    } catch (error) {
      logger.warn(`Failed to load node_modules plugin ${packageName}: ${error}`);
      return null;
    }
  }

  /**
   * Check plugin dependencies
   */
  private checkPluginDependencies(): void {
    const loadedPlugins = new Set(this.plugins.map(p => p.name));
    const missingDependencies: Record<string, string[]> = {};

    // Check each plugin's dependencies
    for (const [pluginName, dependencies] of this.pluginDependencies.entries()) {
      const missing = dependencies.filter(dep => !loadedPlugins.has(dep));

      if (missing.length > 0) {
        missingDependencies[pluginName] = missing;
        logger.warn(`Plugin ${pluginName} has missing dependencies: ${missing.join(', ')}`);
      }
    }

    // Disable plugins with missing dependencies
    for (const [pluginName, missing] of Object.entries(missingDependencies)) {
      const plugin = this.plugins.find(p => p.name === pluginName);

      if (plugin && plugin.config) {
        plugin.config.enabled = false;
        logger.warn(`Disabled plugin ${pluginName} due to missing dependencies: ${missing.join(', ')}`);
      }
    }
  }

  /**
   * Initialize plugins
   */
  private async initializePlugins(): Promise<void> {
    const context: PluginContext = {
      projectDir: this.projectDir,
      nodeModulesPath: path.join(this.projectDir, 'node_modules'),
      dependencies: {},
      packageManager: 'npm'
    };

    for (const plugin of this.plugins) {
      if (plugin.init) {
        try {
          await plugin.init(context);
          logger.debug(`Initialized plugin: ${plugin.name}`);
        } catch (error) {
          logger.warn(`Failed to initialize plugin ${plugin.name}: ${error}`);

          // Disable plugin on initialization failure
          if (plugin.config) {
            plugin.config.enabled = false;
          }
        }
      }
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
    if (!this.initialized) {
      await this.init();
    }

    // Filter out disabled plugins
    const enabledPlugins = this.plugins.filter(p => p.config?.enabled !== false);

    for (const plugin of enabledPlugins) {
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
   * @param options Plugin installation options
   * @returns Whether the plugin was added successfully
   */
  async addPlugin(
    pluginPath: string,
    options: {
      global?: boolean;
      force?: boolean;
      enabled?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      // Check if path exists
      if (!await fs.pathExists(pluginPath)) {
        logger.error(`Plugin path not found: ${pluginPath}`);
        return false;
      }

      // Load plugin
      const plugin = await import(this.toFileUrlIfNeeded(pluginPath));

      if (!this.isValidPlugin(plugin.default)) {
        logger.error('Invalid plugin format');
        return false;
      }

      // Determine target directory
      const targetDir = options.global
        ? path.join(this.globalPluginsDir, plugin.default.name)
        : path.join(this.projectDir, '.flash-plugins', plugin.default.name);

      // Check if plugin already exists
      if (await fs.pathExists(targetDir) && !options.force) {
        logger.error(`Plugin ${plugin.default.name} already exists. Use --force to overwrite.`);
        return false;
      }

      // Create plugin directory
      await fs.ensureDir(targetDir);

      // Copy plugin files
      if (await fs.stat(pluginPath).then(stats => stats.isDirectory())) {
        await fs.copy(pluginPath, targetDir);
      } else {
        const pluginFile = path.join(targetDir, 'index.js');
        await fs.copy(pluginPath, pluginFile);
      }

      // Update plugin configuration
      if (options.enabled !== undefined) {
        const configPath = path.join(targetDir, 'config.json');
        const config = {
          enabled: options.enabled
        };
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      }

      // Reload plugins
      await this.discoverAndLoadPlugins();

      logger.success(`Added plugin: ${plugin.default.name} v${plugin.default.version} ${options.global ? '(global)' : '(local)'}`);
      return true;
    } catch (error) {
      logger.error(`Failed to add plugin: ${error}`);
      return false;
    }
  }

  /**
   * Remove a plugin
   * @param pluginName The name of the plugin to remove
   * @param options Plugin removal options
   * @returns Whether the plugin was removed successfully
   */
  async removePlugin(
    pluginName: string,
    options: {
      global?: boolean;
      force?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      // Determine plugin source
      const source = this.pluginSources.get(pluginName);

      if (!source) {
        logger.error(`Plugin not found: ${pluginName}`);
        return false;
      }

      // Check if plugin can be removed
      if (source === PluginSource.NODE_MODULES && !options.force) {
        logger.error(`Cannot remove node_modules plugin: ${pluginName}. Use --force to remove anyway.`);
        return false;
      }

      // Determine plugin directory
      let pluginDir: string;

      if (options.global || source === PluginSource.GLOBAL) {
        pluginDir = path.join(this.globalPluginsDir, pluginName);
      } else if (source === PluginSource.LOCAL) {
        pluginDir = path.join(this.projectDir, '.flash-plugins', pluginName);
      } else {
        logger.error(`Cannot determine plugin directory for ${pluginName}`);
        return false;
      }

      // Check if directory exists
      if (!await fs.pathExists(pluginDir)) {
        logger.error(`Plugin directory not found: ${pluginDir}`);
        return false;
      }

      // Run cleanup function if available
      const plugin = this.plugins.find(p => p.name === pluginName);
      if (plugin && plugin.cleanup) {
        try {
          const context: PluginContext = {
            projectDir: this.projectDir,
            nodeModulesPath: path.join(this.projectDir, 'node_modules'),
            dependencies: {},
            packageManager: 'npm'
          };

          await plugin.cleanup(context);
          logger.debug(`Cleaned up plugin: ${pluginName}`);
        } catch (error) {
          logger.warn(`Failed to clean up plugin ${pluginName}: ${error}`);
        }
      }

      // Remove plugin directory
      await fs.remove(pluginDir);

      // Update plugin list
      this.plugins = this.plugins.filter(p => p.name !== pluginName);
      this.pluginSources.delete(pluginName);
      this.pluginDependencies.delete(pluginName);

      logger.success(`Removed plugin: ${pluginName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to remove plugin: ${error}`);
      return false;
    }
  }

  /**
   * List all plugins
   * @param options List options
   * @returns List of plugins with additional information
   */
  listPlugins(
    options: {
      showDisabled?: boolean;
      source?: PluginSource;
      detailed?: boolean;
    } = {}
  ): Array<Plugin & { source?: PluginSource; enabled?: boolean }> {
    // Filter plugins
    let filteredPlugins = [...this.plugins];

    if (!options.showDisabled) {
      filteredPlugins = filteredPlugins.filter(p => p.config?.enabled !== false);
    }

    if (options.source) {
      filteredPlugins = filteredPlugins.filter(p => this.pluginSources.get(p.name) === options.source);
    }

    // Add additional information
    return filteredPlugins.map(plugin => {
      const result = { ...plugin };

      if (options.detailed) {
        (result as any).source = this.pluginSources.get(plugin.name);
        (result as any).enabled = plugin.config?.enabled !== false;
        (result as any).dependencies = this.pluginDependencies.get(plugin.name) || [];
      }

      return result;
    });
  }

  /**
   * Get plugin information
   * @param pluginName Plugin name
   * @returns Plugin information or null if not found
   */
  getPlugin(pluginName: string): (Plugin & { source: PluginSource; enabled: boolean }) | null {
    const plugin = this.plugins.find(p => p.name === pluginName);

    if (!plugin) {
      return null;
    }

    return {
      ...plugin,
      source: this.pluginSources.get(pluginName) || PluginSource.GLOBAL,
      enabled: plugin.config?.enabled !== false
    };
  }

  /**
   * Enable a plugin
   * @param pluginName Plugin name
   * @returns Whether the plugin was enabled successfully
   */
  async enablePlugin(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.find(p => p.name === pluginName);

    if (!plugin) {
      logger.error(`Plugin not found: ${pluginName}`);
      return false;
    }

    if (!plugin.config) {
      plugin.config = {};
    }

    plugin.config.enabled = true;

    // Update plugin configuration file
    const source = this.pluginSources.get(pluginName);
    if (source === PluginSource.GLOBAL || source === PluginSource.LOCAL) {
      const configDir = source === PluginSource.GLOBAL
        ? path.join(this.globalPluginsDir, pluginName)
        : path.join(this.projectDir, '.flash-plugins', pluginName);

      const configPath = path.join(configDir, 'config.json');

      try {
        await fs.writeFile(configPath, JSON.stringify({ enabled: true }, null, 2));
        logger.success(`Enabled plugin: ${pluginName}`);
        return true;
      } catch (error) {
        logger.error(`Failed to update plugin configuration: ${error}`);
        return false;
      }
    }

    logger.success(`Enabled plugin: ${pluginName}`);
    return true;
  }

  /**
   * Disable a plugin
   * @param pluginName Plugin name
   * @returns Whether the plugin was disabled successfully
   */
  async disablePlugin(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.find(p => p.name === pluginName);

    if (!plugin) {
      logger.error(`Plugin not found: ${pluginName}`);
      return false;
    }

    if (!plugin.config) {
      plugin.config = {};
    }

    plugin.config.enabled = false;

    // Update plugin configuration file
    const source = this.pluginSources.get(pluginName);
    if (source === PluginSource.GLOBAL || source === PluginSource.LOCAL) {
      const configDir = source === PluginSource.GLOBAL
        ? path.join(this.globalPluginsDir, pluginName)
        : path.join(this.projectDir, '.flash-plugins', pluginName);

      const configPath = path.join(configDir, 'config.json');

      try {
        await fs.writeFile(configPath, JSON.stringify({ enabled: false }, null, 2));
        logger.success(`Disabled plugin: ${pluginName}`);
        return true;
      } catch (error) {
        logger.error(`Failed to update plugin configuration: ${error}`);
        return false;
      }
    }

    logger.success(`Disabled plugin: ${pluginName}`);
    return true;
  }

  /**
   * Install a plugin from npm
   * @param packageName Plugin package name
   * @param options Plugin installation options
   * @returns Whether the plugin was installed successfully
   */
  async installPlugin(
    packageName: string,
    options: {
      global?: boolean;
      version?: string;
      registry?: string;
    } = {}
  ): Promise<boolean> {
    try {
      // Validate package name
      if (!packageName.startsWith('flash-plugin-') && !packageName.match(/@[\w-]+\/flash-plugin-/)) {
        logger.error(`Invalid plugin package name: ${packageName}. Plugin packages must start with 'flash-plugin-' or '@scope/flash-plugin-'`);
        return false;
      }

      // Create temporary directory
      const tempDir = path.join(os.tmpdir(), `flash-install-plugin-${Date.now()}`);
      await fs.ensureDir(tempDir);

      try {
        // Create package.json
        const packageJson = {
          name: 'temp-plugin-installer',
          version: '1.0.0',
          private: true
        };
        await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

        // Install plugin package
        const versionSuffix = options.version ? `@${options.version}` : '';
        const registryArg = options.registry ? `--registry=${options.registry}` : '';
        const command = `npm install ${packageName}${versionSuffix} ${registryArg}`;

        logger.info(`Installing plugin package: ${packageName}${versionSuffix}`);

        try {
          const { execSync } = await import('child_process');
          execSync(command, { cwd: tempDir, stdio: 'inherit' });
        } catch (error) {
          logger.error(`Failed to install plugin package: ${error}`);
          return false;
        }

        // Get plugin path
        const pluginPath = path.join(tempDir, 'node_modules', packageName);

        if (!await fs.pathExists(pluginPath)) {
          logger.error(`Plugin package not found after installation: ${packageName}`);
          return false;
        }

        // Add plugin
        const success = await this.addPlugin(pluginPath, {
          global: options.global,
          force: true
        });

        return success;
      } finally {
        // Clean up temporary directory
        await fs.remove(tempDir);
      }
    } catch (error) {
      logger.error(`Failed to install plugin: ${error}`);
      return false;
    }
  }

  /**
   * Search for plugins in the registry
   * @param query Search query
   * @param options Search options
   * @returns List of matching plugins
   */
  async searchPlugins(
    query: string,
    options: {
      limit?: number;
      registry?: string;
    } = {}
  ): Promise<any[]> {
    try {
      const registry = options.registry || this.pluginRegistry;
      const limit = options.limit || 20;

      // Use npm search API
      const searchUrl = `${registry}/-/v1/search?text=flash-plugin-+${encodeURIComponent(query)}&size=${limit}`;

      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new Error(`Failed to search plugins: ${response.statusText}`);
      }

      const data = await response.json();

      // Filter and format results
      return data.objects
        .filter((obj: any) => {
          const name = obj.package.name;
          return name.startsWith('flash-plugin-') || name.match(/@[\w-]+\/flash-plugin-/);
        })
        .map((obj: any) => ({
          name: obj.package.name,
          version: obj.package.version,
          description: obj.package.description,
          author: obj.package.author?.name || obj.package.publisher?.username,
          date: obj.package.date,
          links: obj.package.links
        }));
    } catch (error) {
      logger.error(`Failed to search plugins: ${error}`);
      return [];
    }
  }

  /**
   * Clean up plugins
   */
  async cleanup(): Promise<void> {
    // Run cleanup function for each plugin
    for (const plugin of this.plugins) {
      if (plugin.cleanup) {
        try {
          const context: PluginContext = {
            projectDir: this.projectDir,
            nodeModulesPath: path.join(this.projectDir, 'node_modules'),
            dependencies: {},
            packageManager: 'npm'
          };

          await plugin.cleanup(context);
          logger.debug(`Cleaned up plugin: ${plugin.name}`);
        } catch (error) {
          logger.warn(`Failed to clean up plugin ${plugin.name}: ${error}`);
        }
      }
    }
  }

  // Helper to convert a path to a file:// URL for ESM import on Windows
  private toFileUrlIfNeeded(p: string): string {
    if (process.platform === 'win32' && !p.startsWith('file://')) {
      // Replace backslashes with forward slashes and encode spaces
      let pathName = p.replace(/\\/g, '/');
      // Handle drive letter
      if (!pathName.startsWith('/')) {
        pathName = '/' + pathName;
      }
      return 'file://' + pathName;
    }
    return p;
  }
}

// Export a default plugin manager instance
export const pluginManager = new PluginManager();
