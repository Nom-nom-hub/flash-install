/**
 * Timer utility for measuring performance
 */
export class Timer {
  private startTime: number = 0;
  private endTime: number = 0;
  private running: boolean = false;

  /**
   * Start the timer
   */
  start(): void {
    this.startTime = Date.now();
    this.running = true;
  }

  /**
   * Stop the timer
   */
  stop(): void {
    this.endTime = Date.now();
    this.running = false;
  }

  /**
   * Reset the timer
   */
  reset(): void {
    this.startTime = 0;
    this.endTime = 0;
    this.running = false;
  }

  /**
   * Get the elapsed time in milliseconds
   */
  getElapsedMs(): number {
    if (this.running) {
      return Date.now() - this.startTime;
    }
    return this.endTime - this.startTime;
  }

  /**
   * Get the elapsed time in seconds
   */
  getElapsedSeconds(): number {
    return this.getElapsedMs() / 1000;
  }

  /**
   * Format the elapsed time as a string
   */
  getElapsedFormatted(): string {
    const seconds = this.getElapsedSeconds();
    
    if (seconds < 60) {
      return `${seconds.toFixed(2)}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  }
}

/**
 * Create a new timer and start it
 */
export function createTimer(): Timer {
  const timer = new Timer();
  timer.start();
  return timer;
}
