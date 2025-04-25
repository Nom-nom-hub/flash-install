import chalk from 'chalk';

/**
 * Simple, reliable progress reporter
 */
export class ReliableProgress {
  private message: string;
  private startTime: number;
  private interval: NodeJS.Timeout | null = null;
  private frameIndex: number = 0;
  private frames: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private status: string = '';
  private completed: boolean = false;

  /**
   * Create a new progress reporter
   * @param message Progress message
   */
  constructor(message: string) {
    this.message = message;
    this.startTime = Date.now();
  }

  /**
   * Start the progress reporter
   */
  start(): void {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      
      // Clear line and move cursor to beginning
      process.stdout.write('\r' + ' '.repeat(80) + '\r');
      
      // Write progress
      process.stdout.write(`${chalk.cyan(frame)} ${this.message} (${elapsed}s elapsed) ${this.status}`);
      
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }

  /**
   * Update the status message
   * @param status New status message
   */
  updateStatus(status: string): void {
    this.status = status;
  }

  /**
   * Stop the progress reporter
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      
      // Clear line
      process.stdout.write('\r' + ' '.repeat(80) + '\r');
    }
  }

  /**
   * Complete the progress
   * @param message Completion message
   */
  complete(message: string): void {
    if (this.completed) {
      return;
    }
    
    this.stop();
    this.completed = true;
    
    // Calculate elapsed time
    const elapsed = (Date.now() - this.startTime) / 1000;
    let elapsedText = '';
    if (elapsed < 60) {
      elapsedText = `${Math.round(elapsed)}s`;
    } else {
      elapsedText = `${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s`;
    }
    
    console.log(`${chalk.green('✓')} ${message} in ${chalk.bold(elapsedText)}`);
  }
}
