#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

// Get current directory
const projectDir = process.cwd();

// Print banner
console.log(`${colors.cyan}
⚡ Simple Install
${colors.reset}`);

console.log(`${colors.cyan}⚡ Installing dependencies in ${colors.bold}${projectDir}${colors.reset}`);

// Start timer
const startTime = Date.now();

try {
  // Check if package.json exists
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error(`${colors.red}✗ package.json not found${colors.reset}`);
    process.exit(1);
  }

  // Parse package.json
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Get dependencies
  const dependencies = { ...pkg.dependencies };
  if (pkg.devDependencies) {
    Object.assign(dependencies, pkg.devDependencies);
  }
  
  // Log dependency count
  const depCount = Object.keys(dependencies).length;
  console.log(`${colors.cyan}✓ Found ${colors.bold}${depCount}${colors.reset}${colors.cyan} ${depCount === 1 ? 'dependency' : 'dependencies'} to install${colors.reset}`);
  
  // Show dependencies
  console.log(`${colors.gray}Dependencies:${colors.reset}`);
  Object.entries(dependencies).forEach(([name, version]) => {
    console.log(`${colors.gray}  • ${colors.green}${name}${colors.reset}${colors.gray}@${colors.yellow}${version}${colors.reset}`);
  });
  
  // Run npm install with progress reporting
  console.log(`\n${colors.cyan}→ Running npm install...${colors.reset}`);
  
  // Create a progress indicator
  let progressInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r${colors.cyan}→ Installing... (${elapsed}s elapsed)${colors.reset}`);
  }, 500);
  
  try {
    // Run npm install
    execSync('npm install', { stdio: 'ignore' });
    
    // Clear progress indicator
    clearInterval(progressInterval);
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
    
    // Calculate elapsed time
    const elapsed = (Date.now() - startTime) / 1000;
    let elapsedText = '';
    if (elapsed < 60) {
      elapsedText = `${Math.round(elapsed)}s`;
    } else {
      elapsedText = `${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s`;
    }
    
    // Show success message
    console.log(`${colors.green}✓ Installation completed in ${colors.bold}${elapsedText}${colors.reset}`);
  } catch (error) {
    // Clear progress indicator
    clearInterval(progressInterval);
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
    
    // Show error message
    console.error(`${colors.red}✗ Installation failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
} catch (error) {
  console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
  process.exit(1);
}
