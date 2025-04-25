#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');

// ANSI color codes for terminal output
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

// Main function
async function main() {
  try {
    // Print banner
    console.log(`${colors.cyan}
⚡ flash-install fix
    ${colors.reset}`);
    
    console.log(`${colors.cyan}⚡ Installing dependencies in ${colors.bold}${projectDir}${colors.reset}`);
    
    // Detect package manager
    const packageManager = detectPackageManager(projectDir);
    console.log(`${colors.gray}→ Using package manager: ${packageManager}${colors.reset}`);
    
    // Parse package.json
    console.log(`${colors.gray}→ Parsing package.json...${colors.reset}`);
    const pkg = parsePackageJson(projectDir);
    
    // Get dependencies
    const dependencies = { ...pkg.dependencies };
    if (pkg.devDependencies) {
      Object.assign(dependencies, pkg.devDependencies);
    }
    
    // Log dependency count
    const depCount = Object.keys(dependencies).length;
    console.log(`${colors.cyan}✓ Found ${colors.bold}${depCount}${colors.reset}${colors.cyan} ${depCount === 1 ? 'dependency' : 'dependencies'} to install${colors.reset}`);
    
    // Install dependencies
    await installDependencies(projectDir, dependencies, packageManager);
    
    console.log(`${colors.green}✓ Installation completed successfully${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Installation failed: ${error}${colors.reset}`);
    process.exit(1);
  }
}

// Detect package manager
function detectPackageManager(projectDir) {
  // Check for lockfiles
  const hasPackageLock = fs.existsSync(path.join(projectDir, 'package-lock.json'));
  const hasYarnLock = fs.existsSync(path.join(projectDir, 'yarn.lock'));
  const hasPnpmLock = fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'));
  
  if (hasPnpmLock) {
    return 'pnpm';
  } else if (hasYarnLock) {
    return 'yarn';
  } else {
    return 'npm';
  }
}

// Parse package.json
function parsePackageJson(projectDir) {
  const packageJsonPath = path.join(projectDir, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json not found');
  }
  
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

// Install dependencies
async function installDependencies(projectDir, dependencies, packageManager) {
  // Create node_modules directory
  const nodeModulesPath = path.join(projectDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    fs.mkdirSync(nodeModulesPath, { recursive: true });
  }
  
  // Start timer
  const startTime = Date.now();
  
  // Track progress
  let installed = 0;
  let failed = 0;
  const totalPackages = Object.keys(dependencies).length;
  
  console.log(`${colors.cyan}→ Installing ${colors.bold}${totalPackages}${colors.reset}${colors.cyan} packages...${colors.reset}`);
  
  // Process in batches
  const batchSize = 5;
  const batches = [];
  
  // Create batches
  const depEntries = Object.entries(dependencies);
  for (let i = 0; i < depEntries.length; i += batchSize) {
    batches.push(depEntries.slice(i, i + batchSize));
  }
  
  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchNumber = i + 1;
    
    console.log(`${colors.cyan}→ Processing batch ${batchNumber}/${batches.length} (${batch.length} packages)${colors.reset}`);
    
    // Show packages in this batch
    const packageNames = batch.map(([name, version]) => `${colors.green}${name}${colors.reset}@${colors.yellow}${version}${colors.reset}`).join(', ');
    console.log(`${colors.gray}  Packages: ${packageNames}${colors.reset}`);
    
    // Install packages in parallel
    const results = await Promise.all(
      batch.map(([name, version]) => installPackage(projectDir, name, version, packageManager))
    );
    
    // Update counts
    for (const result of results) {
      if (result.success) {
        installed++;
        console.log(`${colors.green}✓ Installed ${colors.bold}${result.name}@${result.version}${colors.reset}${colors.green} (${installed + failed}/${totalPackages})${colors.reset}`);
      } else {
        failed++;
        console.log(`${colors.red}✗ Failed to install ${colors.bold}${result.name}@${result.version}${colors.reset}${colors.red}: ${result.error}${colors.reset}`);
      }
    }
    
    // Show progress
    const progress = Math.round((installed + failed) / totalPackages * 100);
    const elapsed = (Date.now() - startTime) / 1000;
    const speed = (installed + failed) / elapsed;
    
    // Calculate ETA
    let etaText = 'calculating...';
    if (installed + failed > 0) {
      const remaining = totalPackages - (installed + failed);
      const eta = remaining / speed;
      
      if (eta < 60) {
        etaText = `${Math.round(eta)}s`;
      } else {
        etaText = `${Math.floor(eta / 60)}m ${Math.round(eta % 60)}s`;
      }
    }
    
    console.log(`${colors.cyan}→ Progress: ${installed + failed}/${totalPackages} (${progress}%) - Speed: ${speed.toFixed(1)}/sec - ETA: ${etaText}${colors.reset}`);
  }
  
  // Show completion
  const elapsed = (Date.now() - startTime) / 1000;
  let elapsedText = '';
  if (elapsed < 60) {
    elapsedText = `${Math.round(elapsed)}s`;
  } else {
    elapsedText = `${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s`;
  }
  
  console.log(`${colors.green}✓ Installed ${installed} packages in ${colors.bold}${elapsedText}${colors.reset}`);
  
  if (failed > 0) {
    console.log(`${colors.yellow}⚠ ${failed} packages failed to install${colors.reset}`);
  }
}

// Install a single package
function installPackage(projectDir, name, version, packageManager) {
  return new Promise((resolve) => {
    try {
      // Create command based on package manager
      let cmd = '';
      let args = [];
      
      if (packageManager === 'npm') {
        cmd = 'npm';
        args = ['install', `${name}@${version}`, '--no-save'];
      } else if (packageManager === 'yarn') {
        cmd = 'yarn';
        args = ['add', `${name}@${version}`, '--no-save'];
      } else if (packageManager === 'pnpm') {
        cmd = 'pnpm';
        args = ['add', `${name}@${version}`, '--no-save'];
      } else {
        // Default to npm
        cmd = 'npm';
        args = ['install', `${name}@${version}`, '--no-save'];
      }
      
      // Execute command
      const child = spawn(cmd, args, {
        cwd: projectDir,
        stdio: 'ignore'
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ name, version, success: true });
        } else {
          resolve({ name, version, success: false, error: `Exit code ${code}` });
        }
      });
      
      child.on('error', (error) => {
        resolve({ name, version, success: false, error: error.message });
      });
    } catch (error) {
      resolve({ name, version, success: false, error: String(error) });
    }
  });
}

// Run main function
main().catch((error) => {
  console.error(`${colors.red}✗ Unhandled error: ${error}${colors.reset}`);
  process.exit(1);
});
