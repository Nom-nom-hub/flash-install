import chalk from 'chalk';
import { logger } from './logger.js';

/**
 * Progress indicator for terminal output
 */
export class ProgressIndicator {
  private total: number;
  private current: number = 0;
  private message: string;
  private startTime: number;
  private lastUpdateTime: number = 0;
  private updateInterval: number;
  private completed: boolean = false;
  private recentItems: string[] = [];
  private activityIndicator: number = 0;
  private activitySymbols: string[] = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];

  /**
   * Create a new progress indicator
   * @param total Total number of items
   * @param message Progress message
   * @param updateInterval Minimum interval between updates in ms
   */
  constructor(total: number, message: string, updateInterval = 100) {
    this.total = total;
    this.message = message;
    this.startTime = Date.now();
    this.updateInterval = updateInterval;
  }

  /**
   * Update the progress
   * @param increment Amount to increment by
   * @param itemName Optional name of the item being processed
   */
  update(increment = 1, itemName?: string): void {
    this.current += increment;

    // Add item to recent items list if provided
    if (itemName) {
      this.recentItems.unshift(itemName);
      // Keep only the 3 most recent items
      if (this.recentItems.length > 3) {
        this.recentItems.pop();
      }
    }

    // Throttle updates to avoid terminal flickering
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }

    this.lastUpdateTime = now;
    this.render();
  }

  /**
   * Set the current progress
   * @param current Current progress
   */
  setCurrent(current: number): void {
    this.current = current;

    // Throttle updates to avoid terminal flickering
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }

    this.lastUpdateTime = now;
    this.render();
  }

  /**
   * Complete the progress
   */
  complete(): void {
    if (this.completed) {
      return;
    }

    this.current = this.total;
    this.completed = true;

    // Calculate elapsed time
    const elapsed = (Date.now() - this.startTime) / 1000;

    // Format elapsed time
    let elapsedText = '';
    if (elapsed < 60) {
      elapsedText = `${elapsed.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(elapsed / 60);
      const seconds = Math.floor(elapsed % 60);
      elapsedText = `${minutes}m ${seconds}s`;
    }

    // Clear any previous output
    process.stdout.write('\r\x1b[K');

    // Write completion message
    process.stdout.write(`${chalk.green('✓')} ${this.message} completed in ${chalk.bold(elapsedText)}\n`);

    // Add a blank line for better readability
    process.stdout.write('\n');
  }

  /**
   * Render the progress bar
   */
  private render(): void {
    // Calculate percentage
    const percent = Math.min(100, Math.floor((this.current / this.total) * 100));

    // Calculate elapsed time
    const elapsed = (Date.now() - this.startTime) / 1000;

    // Calculate estimated time remaining
    let eta = '?';
    if (this.current > 0) {
      const itemsPerSecond = this.current / elapsed;
      const remainingItems = this.total - this.current;
      const remainingSeconds = remainingItems / itemsPerSecond;

      if (remainingSeconds < 60) {
        eta = `${remainingSeconds.toFixed(0)}s`;
      } else {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = Math.floor(remainingSeconds % 60);
        eta = `${minutes}m ${seconds}s`;
      }
    }

    // Create progress bar
    const barWidth = 30;
    const completeWidth = Math.floor((percent / 100) * barWidth);
    const incompleteWidth = barWidth - completeWidth;

    const bar =
      chalk.cyan('█'.repeat(completeWidth)) +
      chalk.gray('░'.repeat(incompleteWidth));

    // Create status line
    const status = `${this.current}/${this.total} (${percent}%) - ETA: ${eta}`;

    // Get activity indicator
    this.activityIndicator = (this.activityIndicator + 1) % this.activitySymbols.length;
    const activity = chalk.cyan(this.activitySymbols[this.activityIndicator]);

    // Format recent items
    let recentItemsText = '';
    if (this.recentItems.length > 0) {
      recentItemsText = `\n  ${activity} Recent: ${this.recentItems.map(item => chalk.green(item)).join(', ')}`;
    }

    // Format speed
    const speed = this.current > 0 ? (this.current / elapsed).toFixed(1) : '0.0';
    const speedText = `\n  ${chalk.cyan('⚡')} Speed: ${chalk.yellow(speed)} packages/sec`;

    // Format elapsed time
    let elapsedText = '';
    if (elapsed < 60) {
      elapsedText = `${elapsed.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(elapsed / 60);
      const seconds = Math.floor(elapsed % 60);
      elapsedText = `${minutes}m ${seconds}s`;
    }
    const timeText = `\n  ${chalk.cyan('⏱')} Elapsed: ${chalk.yellow(elapsedText)}`;

    // Clear lines and render
    process.stdout.write('\r\x1b[K');  // Clear current line
    process.stdout.write(`${this.message} ${bar} ${status}${recentItemsText}${speedText}${timeText}`);

    // Move cursor back to the first line
    if (recentItemsText || speedText || timeText) {
      process.stdout.write('\x1b[2A');  // Move cursor up 2 lines
    }
  }
}

/**
 * Create a spinner animation for indeterminate progress
 */
export class Spinner {
  private frames: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private message: string;
  private interval: NodeJS.Timeout | null = null;
  private frameIndex: number = 0;
  private startTime: number;
  private details: string[] = [];
  private maxDetails: number = 3;

  /**
   * Create a new spinner
   * @param message Spinner message
   */
  constructor(message: string) {
    this.message = message;
    this.startTime = Date.now();
  }

  /**
   * Start the spinner
   */
  start(): void {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);

      // Format details
      let detailsText = '';
      if (this.details.length > 0) {
        detailsText = '\n  ' + this.details.map(d => `${chalk.cyan('•')} ${d}`).join('\n  ');
      }

      // Clear previous output
      process.stdout.write('\r\x1b[K');

      // Write new output
      process.stdout.write(`${chalk.cyan(frame)} ${this.message} ${chalk.gray(`(${elapsed}s)`)}${detailsText}`);

      // Move cursor back to the first line if we have details
      if (detailsText) {
        process.stdout.write(`\x1b[${this.details.length}A`);
      }

      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }

  /**
   * Stop the spinner
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;

      // Calculate elapsed time
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);

      // Clear previous output including any detail lines
      const lines = this.details.length + 1;
      for (let i = 0; i < lines; i++) {
        process.stdout.write('\r\x1b[K');
        if (i < lines - 1) {
          process.stdout.write('\x1b[1B');
        }
      }

      // Move back to the first line
      if (lines > 1) {
        process.stdout.write(`\x1b[${lines - 1}A`);
      }
    }
  }

  /**
   * Update the spinner message
   * @param message New message
   */
  setMessage(message: string): void {
    this.message = message;
  }

  /**
   * Add a detail message to the spinner
   * @param detail Detail message to add
   */
  addDetail(detail: string): void {
    this.details.unshift(detail);
    if (this.details.length > this.maxDetails) {
      this.details.pop();
    }
  }
}
