import { Timer, createTimer } from '../../utils/timer.js';

describe('Timer', () => {
  let timer: Timer;

  beforeEach(() => {
    timer = new Timer();
  });

  test('should start with 0 elapsed time', () => {
    expect(timer.getElapsedMs()).toBe(0);
  });

  test('should track elapsed time after start', () => {
    timer.start();
    // Allow some time to pass
    const elapsed = timer.getElapsedMs();
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });

  test('should stop tracking time after stop', () => {
    timer.start();
    timer.stop();
    const elapsed1 = timer.getElapsedMs();
    
    // Wait a bit
    setTimeout(() => {
      const elapsed2 = timer.getElapsedMs();
      expect(elapsed1).toBe(elapsed2);
    }, 10);
  });

  test('should reset timer', () => {
    timer.start();
    timer.stop();
    timer.reset();
    expect(timer.getElapsedMs()).toBe(0);
  });

  test('should format elapsed time correctly', () => {
    timer.start();
    timer.stop();
    const formatted = timer.getElapsedFormatted();
    expect(formatted).toMatch(/^\d+\.\d+s$/);
  });

  test('createTimer should return a started timer', () => {
    const newTimer = createTimer();
    expect(newTimer.getElapsedMs()).toBeGreaterThanOrEqual(0);
  });
});
