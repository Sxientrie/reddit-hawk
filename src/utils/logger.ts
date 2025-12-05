// logger utility
// toggleable console wrapper with prefixes and levels

import { IS_DEBUG } from './constants';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

/**
 * creates a scoped logger instance
 * logs are prefixed and can be toggled globally
 */
export function createLogger(scope: string, options: LoggerOptions = {}) {
  const prefix = options.prefix ?? `[sxentrie:${scope}]`;
  const enabled = options.enabled ?? IS_DEBUG;

  function format(level: LogLevel, args: unknown[]): [string, ...unknown[]] {
    const timestamp = new Date().toISOString().slice(11, 23);
    return [`${prefix} ${timestamp}`, ...args];
  }

  return {
    info(...args: unknown[]) {
      if (enabled) console.log(...format('info', args));
    },

    warn(...args: unknown[]) {
      if (enabled) console.warn(...format('warn', args));
    },

    error(...args: unknown[]) {
      // errors always log, even in production
      console.error(...format('error', args));
    },

    debug(...args: unknown[]) {
      if (enabled) console.debug(...format('debug', args));
    },

    /** log with custom level */
    log(level: LogLevel, ...args: unknown[]) {
      if (level === 'error' || enabled) {
        console[level](...format(level, args));
      }
    },

    /** create child logger with sub-scope */
    child(subScope: string) {
      return createLogger(`${scope}:${subScope}`, options);
    },

    /** temporarily enable/disable */
    setEnabled(value: boolean) {
      (this as { enabled: boolean }).enabled = value;
    }
  };
}

// pre-configured loggers for each module
export const log = {
  bg: createLogger('bg'),           // background/service worker
  api: createLogger('api'),         // reddit-api
  poller: createLogger('poller'),   // polling engine
  ui: createLogger('ui'),           // overlay/components
  storage: createLogger('storage'), // chrome.storage
  msg: createLogger('msg')          // messaging
};

// quick access for simple logging
export const logger = createLogger('app');
