import chalk from 'chalk';

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
    if (this.config.level <= LogLevel.INFO) {
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
    if (this.config.level <= LogLevel.INFO) {
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
    if (this.config.level <= LogLevel.INFO) {
      console.info(
        this.formatMessage(chalk.cyan(`⚡ ${message}`)),
        ...args
      );
    }
  }
}

// Create and export a default logger instance
export const logger = new Logger();
