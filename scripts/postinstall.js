#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make the CLI file executable
const cliPath = path.join(__dirname, '..', 'dist', 'cli-direct.js');

try {
  // Check if the file exists
  if (fs.existsSync(cliPath)) {
    // Get current permissions
    const stats = fs.statSync(cliPath);

    // Add executable permissions (equivalent to chmod +x)
    const newMode = stats.mode | 0o111; // Add executable bit for user, group, and others

    // Set new permissions
    fs.chmodSync(cliPath, newMode);

    console.log('Made CLI file executable');
  } else {
    console.error('CLI file not found:', cliPath);
  }
} catch (error) {
  console.error('Error making CLI file executable:', error);
}
