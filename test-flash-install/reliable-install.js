#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

// Get current directory
const projectDir = process.cwd();

// Print banner
console.log(`${cyan}
⚡ Reliable Install with Progress
${reset}`);

console.log(`${cyan}⚡ Installing dependencies in ${bold}${projectDir}${reset}`);

// Start timer
const startTime = Date.now();

// Check if package.json exists
const packageJsonPath = path.join(projectDir, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error(`${red}✗ package.json not found${reset}`);
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
const depCount = Object.entries(dependencies).length;
console.log(`${cyan}✓ Found ${bold}${depCount}${reset}${cyan} direct ${depCount === 1 ? 'dependency' : 'dependencies'} to install${reset}`);

// Create a spinner animation
const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let frameIndex = 0;
let spinnerInterval;

// Function to start the spinner
function startSpinner(message) {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
  }
  
  frameIndex = 0;
  spinnerInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r${cyan}${frames[frameIndex]} ${message} (${elapsed}s elapsed)${reset}${' '.repeat(40)}`);
    frameIndex = (frameIndex + 1) % frames.length;
  }, 80);
}

// Function to stop the spinner
function stopSpinner() {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
    process.stdout.write('\r' + ' '.repeat(100) + '\r');
  }
}

// Run npm install with progress
console.log(`\n${cyan}→ Running npm install...${reset}`);

try {
  // Start spinner
  startSpinner('Installing dependencies');
  
  // Run npm install with progress
  execSync('npm install --no-progress', { 
    stdio: 'ignore',
    cwd: projectDir
  });
  
  // Stop spinner
  stopSpinner();
  
  // Calculate elapsed time
  const elapsed = (Date.now() - startTime) / 1000;
  let elapsedText = '';
  if (elapsed < 60) {
    elapsedText = `${Math.round(elapsed)}s`;
  } else {
    elapsedText = `${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s`;
  }
  
  // Show success message
  console.log(`\n${green}✓ Installation completed in ${bold}${elapsedText}${reset}`);
  
  // Count installed packages
  const nodeModulesPath = path.join(projectDir, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    try {
      const dirs = fs.readdirSync(nodeModulesPath)
        .filter(dir => !dir.startsWith('.') && dir !== 'node_modules');
      
      console.log(`${green}✓ Installed ${bold}${dirs.length}${reset}${green} packages${reset}`);
      
      // Calculate speed
      const packagesPerSecond = dirs.length / elapsed;
      console.log(`${cyan}⚡ Average speed: ${bold}${packagesPerSecond.toFixed(1)}${reset}${cyan} packages per second${reset}`);
    } catch (error) {
      console.log(`${green}✓ Installation successful${reset}`);
    }
  } else {
    console.log(`${green}✓ Installation successful${reset}`);
  }
} catch (error) {
  // Stop spinner
  stopSpinner();
  
  // Show error message
  console.error(`\n${red}✗ Installation failed: ${error.message}${reset}`);
  process.exit(1);
}
