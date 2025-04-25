import chalk from 'chalk';

/**
 * Simple progress reporter that uses direct console output
 */
export class SimpleProgress {
  private total: number;
  private current: number = 0;
  private startTime: number;
  private name: string;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 1000; // ms
  private completed: boolean = false;

  /**
   * Create a new simple progress reporter
   * @param total Total number of items
   * @param name Name of the operation
   */
  constructor(total: number, name: string) {
    this.total = total;
    this.name = name;
    this.startTime = Date.now();
  }

  /**
   * Start the progress reporting
   */
  start(): void {
    const timestamp = this.getTimestamp();
    console.log(`${chalk.cyan('→')} ${timestamp} ${this.name} started (0/${this.total})`);
  }

  /**
   * Update progress
   * @param increment Amount to increment by
   * @param itemName Name of the item being processed
   */
  update(increment: number = 1, itemName?: string): void {
    this.current += increment;
    
    // Ensure we don't exceed the total
    if (this.current > this.total) {
      this.current = this.total;
    }
    
    // Throttle updates to avoid console spam
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateInterval && this.current < this.total) {
      return;
    }
    
    this.lastUpdateTime = now;
    
    // Calculate progress percentage
    const percent = Math.round((this.current / this.total) * 100);
    
    // Calculate elapsed time
    const elapsed = (now - this.startTime) / 1000;
    
    // Calculate speed
    const speed = this.current / Math.max(1, elapsed);
    
    // Calculate ETA
    let etaText = 'calculating...';
    if (this.current > 0 && speed > 0) {
      const remaining = this.total - this.current;
      const eta = remaining / speed;
      
      if (eta < 60) {
        etaText = `${Math.round(eta)}s`;
      } else {
        etaText = `${Math.floor(eta / 60)}m ${Math.round(eta % 60)}s`;
      }
    }
    
    // Get timestamp
    const timestamp = this.getTimestamp();
    
    // Log progress
    if (itemName) {
      console.log(`${chalk.green('✓')} ${timestamp} Processed ${chalk.bold(itemName)} (${this.current}/${this.total}, ${percent}%)`);
    }
    
    // Log summary every few updates
    if (this.current % 5 === 0 || this.current === this.total) {
      console.log(`${chalk.cyan('→')} ${timestamp} Progress: ${this.current}/${this.total} (${percent}%) - Speed: ${speed.toFixed(1)}/sec - ETA: ${etaText}`);
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
    
    // Calculate elapsed time
    const elapsed = (Date.now() - this.startTime) / 1000;
    
    // Format elapsed time
    let elapsedText = '';
    if (elapsed < 60) {
      elapsedText = `${Math.round(elapsed)}s`;
    } else {
      elapsedText = `${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s`;
    }
    
    // Get timestamp
    const timestamp = this.getTimestamp();
    
    // Log completion
    console.log(`${chalk.green('✓')} ${timestamp} ${this.name} completed in ${chalk.bold(elapsedText)}`);
  }

  /**
   * Get current timestamp
   * @returns Formatted timestamp
   */
  private getTimestamp(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return chalk.gray(`[${hours}:${minutes}:${seconds}]`);
  }
}
