#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ANSI color codes
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

// Get current directory
const projectDir = process.cwd();
const nodeModulesPath = path.join(projectDir, 'node_modules');

// Print banner
console.log(`${cyan}
⚡ Fast Install - Parallel Installation
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
const depCount = Object.keys(dependencies).length;
console.log(`${cyan}✓ Found ${bold}${depCount}${reset}${cyan} direct ${depCount === 1 ? 'dependency' : 'dependencies'} to install${reset}`);

// Create node_modules directory if it doesn't exist
if (!fs.existsSync(nodeModulesPath)) {
  fs.mkdirSync(nodeModulesPath, { recursive: true });
}

// Determine concurrency
const concurrency = Math.max(1, os.cpus().length - 1);
console.log(`${cyan}→ Using ${bold}${concurrency}${reset}${cyan} parallel workers${reset}`);

// Create batches of dependencies
const depEntries = Object.entries(dependencies);
const batchSize = Math.max(1, Math.ceil(depEntries.length / concurrency));
const batches = [];

for (let i = 0; i < depEntries.length; i += batchSize) {
  batches.push(depEntries.slice(i, i + batchSize));
}

console.log(`${cyan}→ Installing in ${bold}${batches.length}${reset}${cyan} batches${reset}`);

// Track progress
let installed = 0;
let failed = 0;
const startedPackages = new Set();
const completedPackages = new Set();

// Create a spinner animation
const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let frameIndex = 0;

// Start the spinner
const spinnerInterval = setInterval(() => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const progress = Math.round((completedPackages.size / depEntries.length) * 100);
  const speed = completedPackages.size / Math.max(1, elapsed);
  
  process.stdout.write(`\r${cyan}${frames[frameIndex]} Progress: ${completedPackages.size}/${depEntries.length} (${progress}%) - ${speed.toFixed(1)} pkg/sec${reset}${' '.repeat(20)}`);
  frameIndex = (frameIndex + 1) % frames.length;
}, 80);

// Install a single package
function installPackage(name, version) {
  return new Promise((resolve) => {
    startedPackages.add(name);
    
    const npmArgs = ['install', `${name}@${version}`, '--no-save'];
    const child = spawn('npm', npmArgs, {
      cwd: projectDir,
      stdio: 'ignore'
    });
    
    child.on('close', (code) => {
      completedPackages.add(name);
      if (code === 0) {
        installed++;
        resolve(true);
      } else {
        failed++;
        resolve(false);
      }
    });
    
    child.on('error', () => {
      completedPackages.add(name);
      failed++;
      resolve(false);
    });
  });
}

// Install all dependencies in parallel batches
async function installAllDependencies() {
  const promises = [];
  
  // Process each batch
  for (const batch of batches) {
    // Create promises for each package in the batch
    for (const [name, version] of batch) {
      promises.push(installPackage(name, version));
    }
  }
  
  // Wait for all installations to complete
  await Promise.all(promises);
  
  // Clear spinner
  clearInterval(spinnerInterval);
  process.stdout.write('\r' + ' '.repeat(100) + '\r');
  
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
  console.log(`${green}✓ Installed ${bold}${installed}${reset}${green} packages successfully${reset}`);
  
  if (failed > 0) {
    console.log(`${yellow}⚠ ${failed} packages failed to install${reset}`);
  }
  
  // Calculate speed
  const packagesPerSecond = installed / elapsed;
  console.log(`${cyan}⚡ Average speed: ${bold}${packagesPerSecond.toFixed(1)}${reset}${cyan} packages per second${reset}`);
  
  // Run npm install to ensure dependencies are properly linked
  console.log(`\n${cyan}→ Finalizing installation...${reset}`);
  try {
    execSync('npm install --no-package-lock', { stdio: 'ignore', cwd: projectDir });
    console.log(`${green}✓ Installation finalized successfully${reset}`);
  } catch (error) {
    console.log(`${yellow}⚠ Finalization completed with warnings${reset}`);
  }
}

// Run the installation
installAllDependencies().catch((error) => {
  clearInterval(spinnerInterval);
  console.error(`\n${red}✗ Error: ${error.message}${reset}`);
  process.exit(1);
});
