#!/usr/bin/env node

const { spawn } = require('child_process');
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
const nodeModulesPath = path.join(projectDir, 'node_modules');

// Print banner
console.log(`${colors.cyan}
⚡ Real Progress Install
${colors.reset}`);

console.log(`${colors.cyan}⚡ Installing dependencies in ${colors.bold}${projectDir}${colors.reset}`);

// Start timer
const startTime = Date.now();

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

// Clean node_modules directory
console.log(`\n${colors.cyan}→ Cleaning node_modules directory...${colors.reset}`);
if (fs.existsSync(nodeModulesPath)) {
  fs.rmSync(nodeModulesPath, { recursive: true, force: true });
}
fs.mkdirSync(nodeModulesPath, { recursive: true });

// Run npm install
console.log(`${colors.cyan}→ Running npm install...${colors.reset}`);

// Start npm install process
const npmProcess = spawn('npm', ['install'], {
  stdio: ['ignore', 'ignore', 'ignore']
});

// Track installed packages
let installedPackages = new Set();
let lastReportedCount = 0;
let lastReportTime = Date.now();

// Monitor node_modules directory
const monitorInterval = setInterval(() => {
  try {
    // Get all directories in node_modules (excluding hidden and special directories)
    const dirs = fs.readdirSync(nodeModulesPath)
      .filter(dir => !dir.startsWith('.') && dir !== 'node_modules');
    
    // Count installed packages
    const currentCount = dirs.length;
    
    // Find new packages
    const newPackages = dirs.filter(dir => !installedPackages.has(dir));
    
    // Update installed packages set
    newPackages.forEach(pkg => installedPackages.add(pkg));
    
    // Calculate progress
    const progress = Math.min(100, Math.round((currentCount / depCount) * 100));
    
    // Calculate elapsed time
    const elapsed = (Date.now() - startTime) / 1000;
    
    // Calculate speed
    const packagesPerSecond = currentCount / Math.max(1, elapsed);
    
    // Calculate ETA
    let etaText = 'calculating...';
    if (currentCount > 0 && packagesPerSecond > 0) {
      const remaining = depCount - currentCount;
      const eta = remaining / packagesPerSecond;
      
      if (eta < 60) {
        etaText = `${Math.round(eta)}s`;
      } else {
        etaText = `${Math.floor(eta / 60)}m ${Math.round(eta % 60)}s`;
      }
    }
    
    // Only report if there are new packages or it's been more than 2 seconds
    if (currentCount > lastReportedCount || (Date.now() - lastReportTime) > 2000) {
      // Clear line
      process.stdout.write('\r' + ' '.repeat(80) + '\r');
      
      // Show progress
      process.stdout.write(`${colors.cyan}→ Progress: ${currentCount}/${depCount} (${progress}%) - Speed: ${packagesPerSecond.toFixed(1)}/sec - ETA: ${etaText}${colors.reset}`);
      
      // Show newly installed packages
      if (newPackages.length > 0) {
        console.log('');
        newPackages.forEach(pkg => {
          console.log(`${colors.green}✓ Installed ${colors.bold}${pkg}${colors.reset}`);
        });
      }
      
      lastReportedCount = currentCount;
      lastReportTime = Date.now();
    }
  } catch (error) {
    // Ignore errors (might happen if node_modules is being modified)
  }
}, 500);

// Handle npm process completion
npmProcess.on('close', (code) => {
  // Clear monitoring interval
  clearInterval(monitorInterval);
  
  // Clear line
  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  
  if (code === 0) {
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
    
    // Show final count
    const finalCount = fs.readdirSync(nodeModulesPath)
      .filter(dir => !dir.startsWith('.') && dir !== 'node_modules').length;
    
    console.log(`${colors.green}✓ Installed ${colors.bold}${finalCount}${colors.reset}${colors.green} packages${colors.reset}`);
  } else {
    // Show error message
    console.error(`${colors.red}✗ Installation failed with code ${code}${colors.reset}`);
    process.exit(1);
  }
});

// Handle errors
npmProcess.on('error', (error) => {
  clearInterval(monitorInterval);
  console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
