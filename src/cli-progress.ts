import chalk from 'chalk';

/**
 * Simple CLI progress reporter
 */
export class CliProgress {
  private total: number;
  private current: number = 0;
  private startTime: number;
  private updateInterval: NodeJS.Timeout | null = null;
  private message: string;
  private lastItems: string[] = [];
  private maxLastItems: number = 3;
  private completed: boolean = false;

  /**
   * Create a new CLI progress reporter
   * @param total Total number of items
   * @param message Progress message
   */
  constructor(total: number, message: string) {
    this.total = total;
    this.message = message;
    this.startTime = Date.now();
  }

  /**
   * Start progress reporting
   */
  start(): void {
    if (this.updateInterval) {
      return;
    }

    // Initial progress report
    this.renderProgress();

    // Set up interval for regular updates
    this.updateInterval = setInterval(() => {
      this.renderProgress();
    }, 1000);
  }

  /**
   * Update progress
   * @param increment Amount to increment by
   * @param item Optional item name
   */
  update(increment: number = 1, item?: string): void {
    this.current += increment;

    if (item) {
      this.lastItems.unshift(item);
      if (this.lastItems.length > this.maxLastItems) {
        this.lastItems.pop();
      }
    }

    // Ensure we don't exceed the total
    if (this.current > this.total) {
      this.current = this.total;
    }
  }

  /**
   * Complete the progress
   */
  complete(): void {
    if (this.completed) {
      return;
    }

    this.completed = true;
    this.current = this.total;

    // Render final progress
    this.renderProgress();

    // Clear interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Move to next line
    console.log('');
  }

  /**
   * Render progress to console
   */
  private renderProgress(): void {
    const percent = Math.min(100, Math.round((this.current / this.total) * 100));
    const elapsed = Math.max(0.1, (Date.now() - this.startTime) / 1000);

    // Calculate speed with safety checks
    const speed = Math.max(0, Math.min(1000, this.current / elapsed));

    // Calculate ETA
    let etaText = 'calculating...';
    if (this.current > 0 && speed > 0) {
      const remaining = Math.max(0, this.total - this.current);
      const eta = remaining / speed;

      if (eta < 60) {
        etaText = `${Math.ceil(eta)}s`;
      } else {
        const minutes = Math.floor(eta / 60);
        const seconds = Math.ceil(eta % 60);
        etaText = `${minutes}m ${seconds}s`;
      }
    }

    // Format elapsed time
    let elapsedText = '';
    if (elapsed < 60) {
      elapsedText = `${Math.round(elapsed)}s`;
    } else {
      const minutes = Math.floor(elapsed / 60);
      const seconds = Math.round(elapsed % 60);
      elapsedText = `${minutes}m ${seconds}s`;
    }

    // Create progress bar (npm-style)
    const barWidth = 30;
    const completeWidth = Math.floor((percent / 100) * barWidth);
    const incompleteWidth = barWidth - completeWidth;

    const bar =
      chalk.green('█'.repeat(completeWidth)) +
      chalk.gray('░'.repeat(incompleteWidth));

    // Clear line
    process.stdout.write('\r' + ' '.repeat(100) + '\r');

    // Write progress line (npm-style)
    process.stdout.write(
      `${this.message} ${bar} ${this.current}/${this.total} (${percent}%) - ETA: ${etaText}`
    );

    // Show recent items if available
    if (this.lastItems.length > 0) {
      console.log('');
      console.log(`  ${chalk.gray('Recent:')} ${this.lastItems.map(item => chalk.green(item)).join(', ')}`);
      console.log(`  ${chalk.gray('Speed:')} ${speed.toFixed(1)} packages/sec, ${chalk.gray('Time:')} ${elapsedText}`);

      // Move cursor back up
      process.stdout.write('\x1B[2A');
    }
  }
}
