/**
 * Test script for flash-install Vercel configuration
 * 
 * This script validates the sample-vercel.json file.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the sample-vercel.json file
const sampleConfigPath = path.resolve(__dirname, '../../integrations/vercel/sample-vercel.json');

// Test the configuration
async function testConfig() {
  console.log('Testing flash-install Vercel configuration...');
  
  // Check if the file exists
  if (!fs.existsSync(sampleConfigPath)) {
    console.error(`Configuration file not found at ${sampleConfigPath}`);
    process.exit(1);
  }
  
  try {
    // Read and parse the configuration file
    const configContent = fs.readFileSync(sampleConfigPath, 'utf8');
    const config = JSON.parse(configContent);
    
    console.log('Configuration file parsed successfully');
    
    // Validate the configuration
    if (!config.buildPlugins || !Array.isArray(config.buildPlugins) || config.buildPlugins.length === 0) {
      console.error('Configuration is missing buildPlugins array');
      process.exit(1);
    }
    
    const flashInstallPlugin = config.buildPlugins.find(plugin => plugin.name === '@flash-install/vercel-plugin');
    
    if (!flashInstallPlugin) {
      console.error('Configuration is missing flash-install plugin');
      process.exit(1);
    }
    
    if (!flashInstallPlugin.config) {
      console.error('Plugin configuration is missing');
      process.exit(1);
    }
    
    // Check required configuration options
    const requiredOptions = ['enableCache', 'cacheCompression', 'concurrency', 'fallbackToNpm'];
    const missingOptions = requiredOptions.filter(option => flashInstallPlugin.config[option] === undefined);
    
    if (missingOptions.length > 0) {
      console.error(`Plugin configuration is missing required options: ${missingOptions.join(', ')}`);
      process.exit(1);
    }
    
    console.log('Configuration validation successful');
    console.log('Plugin configuration:', flashInstallPlugin.config);
    
    return true;
  } catch (error) {
    console.error('Failed to parse configuration file:', error);
    process.exit(1);
  }
}

// Run the test
testConfig().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
