/**
 * Test script for flash-install Vercel integration metadata
 * 
 * This script validates the vercel-integration.json file.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the vercel-integration.json file
const integrationPath = path.resolve(__dirname, '../../integrations/vercel/vercel-integration.json');

// Test the integration metadata
async function testIntegration() {
  console.log('Testing flash-install Vercel integration metadata...');
  
  // Check if the file exists
  if (!fs.existsSync(integrationPath)) {
    console.error(`Integration metadata file not found at ${integrationPath}`);
    process.exit(1);
  }
  
  try {
    // Read and parse the integration metadata file
    const integrationContent = fs.readFileSync(integrationPath, 'utf8');
    const integration = JSON.parse(integrationContent);
    
    console.log('Integration metadata file parsed successfully');
    
    // Validate the integration metadata
    const requiredFields = ['version', 'name', 'slug', 'description', 'logo', 'publisher', 'categories', 'resources', 'metadata', 'integration'];
    const missingFields = requiredFields.filter(field => integration[field] === undefined);
    
    if (missingFields.length > 0) {
      console.error(`Integration metadata is missing required fields: ${missingFields.join(', ')}`);
      process.exit(1);
    }
    
    // Validate logo URLs
    if (!integration.logo.light || !integration.logo.dark) {
      console.error('Integration metadata is missing logo URLs');
      process.exit(1);
    }
    
    // Validate resources
    const requiredResources = ['documentation', 'website', 'support'];
    const missingResources = requiredResources.filter(resource => integration.resources[resource] === undefined);
    
    if (missingResources.length > 0) {
      console.error(`Integration metadata is missing required resources: ${missingResources.join(', ')}`);
      process.exit(1);
    }
    
    // Validate integration settings
    if (!integration.integration.settings) {
      console.error('Integration metadata is missing settings');
      process.exit(1);
    }
    
    console.log('Integration metadata validation successful');
    console.log('Integration name:', integration.name);
    console.log('Integration description:', integration.description);
    console.log('Integration categories:', integration.categories);
    
    return true;
  } catch (error) {
    console.error('Failed to parse integration metadata file:', error);
    process.exit(1);
  }
}

// Run the test
testIntegration().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
