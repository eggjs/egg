import util from 'node:util';

import type { LoggerLevel } from './level.ts';
import type { Transport } from './transports/transport.ts';
import type { LoggerMeta } from './utils.ts';

export interface DuplicateLoggerEntry {
  logger: Logger;
  options: { excludes?: string[] };
}

/**
 * Base class for all Logger classes.
 * It extends Map and can contain multiple Transports.
 */
export class Logger<T extends Transport = Transport> extends Map<string, T> {
  options: Record<string, unknown>;
  name: string;
  redirectLoggers: Map<string, Logger>;
  duplicateLoggers: Map<string, DuplicateLoggerEntry>;

  constructor(options?: Record<string, unknown>) {
    super();
    this.options = Object.assign({}, options);
    this.name = this.constructor.name;
    this.redirectLoggers = new Map();
    this.duplicateLoggers = new Map();
  }

  disable(name: string): void {
    const transport = this.get(name);
    if (transport) transport.disable();
  }

  enable(name: string): void {
    const transport = this.get(name);
    if (transport) transport.enable();
  }

  log(level: string, args: unknown[], meta?: LoggerMeta): void {
    let excludes: string[] | undefined;
    const dupEntry = this.duplicateLoggers.get(level);
    let dupLogger: Logger | undefined;

    if (dupEntry) {
      excludes = dupEntry.options.excludes;
      dupLogger = dupEntry.logger;
      dupLogger.log(level, args, meta);
    } else {
      const redirectLogger = this.redirectLoggers.get(level);
      if (redirectLogger) {
        redirectLogger.log(level, args, meta);
        return;
      }
    }

    for (const [key, transport] of this.entries()) {
      if (transport.shouldLog(level) && !(excludes && excludes.includes(key))) {
        transport.log(level, args, meta);
      }
    }
  }

  write(msg: string, ...rest: unknown[]): void {
    if (rest.length > 0) msg = util.format(msg, ...rest);
    this.log('NONE', [msg], { raw: true });
  }

  redirect(level: string, logger: Logger): void {
    const lvl = level.toUpperCase() as LoggerLevel;
    if (!this.redirectLoggers.has(lvl) && logger instanceof Logger) {
      this.redirectLoggers.set(lvl, logger);
    }
  }

  unredirect(level: string): void {
    this.redirectLoggers.delete(level.toUpperCase() as LoggerLevel);
  }

  duplicate(level: string, logger: Logger, options: { excludes?: string[] } = {}): void {
    const lvl = level.toUpperCase() as LoggerLevel;
    if (!this.duplicateLoggers.has(lvl) && logger instanceof Logger) {
      this.duplicateLoggers.set(lvl, { logger, options });
    }
  }

  unduplicate(level: string): void {
    this.duplicateLoggers.delete(level.toUpperCase() as LoggerLevel);
  }

  reload(): void {
    for (const transport of this.values()) {
      transport.reload();
    }
  }

  close(): void {
    for (const transport of this.values()) {
      transport.close();
    }
  }

  /** @deprecated use close() instead */
  end(): void {
    process.emitWarning('logger.end() is deprecated, use logger.close()', {
      type: 'DeprecationWarning',
      code: 'DEP_EGG_LOGGER_END',
    });
    this.close();
  }

  error(...args: unknown[]): void {
    this.log('ERROR', args);
  }

  warn(...args: unknown[]): void {
    this.log('WARN', args);
  }

  info(...args: unknown[]): void {
    this.log('INFO', args);
  }

  debug(...args: unknown[]): void {
    this.log('DEBUG', args);
  }
}
