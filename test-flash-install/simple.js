#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

// ANSI color codes
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

// Print banner
console.log(`${cyan}
⚡ Flash Install - Simple Progress
${reset}`);

// Start timer
const startTime = Date.now();

// Run npm install with live output
console.log(`${cyan}→ Running npm install...${reset}`);

// Create a spinner animation
const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let frameIndex = 0;

// Start the spinner
const spinnerInterval = setInterval(() => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  process.stdout.write(`\r${cyan}${frames[frameIndex]} Installing... (${elapsed}s elapsed)${reset}`);
  frameIndex = (frameIndex + 1) % frames.length;
}, 80);

// Start npm install process
const npmProcess = spawn('npm', ['install'], {
  stdio: ['ignore', 'pipe', 'pipe']
});

// Track progress
let packageCount = 0;
let lastPackage = '';

// Process stdout
npmProcess.stdout.on('data', (data) => {
  const output = data.toString();
  
  // Look for added package patterns
  const addedMatch = output.match(/added (\d+) packages/);
  if (addedMatch) {
    packageCount = parseInt(addedMatch[1], 10);
  }
  
  // Look for package names
  const packageMatch = output.match(/node_modules\/([@\w-]+)/);
  if (packageMatch) {
    lastPackage = packageMatch[1];
  }
  
  // Update spinner with package info if available
  if (lastPackage) {
    clearInterval(spinnerInterval);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r${cyan}→ Installing... ${elapsed}s elapsed - Last: ${green}${lastPackage}${reset}${' '.repeat(20)}`);
    
    // Restart spinner
    frameIndex = 0;
    spinnerInterval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\r${cyan}${frames[frameIndex]} Installing... (${elapsed}s elapsed) - Last: ${green}${lastPackage}${reset}${' '.repeat(20)}`);
      frameIndex = (frameIndex + 1) % frames.length;
    }, 80);
  }
});

// Process stderr (usually progress info)
npmProcess.stderr.on('data', (data) => {
  // We could process this for more info, but we'll keep it simple
});

// Handle completion
npmProcess.on('close', (code) => {
  // Clear spinner
  clearInterval(spinnerInterval);
  process.stdout.write('\r' + ' '.repeat(100) + '\r');
  
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
    console.log(`\n${green}✓ Installation completed in ${bold}${elapsedText}${reset}`);
    
    if (packageCount > 0) {
      console.log(`${green}✓ Installed ${bold}${packageCount}${reset}${green} packages${reset}`);
    }
    
    console.log(`${cyan}⚡ Installation successful!${reset}`);
  } else {
    // Show error message
    console.error(`\n${yellow}✗ Installation failed with code ${code}${reset}`);
    process.exit(1);
  }
});
