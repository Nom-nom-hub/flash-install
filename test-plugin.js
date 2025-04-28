// Test script for the plugin system
import { Installer } from './dist/install.js';
import { pluginManager, PluginHook } from './dist/plugin.js';

async function testPlugin() {
  try {
    console.log('Initializing plugin manager...');
    await pluginManager.init(process.cwd());

    console.log('Testing plugin hooks directly...');

    // Create a test context
    const context = {
      projectDir: process.cwd(),
      nodeModulesPath: `${process.cwd()}/node_modules`,
      dependencies: { chalk: '^5.0.0' },
      packageManager: 'npm'
    };

    // Test preInstall hook
    console.log('\nTesting preInstall hook:');
    await pluginManager.runHook(PluginHook.PRE_INSTALL, context);

    // Test postInstall hook
    console.log('\nTesting postInstall hook:');
    await pluginManager.runHook(PluginHook.POST_INSTALL, context);

    console.log('\nPlugin hook testing completed');
  } catch (error) {
    console.error('Error:', error);
  }
}

testPlugin().catch(console.error);
