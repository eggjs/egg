import type { LoggerLevel } from '../level.ts';
import { Logger } from '../logger.ts';
import { ConsoleTransport } from '../transports/console.ts';
import { consoleFormatter, assign, type EggConsoleLoggerOptions } from '../utils.ts';

/**
 * Terminal Logger: sends all log output to console.
 * Uses egg's server environment (EGG_SERVER_ENV or options.env) to determine default level.
 * Production (prod) defaults to INFO; other environments default to WARN.
 */
export class EggConsoleLogger extends Logger {
  constructor(options?: Partial<EggConsoleLoggerOptions>) {
    super();
    const opts = assign<EggConsoleLoggerOptions>({}, this.defaults, options);
    const env = opts.env ?? process.env.EGG_SERVER_ENV ?? '';
    const envLevel = process.env.NODE_CONSOLE_LOGGER_LEVEL as LoggerLevel | undefined;
    const defaultLevel: LoggerLevel = env === 'prod' ? 'INFO' : 'WARN';
    const level: LoggerLevel = (opts.level as LoggerLevel) ?? envLevel ?? defaultLevel;

    this.set(
      'console',
      new ConsoleTransport({
        level,
        formatter: consoleFormatter,
        maxCauseChainLength: opts.maxCauseChainLength,
      }),
    );
  }

  get defaults(): Partial<EggConsoleLoggerOptions> {
    return {
      encoding: 'utf8',
      maxCauseChainLength: 10,
    };
  }
}
