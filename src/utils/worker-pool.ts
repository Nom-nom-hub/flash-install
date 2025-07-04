import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import { performance } from 'perf_hooks';

/**
 * Task to be executed by a worker
 */
export interface WorkerTask<T, R> {
  id: string;
  data: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
}

/**
 * Memory-efficient worker pool implementation that uses Promise.all with
 * dynamic batch sizing and memory monitoring
 */
export class WorkerPool<T, R> {
  private numWorkers: number;
  private workerFn: (data: T) => Promise<R> | R;
  private memoryLimit: number;
  private memoryThreshold: number;
  private batchSize: number;
  private maxBatchSize: number;
  private minBatchSize: number;
  private memoryUsageHistory: number[] = [];
  private taskTimings: number[] = [];
  private isInitialized: boolean = false;
  private taskTimeoutMs: number;

  /**
   * Create a new worker pool
   * @param workerFn Function to execute for each task
   * @param numWorkers Number of workers to create
   * @param options Additional options
   */
  constructor(
    workerFn: (data: T) => Promise<R> | R,
    numWorkers = Math.max(1, os.cpus().length - 1),
    options: {
      memoryLimitPercentage?: number;
      memoryThresholdPercentage?: number;
      initialBatchSize?: number;
      maxBatchSize?: number;
      minBatchSize?: number;
      taskTimeoutMs?: number;
    } = {}
  ) {
    this.workerFn = workerFn;
    this.numWorkers = numWorkers;

    // Get total system memory
    const totalMemory = os.totalmem();

    // Set memory limit (default: 80% of total memory)
    const memoryLimitPercentage = options.memoryLimitPercentage || 80;
    this.memoryLimit = totalMemory * (memoryLimitPercentage / 100);

    // Set memory threshold for throttling (default: 70% of total memory)
    const memoryThresholdPercentage = options.memoryThresholdPercentage || 70;
    this.memoryThreshold = totalMemory * (memoryThresholdPercentage / 100);

    // Set batch sizes
    this.batchSize = options.initialBatchSize || numWorkers * 2;
    this.maxBatchSize = options.maxBatchSize || numWorkers * 10;
    this.minBatchSize = options.minBatchSize || numWorkers;

    this.taskTimeoutMs = options.taskTimeoutMs || 120000; // Default: 2 minutes

    logger.debug(`Worker pool created with ${numWorkers} workers`);
    logger.debug(`Memory limit: ${Math.round(this.memoryLimit / 1024 / 1024)}MB`);
    logger.debug(`Memory threshold: ${Math.round(this.memoryThreshold / 1024 / 1024)}MB`);
    logger.debug(`Initial batch size: ${this.batchSize}`);
  }

  /**
   * Initialize the worker pool
   */
  async init(): Promise<void> {
    // Run garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Initialize memory usage history
    this.memoryUsageHistory = [process.memoryUsage().heapUsed];
    this.isInitialized = true;

    logger.debug(`Worker pool initialized`);
  }

  /**
   * Get current memory usage
   * @returns Memory usage in bytes
   */
  /**
   * Get detailed memory usage information
   * @returns Object with memory usage details
   */
  private getMemoryUsage(): {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
    percentUsed: number;
  } {
    const memInfo = process.memoryUsage();
    const totalMemory = os.totalmem();
    return {
      heapUsed: memInfo.heapUsed,
      heapTotal: memInfo.heapTotal,
      rss: memInfo.rss,
      external: memInfo.external,
      percentUsed: (memInfo.heapUsed / totalMemory) * 100
    };
  }

  /**
   * Check if memory usage is above threshold
   * @returns True if memory usage is above threshold
   */
  private isMemoryUsageHigh(): boolean {
    const memoryInfo = this.getMemoryUsage();
    return memoryInfo.heapUsed > this.memoryThreshold;
  }

  /**
   * Check if memory usage is critically high
   * @returns True if memory usage is critically high (above 90% of limit)
   */
  private isMemoryUsageCritical(): boolean {
    const memoryInfo = this.getMemoryUsage();
    return memoryInfo.heapUsed > this.memoryLimit * 0.9;
  }

  /**
   * Adjust batch size based on memory usage and task timings
   * Uses a more sophisticated algorithm to prevent memory issues
   */
  private adjustBatchSize(): void {
    const memoryInfo = this.getMemoryUsage();
    this.memoryUsageHistory.push(memoryInfo.heapUsed);

    // Keep history limited to last 15 measurements for better trend analysis
    if (this.memoryUsageHistory.length > 15) {
      this.memoryUsageHistory.shift();
    }

    // Calculate memory trend using linear regression for more accuracy
    let memoryTrend = 0;
    if (this.memoryUsageHistory.length > 5) {
      const n = this.memoryUsageHistory.length;
      const indices = Array.from({ length: n }, (_, i) => i);
      const sumX = indices.reduce((sum, x) => sum + x, 0);
      const sumY = this.memoryUsageHistory.reduce((sum, y) => sum + y, 0);
      const sumXY = indices.reduce((sum, x, i) => sum + x * this.memoryUsageHistory[i], 0);
      const sumXX = indices.reduce((sum, x) => sum + x * x, 0);

      // Calculate slope of the trend line (bytes per step)
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      memoryTrend = slope;
    } else {
      // Fallback to simple trend calculation if not enough data points
      memoryTrend = this.memoryUsageHistory.length > 1
        ? (this.memoryUsageHistory[this.memoryUsageHistory.length - 1] - this.memoryUsageHistory[0])
        : 0;
    }

    // Calculate average task time with outlier removal
    let avgTaskTime = 0;
    if (this.taskTimings.length > 0) {
      // Sort timings and remove outliers (top and bottom 10% if we have enough samples)
      const sortedTimings = [...this.taskTimings].sort((a, b) => a - b);
      const trimAmount = this.taskTimings.length > 10 ? Math.floor(this.taskTimings.length * 0.1) : 0;
      const trimmedTimings = sortedTimings.slice(trimAmount, sortedTimings.length - trimAmount);

      // Calculate average of trimmed timings
      avgTaskTime = trimmedTimings.reduce((sum, time) => sum + time, 0) / trimmedTimings.length;
    }

    // Log detailed memory information periodically
    logger.debug(`Memory usage: ${(memoryInfo.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(memoryInfo.heapTotal / 1024 / 1024).toFixed(2)}MB (${memoryInfo.percentUsed.toFixed(1)}%)`);
    logger.debug(`Memory trend: ${(memoryTrend > 0 ? '+' : '')}${(memoryTrend / 1024 / 1024).toFixed(2)}MB per step`);
    logger.debug(`Average task time: ${avgTaskTime.toFixed(2)}ms`);

    // Determine adjustment factor based on memory conditions
    let adjustmentFactor = 1.0;

    // Critical memory condition - aggressive reduction
    if (this.isMemoryUsageCritical()) {
      adjustmentFactor = 0.5; // Reduce by 50%
      logger.warn(`Critical memory usage detected (${memoryInfo.percentUsed.toFixed(1)}%), aggressively reducing batch size`);

      // Force garbage collection in critical situations
      if (global.gc) {
        logger.debug('Running garbage collection due to critical memory usage');
        global.gc();
      }

      // Add a brief pause to allow memory to be reclaimed
      setTimeout(() => {}, 500);
    }
    // High memory usage - moderate reduction
    else if (this.isMemoryUsageHigh() || memoryTrend > 5 * 1024 * 1024) { // Trend increasing by more than 5MB per step
      adjustmentFactor = 0.8; // Reduce by 20%
      logger.debug(`High memory usage or increasing trend, reducing batch size`);

      // Run garbage collection if available
      if (global.gc) {
        logger.debug('Running garbage collection due to high memory usage');
        global.gc();
      }
    }
    // Low memory usage and fast tasks - increase
    else if (memoryInfo.heapUsed < this.memoryThreshold * 0.6 && avgTaskTime < 500 && memoryTrend < 1 * 1024 * 1024) {
      adjustmentFactor = 1.2; // Increase by 20%
      logger.debug(`Low memory usage and fast tasks, increasing batch size`);
    }
    // Moderate memory usage but fast tasks - slight increase
    else if (memoryInfo.heapUsed < this.memoryThreshold * 0.75 && avgTaskTime < 800) {
      adjustmentFactor = 1.1; // Increase by 10%
      logger.debug(`Moderate memory usage but fast tasks, slightly increasing batch size`);
    }

    // Apply adjustment with bounds checking
    const newBatchSize = Math.floor(this.batchSize * adjustmentFactor);
    this.batchSize = Math.max(this.minBatchSize, Math.min(this.maxBatchSize, newBatchSize));

    logger.debug(`Adjusted batch size to ${this.batchSize}`);
  }

  /**
   * Execute a task with performance monitoring
   * @param data The task data
   * @returns A promise that resolves with the task result
   */
  async execute(data: T): Promise<R> {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const startTime = performance.now();
      const result = await this.workerFn(data);
      const endTime = performance.now();

      // Record task timing
      const taskTime = endTime - startTime;
      this.taskTimings.push(taskTime);

      // Keep timings limited to last 100 tasks
      if (this.taskTimings.length > 100) {
        this.taskTimings.shift();
      }

      return result;
    } catch (error) {
      logger.error(`Task execution error: ${error}`);
      throw error;
    }
  }

  /**
   * Execute a task with retries
   * @param data The task data
   * @param maxRetries Maximum number of retries
   * @returns A promise that resolves with the task result
   */
  async runTask(data: T, maxRetries = 3): Promise<R> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // If not the first attempt, wait before retrying
        if (attempt > 0) {
          const delay = Math.min(100 * Math.pow(2, attempt), 2000); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          logger.debug(`Retrying task (attempt ${attempt}/${maxRetries})`);
        }

        return await this.execute(data);
      } catch (error) {
        lastError = error as Error;

        // Check if memory usage is high
        if (this.isMemoryUsageHigh()) {
          logger.warn('Memory usage is high, waiting before retry');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Run garbage collection if available
          if (global.gc) {
            logger.debug('Running garbage collection');
            global.gc();
          }
        }
      }
    }

    throw lastError || new Error('Task failed after maximum retries');
  }

  /**
   * Execute multiple tasks in parallel with adaptive batch sizing
   * @param dataItems Array of task data
   * @returns A promise that resolves with an array of task results
   */
  async executeAll(dataItems: T[]): Promise<R[]> {
    if (!this.isInitialized) {
      await this.init();
    }

    // Process in batches with adaptive sizing
    const results: R[] = [];
    let processedCount = 0;

    while (processedCount < dataItems.length) {
      // Check memory usage and adjust batch size
      this.adjustBatchSize();

      // Calculate current batch size
      const currentBatchSize = Math.min(this.batchSize, dataItems.length - processedCount);

      // Get current batch
      const batch = dataItems.slice(processedCount, processedCount + currentBatchSize);

      // Process batch
      logger.debug(`Processing batch of ${batch.length} items (${processedCount + batch.length}/${dataItems.length})`);
      const batchStartTime = performance.now();

      const batchResults = await Promise.all(
        batch.map(data => this.execute(data))
      );

      const batchEndTime = performance.now();
      logger.debug(`Batch completed in ${Math.round(batchEndTime - batchStartTime)}ms`);

      // Add results
      results.push(...batchResults);
      processedCount += batch.length;

      // Check memory usage after batch
      const memoryInfo = this.getMemoryUsage();
      logger.debug(`Memory usage: ${Math.round(memoryInfo.heapUsed / 1024 / 1024)}MB`);

      // If memory usage is very high, pause briefly to allow GC
      if (memoryInfo.heapUsed > this.memoryLimit * 0.9) {
        logger.warn('Memory usage is very high, pausing to allow garbage collection');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Run garbage collection if available
        if (global.gc) {
          logger.debug('Running garbage collection');
          global.gc();
        }
      }
    }

    return results;
  }

  /**
   * Terminate all workers
   */
  async terminate(): Promise<void> {
    // Clear memory usage history and task timings
    this.memoryUsageHistory = [];
    this.taskTimings = [];

    // Run garbage collection if available
    if (global.gc) {
      global.gc();
    }

    logger.debug('Worker pool terminated');
  }
}

/**
 * Create a worker function that can be used with the worker pool
 * Enhanced version with improved memory management and error handling
 */
export function createWorkerFunction<T, R>(fn: (data: T) => Promise<R> | R, timeoutMs = 120000): (data: T) => Promise<R> {
  return async (data: T): Promise<R> => {
    // Track start time for performance monitoring
    const startTime = performance.now();

    try {
      // Check memory usage before executing task
      const memoryBefore = process.memoryUsage();
      const totalMemory = os.totalmem();
      const memoryPercentBefore = (memoryBefore.heapUsed / totalMemory) * 100;

      // Check if memory is already high before starting task
      if (memoryPercentBefore > 80) {
        logger.warn(`High memory usage detected before task execution: ${memoryPercentBefore.toFixed(1)}%`);

        // Run garbage collection if available
        if (global.gc) {
          logger.debug('Running garbage collection before memory-intensive task');
          global.gc();
        }

        // Brief pause to allow memory to be reclaimed
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Execute the function with timeout protection for long-running tasks
      const timeoutPromise = new Promise<R>((_, reject) => {
        const timeout = setTimeout(() => {
          clearTimeout(timeout);
          reject(new Error(`Task execution timed out (${timeoutMs/1000}s)`));
        }, timeoutMs);
      });

      // Race between the actual task and the timeout
      const result = await Promise.race([fn(data), timeoutPromise]);

      // Check memory usage after executing task
      const memoryAfter = process.memoryUsage();
      const memoryDiff = memoryAfter.heapUsed - memoryBefore.heapUsed;
      const memoryPercentAfter = (memoryAfter.heapUsed / totalMemory) * 100;
      const memoryPercentChange = memoryPercentAfter - memoryPercentBefore;

      // Calculate execution time
      const executionTime = performance.now() - startTime;

      // Log detailed memory usage for significant changes
      if (memoryDiff > 10 * 1024 * 1024 || memoryPercentChange > 1) { // 10MB or 1% change
        logger.debug(`Task memory usage: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB (${memoryPercentChange.toFixed(1)}% change)`);
        logger.debug(`Task execution time: ${executionTime.toFixed(2)}ms`);
      }

      // Adaptive garbage collection threshold based on total memory
      // For systems with less memory, we trigger GC more aggressively
      const gcThresholdMB = totalMemory < 4 * 1024 * 1024 * 1024 ? 30 : 50; // 30MB for <4GB systems, 50MB otherwise

      // Run garbage collection if memory usage increased significantly
      if ((memoryDiff > gcThresholdMB * 1024 * 1024 || memoryPercentAfter > 75) && global.gc) {
        logger.debug(`Running garbage collection after memory-intensive task (${(memoryDiff / 1024 / 1024).toFixed(2)}MB used)`);
        global.gc();
      }

      return result;
    } catch (error) {
      // Calculate execution time even for failed tasks
      const executionTime = performance.now() - startTime;

      // Enhanced error logging with more context
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error(`Worker function error after ${executionTime.toFixed(2)}ms: ${errorMessage}`);

      if (errorStack) {
        logger.debug(`Error stack: ${errorStack}`);
      }

      // Categorize errors for better handling
      if (errorMessage.includes('ENOENT')) {
        throw new Error(`File not found error: ${errorMessage}`);
      } else if (errorMessage.includes('EACCES') || errorMessage.includes('EPERM')) {
        throw new Error(`Permission error: ${errorMessage}`);
      } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timed out')) {
        throw new Error(`Timeout error: ${errorMessage}`);
      } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
        throw new Error(`Network error: ${errorMessage}`);
      } else {
        throw error; // Rethrow original error for other cases
      }
    }
  };
}
