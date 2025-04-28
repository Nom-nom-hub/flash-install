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
  private getMemoryUsage(): number {
    return process.memoryUsage().heapUsed;
  }

  /**
   * Check if memory usage is above threshold
   * @returns True if memory usage is above threshold
   */
  private isMemoryUsageHigh(): boolean {
    const memoryUsage = this.getMemoryUsage();
    return memoryUsage > this.memoryThreshold;
  }

  /**
   * Adjust batch size based on memory usage and task timings
   */
  private adjustBatchSize(): void {
    const memoryUsage = this.getMemoryUsage();
    this.memoryUsageHistory.push(memoryUsage);

    // Keep history limited to last 10 measurements
    if (this.memoryUsageHistory.length > 10) {
      this.memoryUsageHistory.shift();
    }

    // Calculate memory trend (positive = increasing, negative = decreasing)
    const memoryTrend = this.memoryUsageHistory.length > 1
      ? (this.memoryUsageHistory[this.memoryUsageHistory.length - 1] - this.memoryUsageHistory[0])
      : 0;

    // Calculate average task time
    const avgTaskTime = this.taskTimings.length > 0
      ? this.taskTimings.reduce((sum, time) => sum + time, 0) / this.taskTimings.length
      : 0;

    // Adjust batch size based on memory usage and trend
    if (memoryUsage > this.memoryThreshold || memoryTrend > 0) {
      // Reduce batch size if memory usage is high or increasing
      this.batchSize = Math.max(this.minBatchSize, Math.floor(this.batchSize * 0.8));
      logger.debug(`Reducing batch size to ${this.batchSize} due to high memory usage`);

      // Run garbage collection if available
      if (global.gc) {
        logger.debug('Running garbage collection');
        global.gc();
      }
    } else if (memoryUsage < this.memoryThreshold * 0.7 && avgTaskTime < 1000) {
      // Increase batch size if memory usage is low and tasks are fast
      this.batchSize = Math.min(this.maxBatchSize, Math.floor(this.batchSize * 1.2));
      logger.debug(`Increasing batch size to ${this.batchSize}`);
    }
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
      const memoryUsage = this.getMemoryUsage();
      logger.debug(`Memory usage: ${Math.round(memoryUsage / 1024 / 1024)}MB`);

      // If memory usage is very high, pause briefly to allow GC
      if (memoryUsage > this.memoryLimit * 0.9) {
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
 * This version includes memory optimization and error handling
 */
export function createWorkerFunction<T, R>(fn: (data: T) => Promise<R> | R): (data: T) => Promise<R> {
  return async (data: T): Promise<R> => {
    try {
      // Check memory usage before executing task
      const memoryBefore = process.memoryUsage().heapUsed;

      // Execute the function
      const result = await fn(data);

      // Check memory usage after executing task
      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryDiff = memoryAfter - memoryBefore;

      // Log memory usage if significant
      if (memoryDiff > 10 * 1024 * 1024) { // 10MB
        logger.debug(`Task used ${Math.round(memoryDiff / 1024 / 1024)}MB of memory`);
      }

      // Run garbage collection if memory usage increased significantly
      if (memoryDiff > 50 * 1024 * 1024 && global.gc) { // 50MB
        logger.debug('Running garbage collection after memory-intensive task');
        global.gc();
      }

      return result;
    } catch (error) {
      // Log error and rethrow
      logger.error(`Worker function error: ${error}`);
      throw error;
    }
  };
}
