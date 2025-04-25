#!/usr/bin/env node

import { spawn } from 'child_process';
import chalk from 'chalk';

// Print banner
console.log(chalk.cyan(`
⚡ flash-install v1.0.9
`));

console.log(chalk.cyan(`⚡ Installing dependencies with enhanced output`));

// Start timer
const startTime = Date.now();

// Start npm install process with all output passed through
const npmProcess = spawn('npm', ['install'], {
  stdio: ['inherit', 'inherit', 'inherit']
});

// Handle completion
npmProcess.on('close', (code) => {
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
    console.log(chalk.green(`\n✓ Installation completed in ${chalk.bold(elapsedText)}`));
    console.log(chalk.cyan(`⚡ flash-install: Faster dependency installation with snapshot caching`));
  } else {
    // Show error message
    console.error(chalk.red(`\n✗ Installation failed with code ${code}`));
    process.exit(1);
  }
});

// Handle errors
npmProcess.on('error', (error) => {
  console.error(chalk.red(`\n✗ Error: ${error.message}`));
  process.exit(1);
});
