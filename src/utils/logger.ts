import chalk from 'chalk';
import { table } from 'table';

/**
 * Log levels for the application
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

/**
 * Configuration for the logger
 */
export interface LoggerConfig {
  level: LogLevel;
  timestamps: boolean;
}

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  level: LogLevel.INFO,
  timestamps: false
};

// Global quiet mode flag
let globalQuietMode = false;

/**
 * Set global quiet mode
 */
export function setQuietMode(quiet: boolean): void {
  globalQuietMode = quiet;
}

/**
 * Check if quiet mode is enabled
 */
export function isQuietMode(): boolean {
  return globalQuietMode;
}

/**
 * Logger class for consistent logging throughout the application
 */
export class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Enable or disable timestamps
   */
  setTimestamps(enabled: boolean): void {
    this.config.timestamps = enabled;
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    if (enabled) {
      this.config.level = LogLevel.DEBUG;
      console.log(chalk.cyan('Debug mode enabled'));
    }
  }

  /**
   * Format a log message with optional timestamp
   */
  private formatMessage(message: string): string {
    if (this.config.timestamps) {
      const timestamp = new Date().toISOString();
      return `[${timestamp}] ${message}`;
    }
    return message;
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.DEBUG) {
      console.debug(
        this.formatMessage(chalk.gray(`[debug] ${message}`)),
        ...args
      );
    }
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.INFO && !globalQuietMode) {
      console.info(
        this.formatMessage(chalk.blue(`ℹ ${message}`)),
        ...args
      );
    }
  }

  /**
   * Log a success message
   */
  success(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.INFO && !globalQuietMode) {
      console.info(
        this.formatMessage(chalk.green(`✓ ${message}`)),
        ...args
      );
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.WARN) {
      console.warn(
        this.formatMessage(chalk.yellow(`⚠ ${message}`)),
        ...args
      );
    }
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.ERROR) {
      console.error(
        this.formatMessage(chalk.red(`✖ ${message}`)),
        ...args
      );
    }
  }

  /**
   * Log a flash-install branded message
   */
  flash(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.INFO && !globalQuietMode) {
      console.info(
        this.formatMessage(chalk.cyan(`⚡ ${message}`)),
        ...args
      );
    }
  }
}

// Export common styling functions for direct use
export const format = {
  bold: chalk.bold,
  green: chalk.green,
  red: chalk.red,
  yellow: chalk.yellow,
  cyan: chalk.cyan,
  blue: chalk.blue,
  gray: chalk.gray,
  success: (message: string) => chalk.green(`✓ ${message}`),
  error: (message: string) => chalk.red(`✖ ${message}`),
  warn: (message: string) => chalk.yellow(`⚠ ${message}`),
  info: (message: string) => chalk.blue(`ℹ ${message}`),
  flash: (message: string) => chalk.cyan(`⚡ ${message}`)
};

/**
 * Log a formatted table to the console.
 * @param data The data for the table (array of arrays for rows, or array of objects for auto-columns)
 * @param options Table formatting options
 */
export function logTable(data: (string | number)[][] | Record<string, any>[], options?: {
  headers?: string[];
  columns?: { width?: number; alignment?: 'left' | 'center' | 'right' }[];
  border?: boolean;
}): void {
  if (isQuietMode()) {
    return;
  }

  let tableData: (string | number)[][] = [];
  let headers: string[] = [];

  if (Array.isArray(data) && data.length > 0 && !Array.isArray(data[0])) {
    // Data is an array of objects, infer headers
    headers = Object.keys(data[0]);
    tableData.push(headers);
    for (const row of data) {
      tableData.push(Object.values(row));
    }
  } else if (options?.headers) {
    // Headers provided, assume data is array of arrays
    headers = options.headers;
    tableData.push(headers);
    tableData = tableData.concat(data as (string | number)[][]);
  } else {
    // No headers, assume data is array of arrays
    tableData = data as (string | number)[][];
  }

  const tableConfig: any = {
    columns: options?.columns?.map(col => ({ width: col.width, alignment: col.alignment })),
    drawHorizontalLine: options?.border === false
      ? () => false
      : (index: number, size: number) => index === 0 || index === 1 || index === size
  };

  console.log(table(tableData, tableConfig));
}

// Create and export a default logger instance
export const logger = new Logger();
