/**
 * A simple spinner implementation that works reliably in all terminals
 */
export class SimpleSpinner {
  private frames: string[];
  private message: string;
  private interval: NodeJS.Timeout | null = null;
  private frameIndex: number = 0;
  private startTime: number;
  private isActive: boolean = false;

  /**
   * Create a new simple spinner
   * @param message The message to display
   */
  constructor(message: string = 'Loading...') {
    this.frames = ['|', '/', '-', '\\'];
    this.message = message;
    this.startTime = Date.now();
  }

  /**
   * Start the spinner
   */
  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.startTime = Date.now();
    this.frameIndex = 0;
    
    // Show initial frame
    this.render();
    
    this.interval = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      this.render();
    }, 100);
  }

  /**
   * Stop the spinner
   */
  stop(): void {
    if (!this.isActive) return;
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    this.isActive = false;
    
    // Clear the spinner line
    process.stdout.write('\r' + ' '.repeat(100) + '\r');
  }

  /**
   * Update the spinner message
   * @param message The new message
   */
  setMessage(message: string): void {
    this.message = message;
    if (this.isActive) {
      this.render();
    }
  }

  /**
   * Render the current frame
   */
  private render(): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const frame = this.frames[this.frameIndex];
    const text = `\r${frame} ${this.message} (${elapsed}s elapsed)${' '.repeat(20)}`;
    process.stdout.write(text);
  }
}
