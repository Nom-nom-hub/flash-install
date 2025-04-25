import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { CliProgress } from './cli-progress.js';

/**
 * Simple CLI installer that provides clear progress feedback
 */
export class CliInstaller {
  private projectDir: string;
  private dependencies: Record<string, string>;
  private packageManager: string;
  private startTime: number = 0;

  /**
   * Create a new CLI installer
   * @param projectDir Project directory
   * @param dependencies Dependencies to install
   * @param packageManager Package manager to use
   */
  constructor(
    projectDir: string,
    dependencies: Record<string, string>,
    packageManager: string
  ) {
    this.projectDir = projectDir;
    this.dependencies = dependencies;
    this.packageManager = packageManager;
  }

  /**
   * Install dependencies
   * @returns True if successful
   */
  async install(): Promise<boolean> {
    try {
      this.startTime = Date.now();

      // Print banner
      console.log(chalk.cyan(`\n→ Installing ${Object.keys(this.dependencies).length} packages using ${chalk.bold(this.packageManager)}...\n`));

      // Create progress reporter
      const progress = new CliProgress(
        Object.keys(this.dependencies).length,
        'Installing packages'
      );

      // Start progress reporting
      progress.start();

      // Install each dependency
      let installed = 0;
      let failed = 0;

      for (const [name, version] of Object.entries(this.dependencies)) {
        try {
          // Install package
          const success = await this.installPackage(name, version);

          if (success) {
            installed++;
            progress.update(1, `${name}@${version}`);
          } else {
            failed++;
            progress.update(1, `${name}@${version} (failed)`);
          }
        } catch (error) {
          failed++;
          progress.update(1, `${name}@${version} (error)`);
        }
      }

      // Complete progress
      progress.complete();

      // Print summary
      const elapsed = (Date.now() - this.startTime) / 1000;
      console.log(chalk.green(`\n✓ Installed ${installed} packages in ${this.formatTime(elapsed)}`));

      if (failed > 0) {
        console.log(chalk.yellow(`⚠ ${failed} packages failed to install`));
      }

      return installed > 0 && failed === 0;
    } catch (error) {
      console.log(chalk.red(`\n✗ Installation failed: ${error}`));
      return false;
    }
  }

  /**
   * Install a single package
   * @param name Package name
   * @param version Package version
   * @returns True if successful
   */
  private async installPackage(name: string, version: string): Promise<boolean> {
    try {
      // Create command based on package manager
      let cmd = '';

      if (this.packageManager === 'npm') {
        cmd = `npm install ${name}@${version} --no-save`;
      } else if (this.packageManager === 'yarn') {
        cmd = `yarn add ${name}@${version} --no-save`;
      } else if (this.packageManager === 'pnpm') {
        cmd = `pnpm add ${name}@${version} --no-save`;
      } else {
        // Default to npm
        cmd = `npm install ${name}@${version} --no-save`;
      }

      // Execute command
      execSync(cmd, { cwd: this.projectDir, stdio: 'ignore' });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Format time in seconds to a human-readable string
   * @param seconds Time in seconds
   * @returns Formatted time string
   */
  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    }
  }
}
