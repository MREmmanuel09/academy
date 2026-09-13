/**
 * Structured logger for the Academy platform.
 *
 * Outputs JSON-formatted logs suitable for log aggregation services
 * (Datadog, ELK, CloudWatch, etc.).
 *
 * Usage:
 * ```ts
 * import { logger } from '@/lib/logger';
 *
 * logger.info('User registered', { userId, email });
 * logger.error('SRS review failed', { cardId, error });
 * logger.warn('Rate limit exceeded', { ip, action });
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatEntry(level: LogLevel, message: string, data?: Record<string, unknown>): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const formatted = formatEntry(level, message, data);

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'debug':
      console.debug(formatted);
      break;
    default:
      // biome-ignore lint/suspicious/noConsoleLog: this file IS the console logger
      console.log(formatted);
  }
}

export const logger = {
  debug(message: string, data?: Record<string, unknown>) {
    log('debug', message, data);
  },

  info(message: string, data?: Record<string, unknown>) {
    log('info', message, data);
  },

  warn(message: string, data?: Record<string, unknown>) {
    log('warn', message, data);
  },

  error(message: string, data?: Record<string, unknown>) {
    log('error', message, data);
  },

  /**
   * Create a child logger with pre-filled context.
   */
  child(context: Record<string, unknown>) {
    return {
      debug: (message: string, data?: Record<string, unknown>) =>
        log('debug', message, { ...context, ...data }),
      info: (message: string, data?: Record<string, unknown>) =>
        log('info', message, { ...context, ...data }),
      warn: (message: string, data?: Record<string, unknown>) =>
        log('warn', message, { ...context, ...data }),
      error: (message: string, data?: Record<string, unknown>) =>
        log('error', message, { ...context, ...data }),
    };
  },
};
