import chalk from 'chalk';
import { logger } from './logger.js';

/**
 * Simple progress indicator for cloud operations
 */
export class CloudProgress {
  private message: string;
  private startTime: number;
  private interval: NodeJS.Timeout | null = null;
  private frames: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private frameIndex: number = 0;
  
  /**
   * Create a new cloud progress indicator
   * @param message Progress message
   */
  constructor(message: string) {
    this.message = message;
    this.startTime = Date.now();
  }
  
  /**
   * Start the progress indicator
   */
  start(): void {
    if (this.interval) {
      return;
    }
    
    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      
      // Clear previous output
      process.stdout.write('\r\x1b[K');
      
      // Write new output
      process.stdout.write(`${chalk.cyan(frame)} ${this.message} ${chalk.gray(`(${elapsed}s)`)}`);
      
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }
  
  /**
   * Stop the progress indicator
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      
      // Clear previous output
      process.stdout.write('\r\x1b[K');
    }
  }
  
  /**
   * Update the progress message
   * @param message New message
   */
  updateStatus(message: string): void {
    this.message = message;
  }
}
