import chalk from 'chalk';

/**
 * A simple progress reporter that provides clear, informative output
 */
export class ProgressReporter {
  private total: number;
  private current: number = 0;
  private startTime: number;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 500; // ms
  private recentItems: string[] = [];
  private maxRecentItems: number = 5;
  private completed: boolean = false;
  private name: string;

  /**
   * Create a new progress reporter
   * @param total Total number of items
   * @param name Name of the operation
   */
  constructor(total: number, name: string) {
    this.total = total;
    this.name = name;
    this.startTime = Date.now();
  }

  /**
   * Update progress
   * @param increment Amount to increment by
   * @param itemName Name of the item being processed
   */
  update(increment: number = 1, itemName?: string): void {
    this.current += increment;
    
    if (itemName) {
      this.recentItems.unshift(itemName);
      if (this.recentItems.length > this.maxRecentItems) {
        this.recentItems.pop();
      }
    }
    
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }
    
    this.lastUpdateTime = now;
    this.render();
  }

  /**
   * Render progress
   */
  private render(): void {
    if (this.completed) return;
    
    // Calculate progress percentage
    const progress = Math.min(100, Math.round((this.current / this.total) * 100));
    
    // Calculate elapsed time
    const elapsed = (Date.now() - this.startTime) / 1000;
    
    // Calculate speed
    const speed = this.current / elapsed;
    
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
    
    // Format elapsed time
    let elapsedText = '';
    if (elapsed < 60) {
      elapsedText = `${Math.round(elapsed)}s`;
    } else {
      elapsedText = `${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s`;
    }
    
    // Create progress line
    console.log(`${chalk.cyan('→')} ${this.name}: ${chalk.bold(`${this.current}/${this.total}`)} (${progress}%)`);
    console.log(`  ${chalk.gray(`Speed: ${speed.toFixed(1)} items/sec, Elapsed: ${elapsedText}, ETA: ${etaText}`)}`);
    
    // Show recent items
    if (this.recentItems.length > 0) {
      console.log(`  ${chalk.gray('Recent:')} ${this.recentItems.map(item => chalk.green(item)).join(', ')}`);
    }
    
    // Add empty line for readability
    console.log('');
  }

  /**
   * Complete the progress
   */
  complete(): void {
    if (this.completed) return;
    
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
    
    console.log(`${chalk.green('✓')} ${this.name} completed in ${chalk.bold(elapsedText)}`);
    console.log('');
  }
}
