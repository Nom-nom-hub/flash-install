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
   */
  update(increment = 1): void {
    this.current += increment;
    
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
    this.render();
    
    // Move to next line
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
    
    // Clear line and render
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`${this.message} ${bar} ${status}`);
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
      
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`${chalk.cyan(frame)} ${this.message} (${elapsed}s)`);
      
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
      
      // Clear line
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
  }

  /**
   * Update the spinner message
   * @param message New message
   */
  setMessage(message: string): void {
    this.message = message;
  }
}
