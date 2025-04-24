import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

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
 * Simplified worker pool implementation that uses Promise.all instead of worker threads
 * for better compatibility and simpler implementation
 */
export class WorkerPool<T, R> {
  private numWorkers: number;
  private workerFn: (data: T) => Promise<R> | R;

  /**
   * Create a new worker pool
   * @param workerFn Function to execute for each task
   * @param numWorkers Number of workers to create
   */
  constructor(workerFn: (data: T) => Promise<R> | R, numWorkers = Math.max(1, os.cpus().length - 1)) {
    this.workerFn = workerFn;
    this.numWorkers = numWorkers;
  }

  /**
   * Initialize the worker pool
   */
  async init(): Promise<void> {
    // No initialization needed for this simplified implementation
  }

  /**
   * Execute a task
   * @param data The task data
   * @returns A promise that resolves with the task result
   */
  async execute(data: T): Promise<R> {
    try {
      return await this.workerFn(data);
    } catch (error) {
      logger.error(`Task execution error: ${error}`);
      throw error;
    }
  }

  /**
   * Execute multiple tasks in parallel
   * @param dataItems Array of task data
   * @returns A promise that resolves with an array of task results
   */
  async executeAll(dataItems: T[]): Promise<R[]> {
    // Process in batches based on number of workers
    const results: R[] = [];

    // Process in chunks to limit concurrency
    for (let i = 0; i < dataItems.length; i += this.numWorkers) {
      const chunk = dataItems.slice(i, i + this.numWorkers);
      const chunkResults = await Promise.all(chunk.map(data => this.execute(data)));
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Terminate all workers
   */
  async terminate(): Promise<void> {
    // No termination needed for this simplified implementation
  }
}

/**
 * Create a worker function that can be used with the worker pool
 * This is a simplified version that doesn't use actual worker threads
 */
export function createWorkerFunction<T, R>(fn: (data: T) => Promise<R> | R): (data: T) => Promise<R> | R {
  return fn;
}
