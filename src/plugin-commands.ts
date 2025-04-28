import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import { pluginManager, PluginSource } from './plugin.js';
import { logger } from './utils/logger.js';

/**
 * Register plugin commands
 * @param program Commander program
 */
export function registerPluginCommands(program: Command): void {
  // Plugin commands
  const pluginCommand = program
    .command('plugin')
    .description('Manage plugins');

  pluginCommand
    .command('add')
    .description('Add a plugin')
    .argument('<path>', 'Path to plugin')
    .option('-g, --global', 'Install plugin globally', false)
    .option('-f, --force', 'Force installation even if plugin already exists', false)
    .option('--disable', 'Disable plugin after installation', false)
    .action(async (pluginPath, options) => {
      try {
        await pluginManager.init();
        const success = await pluginManager.addPlugin(path.resolve(pluginPath), {
          global: options.global,
          force: options.force,
          enabled: !options.disable
        });

        if (!success) {
          process.exit(1);
        }
      } catch (error) {
        logger.error(`Failed to add plugin: ${error}`);
        process.exit(1);
      }
    });

  pluginCommand
    .command('remove')
    .description('Remove a plugin')
    .argument('<name>', 'Plugin name')
    .option('-g, --global', 'Remove global plugin', false)
    .option('-f, --force', 'Force removal even for node_modules plugins', false)
    .action(async (pluginName, options) => {
      try {
        await pluginManager.init();
        const success = await pluginManager.removePlugin(pluginName, {
          global: options.global,
          force: options.force
        });

        if (!success) {
          process.exit(1);
        }
      } catch (error) {
        logger.error(`Failed to remove plugin: ${error}`);
        process.exit(1);
      }
    });

  pluginCommand
    .command('list')
    .description('List installed plugins')
    .option('--all', 'Show all plugins including disabled ones', false)
    .option('--global', 'Show only global plugins', false)
    .option('--local', 'Show only local plugins', false)
    .option('--node-modules', 'Show only node_modules plugins', false)
    .option('--detailed', 'Show detailed plugin information', false)
    .action(async (options) => {
      try {
        await pluginManager.init();
        
        // Determine source filter
        let sourceFilter: PluginSource | undefined;
        if (options.global) {
          sourceFilter = PluginSource.GLOBAL;
        } else if (options.local) {
          sourceFilter = PluginSource.LOCAL;
        } else if (options.nodeModules) {
          sourceFilter = PluginSource.NODE_MODULES;
        }
        
        const plugins = pluginManager.listPlugins({
          showDisabled: options.all,
          source: sourceFilter,
          detailed: options.detailed
        });

        console.log(chalk.cyan('\n⚡ Flash Install Plugins\n'));

        if (plugins.length === 0) {
          console.log('No plugins installed');
        } else {
          for (const plugin of plugins) {
            // Get plugin source and enabled status
            const source = (plugin as any).source || 'unknown';
            const enabled = (plugin as any).enabled !== false;
            const statusIndicator = enabled ? chalk.green('✓') : chalk.red('✗');
            
            console.log(`${statusIndicator} ${chalk.bold(plugin.name)} v${plugin.version} ${chalk.gray(`[${source}]`)}`);

            if (plugin.description) {
              console.log(`  ${plugin.description}`);
            }

            if (plugin.author) {
              console.log(`  Author: ${plugin.author}`);
            }
            
            if (options.detailed) {
              if (plugin.homepage) {
                console.log(`  Homepage: ${plugin.homepage}`);
              }
              
              if (plugin.repository) {
                console.log(`  Repository: ${plugin.repository}`);
              }
              
              if (plugin.license) {
                console.log(`  License: ${plugin.license}`);
              }
              
              const dependencies = (plugin as any).dependencies || [];
              if (dependencies.length > 0) {
                console.log(`  Dependencies: ${dependencies.join(', ')}`);
              }
              
              // Show available hooks
              const hooks = Object.keys(plugin.hooks);
              if (hooks.length > 0) {
                console.log(`  Hooks: ${hooks.join(', ')}`);
              }
            }

            console.log('');
          }
          
          console.log(`Total: ${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}`);
        }
      } catch (error) {
        logger.error(`Failed to list plugins: ${error}`);
        process.exit(1);
      }
    });

  pluginCommand
    .command('enable')
    .description('Enable a plugin')
    .argument('<name>', 'Plugin name')
    .action(async (pluginName) => {
      try {
        await pluginManager.init();
        const success = await pluginManager.enablePlugin(pluginName);

        if (!success) {
          process.exit(1);
        }
      } catch (error) {
        logger.error(`Failed to enable plugin: ${error}`);
        process.exit(1);
      }
    });

  pluginCommand
    .command('disable')
    .description('Disable a plugin')
    .argument('<name>', 'Plugin name')
    .action(async (pluginName) => {
      try {
        await pluginManager.init();
        const success = await pluginManager.disablePlugin(pluginName);

        if (!success) {
          process.exit(1);
        }
      } catch (error) {
        logger.error(`Failed to disable plugin: ${error}`);
        process.exit(1);
      }
    });

  pluginCommand
    .command('install')
    .description('Install a plugin from npm')
    .argument('<name>', 'Plugin package name')
    .option('-g, --global', 'Install plugin globally', false)
    .option('-v, --version <version>', 'Specific version to install')
    .option('-r, --registry <url>', 'Specify npm registry URL')
    .action(async (packageName, options) => {
      try {
        await pluginManager.init();
        const success = await pluginManager.installPlugin(packageName, {
          global: options.global,
          version: options.version,
          registry: options.registry
        });

        if (!success) {
          process.exit(1);
        }
      } catch (error) {
        logger.error(`Failed to install plugin: ${error}`);
        process.exit(1);
      }
    });

  pluginCommand
    .command('search')
    .description('Search for plugins in the registry')
    .argument('<query>', 'Search query')
    .option('-l, --limit <n>', 'Maximum number of results', '20')
    .option('-r, --registry <url>', 'Specify npm registry URL')
    .action(async (query, options) => {
      try {
        await pluginManager.init();
        const results = await pluginManager.searchPlugins(query, {
          limit: parseInt(options.limit, 10),
          registry: options.registry
        });

        console.log(chalk.cyan(`\n⚡ Flash Install Plugin Search: "${query}"\n`));

        if (results.length === 0) {
          console.log('No plugins found');
        } else {
          for (const plugin of results) {
            console.log(`${chalk.bold(plugin.name)} v${plugin.version}`);

            if (plugin.description) {
              console.log(`  ${plugin.description}`);
            }

            if (plugin.author) {
              console.log(`  Author: ${plugin.author}`);
            }

            if (plugin.date) {
              console.log(`  Published: ${new Date(plugin.date).toLocaleDateString()}`);
            }

            console.log('');
          }
          
          console.log(`Found ${results.length} plugin${results.length !== 1 ? 's' : ''}`);
          console.log(`\nTo install a plugin, run: flash-install plugin install <name>`);
        }
      } catch (error) {
        logger.error(`Failed to search plugins: ${error}`);
        process.exit(1);
      }
    });

  pluginCommand
    .command('info')
    .description('Show detailed information about a plugin')
    .argument('<name>', 'Plugin name')
    .action(async (pluginName) => {
      try {
        await pluginManager.init();
        const plugin = pluginManager.getPlugin(pluginName);

        if (!plugin) {
          logger.error(`Plugin not found: ${pluginName}`);
          process.exit(1);
        }

        console.log(chalk.cyan(`\n⚡ Plugin Information: ${pluginName}\n`));
        
        console.log(`Name: ${chalk.bold(plugin.name)}`);
        console.log(`Version: ${plugin.version}`);
        console.log(`Enabled: ${plugin.enabled ? chalk.green('Yes') : chalk.red('No')}`);
        console.log(`Source: ${plugin.source}`);
        
        if (plugin.description) {
          console.log(`Description: ${plugin.description}`);
        }
        
        if (plugin.author) {
          console.log(`Author: ${plugin.author}`);
        }
        
        if (plugin.homepage) {
          console.log(`Homepage: ${plugin.homepage}`);
        }
        
        if (plugin.repository) {
          console.log(`Repository: ${plugin.repository}`);
        }
        
        if (plugin.license) {
          console.log(`License: ${plugin.license}`);
        }
        
        // Show hooks
        const hooks = Object.keys(plugin.hooks);
        if (hooks.length > 0) {
          console.log(`\nHooks:`);
          for (const hook of hooks) {
            console.log(`  - ${hook}`);
          }
        }
        
        // Show configuration
        if (plugin.config && Object.keys(plugin.config).length > 0) {
          console.log(`\nConfiguration:`);
          for (const [key, value] of Object.entries(plugin.config)) {
            console.log(`  ${key}: ${value}`);
          }
        }
      } catch (error) {
        logger.error(`Failed to get plugin information: ${error}`);
        process.exit(1);
      }
    });
}
