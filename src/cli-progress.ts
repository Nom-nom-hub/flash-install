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
    const percent = Math.round((this.current / this.total) * 100);
    const elapsed = (Date.now() - this.startTime) / 1000;
    
    // Calculate speed
    const speed = this.current / Math.max(1, elapsed);
    
    // Calculate ETA
    let etaText = 'calculating...';
    if (this.current > 0) {
      const remaining = this.total - this.current;
      const eta = remaining / speed;
      
      if (eta < 60) {
        etaText = `${Math.round(eta)}s`;
      } else {
        etaText = `${Math.floor(eta / 60)}m ${Math.round(eta % 60)}s`;
      }
    }
    
    // Format elapsed time
    let elapsedText = '';
    if (elapsed < 60) {
      elapsedText = `${Math.round(elapsed)}s`;
    } else {
      elapsedText = `${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s`;
    }
    
    // Clear line
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
    
    // Write progress line
    process.stdout.write(
      `${chalk.cyan('→')} ${this.message}: ${chalk.bold(`${this.current}/${this.total}`)} ` +
      `(${percent}%) - ${speed.toFixed(1)} items/s - ETA: ${etaText}`
    );
    
    // Show recent items if available
    if (this.lastItems.length > 0) {
      console.log('');
      console.log(`  ${chalk.gray('Recent:')} ${this.lastItems.map(item => chalk.green(item)).join(', ')}`);
      
      // Move cursor back up
      process.stdout.write('\x1B[1A');
    }
  }
}
