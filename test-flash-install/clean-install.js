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
⚡ Flash Install - Clean Progress
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
console.log(`${colors.cyan}✓ Found ${colors.bold}${depCount}${colors.reset}${colors.cyan} direct ${depCount === 1 ? 'dependency' : 'dependencies'} to install${colors.reset}`);

// Clean node_modules directory
console.log(`\n${colors.cyan}→ Cleaning node_modules directory...${colors.reset}`);
try {
  if (fs.existsSync(nodeModulesPath)) {
    // Use child_process to ensure proper removal
    const { execSync } = require('child_process');
    execSync(`rm -rf "${nodeModulesPath}"`, { stdio: 'ignore' });
  }
  fs.mkdirSync(nodeModulesPath, { recursive: true });
} catch (error) {
  console.log(`${colors.yellow}⚠ Warning: Could not fully clean node_modules: ${error.message}${colors.reset}`);
  console.log(`${colors.yellow}⚠ Continuing with installation...${colors.reset}`);
}

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
let recentPackages = [];
const maxRecentPackages = 3;

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
    newPackages.forEach(pkg => {
      installedPackages.add(pkg);

      // Add to recent packages
      recentPackages.unshift(pkg);
      if (recentPackages.length > maxRecentPackages) {
        recentPackages.pop();
      }
    });

    // Calculate elapsed time
    const elapsed = (Date.now() - startTime) / 1000;

    // Calculate speed
    const packagesPerSecond = currentCount / Math.max(1, elapsed);

    // Only report if there are new packages or it's been more than 1 second
    if (currentCount > lastReportedCount || (Date.now() - lastReportTime) > 1000) {
      // Clear line and move cursor to beginning
      process.stdout.write('\r' + ' '.repeat(80) + '\r');

      // Format recent packages
      const recentText = recentPackages.length > 0
        ? ` (${recentPackages.map(p => colors.green + p + colors.reset).join(', ')})`
        : '';

      // Show progress
      process.stdout.write(`${colors.cyan}→ Installed ${colors.bold}${currentCount}${colors.reset}${colors.cyan} packages at ${colors.bold}${packagesPerSecond.toFixed(1)}${colors.reset}${colors.cyan} pkg/sec${colors.reset}${recentText}`);

      lastReportedCount = currentCount;
      lastReportTime = Date.now();
    }
  } catch (error) {
    // Ignore errors (might happen if node_modules is being modified)
  }
}, 250);

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

    // Count final packages
    const finalCount = fs.readdirSync(nodeModulesPath)
      .filter(dir => !dir.startsWith('.') && dir !== 'node_modules').length;

    // Show success message
    console.log(`\n${colors.green}✓ Installation completed in ${colors.bold}${elapsedText}${colors.reset}`);
    console.log(`${colors.green}✓ Installed ${colors.bold}${finalCount}${colors.reset}${colors.green} packages (${depCount} direct dependencies + ${finalCount - depCount} sub-dependencies)${colors.reset}`);

    // Compare with npm install
    const packagesPerSecond = finalCount / elapsed;
    console.log(`${colors.cyan}⚡ Average speed: ${colors.bold}${packagesPerSecond.toFixed(1)}${colors.reset}${colors.cyan} packages per second${colors.reset}`);
  } else {
    // Show error message
    console.error(`\n${colors.red}✗ Installation failed with code ${code}${colors.reset}`);
    process.exit(1);
  }
});

// Handle errors
npmProcess.on('error', (error) => {
  clearInterval(monitorInterval);
  console.error(`\n${colors.red}✗ Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
