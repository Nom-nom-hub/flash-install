#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

// ANSI color codes
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const red = '\x1b[31m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

// Print banner
console.log(`${cyan}
⚡ Ultra Simple Install
${reset}`);

// Start timer
const startTime = Date.now();

// Create a spinner animation
const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let frameIndex = 0;
let spinnerInterval;

// Start the spinner
function startSpinner() {
  spinnerInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r${cyan}${frames[frameIndex]} Installing... (${elapsed}s elapsed)${reset}`);
    frameIndex = (frameIndex + 1) % frames.length;
  }, 80);
}

// Stop the spinner
function stopSpinner() {
  clearInterval(spinnerInterval);
  process.stdout.write('\r' + ' '.repeat(80) + '\r');
}

// Run npm install
console.log(`${cyan}→ Running npm install...${reset}`);
startSpinner();

// Start npm install process
const npmProcess = spawn('npm', ['install'], {
  stdio: ['ignore', 'pipe', 'pipe']
});

// Handle completion
npmProcess.on('close', (code) => {
  // Stop spinner
  stopSpinner();
  
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
    console.log(`${green}✓ Installation completed in ${bold}${elapsedText}${reset}`);
  } else {
    // Show error message
    console.error(`${red}✗ Installation failed with code ${code}${reset}`);
    process.exit(1);
  }
});

// Handle errors
npmProcess.on('error', (error) => {
  stopSpinner();
  console.error(`${red}✗ Error: ${error.message}${reset}`);
  process.exit(1);
});
