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
      const elapsed = Math.max(0.1, (Date.now() - this.startTime) / 1000);
      const elapsedText = elapsed.toFixed(1);

      // Clear line and move cursor to beginning
      process.stdout.write('\r' + ' '.repeat(100) + '\r');

      // Write progress with npm-style formatting
      if (this.status) {
        process.stdout.write(`${chalk.cyan(frame)} ${this.message} ${chalk.gray(`(${elapsedText}s)`)} - ${this.status}`);
      } else {
        process.stdout.write(`${chalk.cyan(frame)} ${this.message} ${chalk.gray(`(${elapsedText}s)`)}`);
      }

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
      process.stdout.write('\r' + ' '.repeat(100) + '\r');

      // Add a newline for better readability
      if (!this.completed) {
        console.log('');
      }
    }
  }

  /**
   * Complete the progress
   * @param message Completion message
   */
  complete(message: string = ''): void {
    if (this.completed) {
      return;
    }

    this.completed = true;
    this.stop();

    // Calculate elapsed time
    const elapsed = Math.max(0.1, (Date.now() - this.startTime) / 1000);
    let elapsedText = '';
    if (elapsed < 60) {
      elapsedText = `${elapsed.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(elapsed / 60);
      const seconds = Math.round(elapsed % 60);
      elapsedText = `${minutes}m ${seconds}s`;
    }

    // Use the provided message or default to the progress message
    const completionMessage = message || `${this.message} completed`;
    console.log(`${chalk.green('✓')} ${completionMessage} in ${chalk.bold(elapsedText)}`);
  }
}
