#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { spawn, execSync } from 'child_process';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

// Get package version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Create CLI program
const program = new Command();

program
  .name('flash-direct')
  .description('Direct commands for flash-install with reliable progress reporting')
  .version(version);

// Default install command
program
  .command('install')
  .description('Install dependencies with npm progress reporting')
  .action(async () => {
    const projectDir = process.cwd();

    // Print banner
    console.log(chalk.cyan(`
⚡ flash-install v${version}
    `));

    console.log(chalk.cyan(`⚡ Installing dependencies in ${chalk.bold(projectDir)}`));

    // Start timer
    const startTime = Date.now();

    // Start npm install process with all output passed through
    const npmProcess = spawn('npm', ['install'], {
      stdio: ['inherit', 'inherit', 'inherit']
    });

    // Handle completion
    const success = await new Promise<boolean>((resolve) => {
      npmProcess.on('close', (code) => {
        resolve(code === 0);
      });

      npmProcess.on('error', () => {
        resolve(false);
      });
    });

    if (success) {
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
      console.error(chalk.red(`\n✗ Installation failed`));
      process.exit(1);
    }
  });

// Snapshot command
program
  .command('snapshot')
  .description('Create a snapshot of node_modules')
  .option('-c, --no-cache', 'Skip adding to global cache')
  .action(async () => {
    const projectDir = process.cwd();

    console.log(chalk.cyan(`\n⚡ Creating snapshot for ${chalk.bold(projectDir)}\n`));

    // Start timer
    const startTime = Date.now();

    // Very simple progress indicator
    let dots = '';
    let progressInterval = setInterval(() => {
      dots = (dots.length >= 3) ? '' : dots + '.';
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\rCreating snapshot${dots.padEnd(3)} (${elapsed}s elapsed)${' '.repeat(20)}`);
    }, 500);

    try {
      // Use native tar command for better performance
      const snapshotPath = path.join(projectDir, '.flashpack');

      // Create tar command with optimized options
      const tarCommand = `tar -czf "${snapshotPath}" -C "${projectDir}" ` +
        `--exclude=".git" ` +
        `--exclude="node_modules/*/node_modules" ` +
        `--exclude="*/test" ` +
        `--exclude="*/tests" ` +
        `--exclude="*/example" ` +
        `--exclude="*/examples" ` +
        `--exclude="*/doc" ` +
        `--exclude="*/docs" ` +
        `node_modules`;

      // Execute tar command with progress updates
      const tarProcess = spawn('bash', ['-c', tarCommand], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Wait for process to complete
      const success = await new Promise<boolean>((resolve) => {
        tarProcess.on('close', (code) => {
          resolve(code === 0);
        });

        tarProcess.on('error', () => {
          resolve(false);
        });
      });

      // Stop progress indicator
      clearInterval(progressInterval);
      process.stdout.write('\r' + ' '.repeat(80) + '\r');

      if (success) {
        // Calculate elapsed time
        const elapsed = (Date.now() - startTime) / 1000;
        let elapsedText = '';
        if (elapsed < 60) {
          elapsedText = `${Math.round(elapsed)}s`;
        } else {
          elapsedText = `${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s`;
        }

        console.log(chalk.green(`✓ Created snapshot in ${chalk.bold(elapsedText)}`));
      } else {
        console.error(chalk.red(`✗ Failed to create snapshot`));
        process.exit(1);
      }
    } catch (error: any) {
      // Stop progress indicator
      clearInterval(progressInterval);
      process.stdout.write('\r' + ' '.repeat(80) + '\r');

      console.error(chalk.red(`✗ Error: ${error?.message || String(error)}`));
      process.exit(1);
    }
  });

// Restore command
program
  .command('restore')
  .description('Restore node_modules from a snapshot')
  .action(async () => {
    const projectDir = process.cwd();

    console.log(chalk.cyan(`\n⚡ Restoring node_modules for ${chalk.bold(projectDir)}\n`));

    // Start timer
    const startTime = Date.now();

    // Very simple progress indicator
    let dots = '';
    let progressInterval = setInterval(() => {
      dots = (dots.length >= 3) ? '' : dots + '.';
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\rRestoring node_modules${dots.padEnd(3)} (${elapsed}s elapsed)${' '.repeat(20)}`);
    }, 500);

    try {
      // Use native tar command for better performance
      const snapshotPath = path.join(projectDir, '.flashpack');

      if (!fs.existsSync(snapshotPath)) {
        clearInterval(progressInterval);
        process.stdout.write('\r' + ' '.repeat(80) + '\r');
        console.error(chalk.red(`✗ Snapshot not found at ${snapshotPath}`));
        process.exit(1);
      }

      // Remove existing node_modules if present
      const nodeModulesPath = path.join(projectDir, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        // Update progress message
        clearInterval(progressInterval);
        process.stdout.write('\r' + ' '.repeat(80) + '\r');
        process.stdout.write(`\rRemoving existing node_modules...${' '.repeat(20)}`);

        // Use rm -rf for faster removal
        execSync(`rm -rf "${nodeModulesPath}"`, { stdio: 'ignore' });

        // Restart progress indicator
        dots = '';
        progressInterval = setInterval(() => {
          dots = (dots.length >= 3) ? '' : dots + '.';
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          process.stdout.write(`\rExtracting snapshot${dots.padEnd(3)} (${elapsed}s elapsed)${' '.repeat(20)}`);
        }, 500);
      }

      // Extract snapshot using native tar directly (much faster)
      execSync(`tar -xzf "${snapshotPath}" -C "${projectDir}"`, { stdio: 'ignore' });

      // Stop progress indicator
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

      console.log(chalk.green(`✓ Restored node_modules in ${chalk.bold(elapsedText)}`));
    } catch (error: any) {
      // Stop progress indicator
      clearInterval(progressInterval);
      process.stdout.write('\r' + ' '.repeat(80) + '\r');

      console.error(chalk.red(`✗ Error: ${error?.message || String(error)}`));
      process.exit(1);
    }
  });

// Clean command
program
  .command('clean')
  .description('Remove node_modules and snapshot')
  .action(async () => {
    const projectDir = process.cwd();

    console.log(chalk.cyan(`\n⚡ Cleaning project in ${chalk.bold(projectDir)}\n`));

    // Start timer
    const startTime = Date.now();

    // Very simple progress indicator
    let dots = '';
    let progressInterval = setInterval(() => {
      dots = (dots.length >= 3) ? '' : dots + '.';
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\rCleaning project${dots.padEnd(3)} (${elapsed}s elapsed)${' '.repeat(20)}`);
    }, 500);

    try {
      // Remove node_modules
      const nodeModulesPath = path.join(projectDir, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        await fs.remove(nodeModulesPath);
      }

      // Remove snapshot
      const snapshotPath = path.join(projectDir, '.flashpack');
      if (fs.existsSync(snapshotPath)) {
        await fs.remove(snapshotPath);
      }

      // Stop progress indicator
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

      console.log(chalk.green(`✓ Cleaned project in ${chalk.bold(elapsedText)}`));
    } catch (error: any) {
      // Stop progress indicator
      clearInterval(progressInterval);
      process.stdout.write('\r' + ' '.repeat(80) + '\r');

      console.error(chalk.red(`✗ Error: ${error?.message || String(error)}`));
      process.exit(1);
    }
  })

// Clean modules command (only removes node_modules)
program
  .command('clean-modules')
  .description('Remove only node_modules directory (preserves snapshot)')
  .action(async () => {
    const projectDir = process.cwd();

    console.log(chalk.cyan(`\n⚡ Cleaning node_modules in ${chalk.bold(projectDir)}\n`));

    // Start timer
    const startTime = Date.now();

    // Very simple progress indicator
    let dots = '';
    let progressInterval = setInterval(() => {
      dots = (dots.length >= 3) ? '' : dots + '.';
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\rCleaning node_modules${dots.padEnd(3)} (${elapsed}s elapsed)${' '.repeat(20)}`);
    }, 500);

    try {
      // Remove node_modules
      const nodeModulesPath = path.join(projectDir, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        await fs.remove(nodeModulesPath);
      }

      // Stop progress indicator
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

      console.log(chalk.green(`✓ Cleaned node_modules in ${chalk.bold(elapsedText)} (snapshot preserved)`));
    } catch (error: any) {
      // Stop progress indicator
      clearInterval(progressInterval);
      process.stdout.write('\r' + ' '.repeat(80) + '\r');

      console.error(chalk.red(`✗ Error: ${error?.message || String(error)}`));
      process.exit(1);
    }
  })

// Clean snapshot command (only removes snapshot)
program
  .command('clean-snapshot')
  .description('Remove only snapshot file (preserves node_modules)')
  .action(async () => {
    const projectDir = process.cwd();

    console.log(chalk.cyan(`\n⚡ Cleaning snapshot in ${chalk.bold(projectDir)}\n`));

    // Start timer
    const startTime = Date.now();

    // Very simple progress indicator
    let dots = '';
    let progressInterval = setInterval(() => {
      dots = (dots.length >= 3) ? '' : dots + '.';
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\rCleaning snapshot${dots.padEnd(3)} (${elapsed}s elapsed)${' '.repeat(20)}`);
    }, 500);

    try {
      // Remove snapshot
      const snapshotPath = path.join(projectDir, '.flashpack');
      if (fs.existsSync(snapshotPath)) {
        await fs.remove(snapshotPath);
      }

      // Stop progress indicator
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

      console.log(chalk.green(`✓ Cleaned snapshot in ${chalk.bold(elapsedText)} (node_modules preserved)`));
    } catch (error: any) {
      // Stop progress indicator
      clearInterval(progressInterval);
      process.stdout.write('\r' + ' '.repeat(80) + '\r');

      console.error(chalk.red(`✗ Error: ${error?.message || String(error)}`));
      process.exit(1);
    }
  });

// Sync command
program
  .command('sync')
  .description('Synchronize dependencies with lockfile')
  .action(async () => {
    const projectDir = process.cwd();

    console.log(chalk.cyan(`\n⚡ Synchronizing dependencies in ${chalk.bold(projectDir)}\n`));

    // Start timer
    const startTime = Date.now();

    // Use npm install to sync dependencies
    const npmProcess = spawn('npm', ['install'], {
      stdio: ['inherit', 'inherit', 'inherit']
    });

    // Handle completion
    const success = await new Promise<boolean>((resolve) => {
      npmProcess.on('close', (code) => {
        resolve(code === 0);
      });

      npmProcess.on('error', () => {
        resolve(false);
      });
    });

    if (success) {
      // Calculate elapsed time
      const elapsed = (Date.now() - startTime) / 1000;
      let elapsedText = '';
      if (elapsed < 60) {
        elapsedText = `${Math.round(elapsed)}s`;
      } else {
        elapsedText = `${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s`;
      }

      // Show success message
      console.log(chalk.green(`\n✓ Dependencies synchronized in ${chalk.bold(elapsedText)}`));
    } else {
      // Show error message
      console.error(chalk.red(`\n✗ Synchronization failed`));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Run install command if no command provided
if (!process.argv.slice(2).length) {
  // Execute the install command by default
  const installCommand = program.commands.find(cmd => cmd.name() === 'install');
  if (installCommand) {
    // Call the action directly with the current working directory
    const projectDir = process.cwd();

    // Print banner
    console.log(chalk.cyan(`
⚡ flash-install v${version}
    `));

    console.log(chalk.cyan(`⚡ Installing dependencies in ${chalk.bold(projectDir)}`));

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
        console.error(chalk.red(`\n✗ Installation failed`));
        process.exit(1);
      }
    });

    npmProcess.on('error', () => {
      console.error(chalk.red(`\n✗ Installation failed`));
      process.exit(1);
    });
  } else {
    program.outputHelp();
  }
}
