import type { LoggerLevel } from '../level.ts';
import { Logger } from '../logger.ts';
import { ConsoleTransport } from '../transports/console.ts';
import type { Transport } from '../transports/transport.ts';
import { consoleFormatter, type TransportOptions } from '../utils.ts';

/**
 * Terminal Logger: sends all log output to console.
 */
export class EggConsoleLogger extends Logger {
  constructor(options?: Partial<TransportOptions>) {
    super();
    this.options = Object.assign({}, this.defaults, options);

    const opts = this.options as TransportOptions;
    this.set(
      'console',
      new ConsoleTransport({
        level: opts.level as LoggerLevel,
        formatter: consoleFormatter,
        maxCauseChainLength: opts.maxCauseChainLength,
      }) as Transport,
    );
  }

  get defaults(): Partial<TransportOptions> {
    return {
      encoding: 'utf8',
      level: (process.env.NODE_CONSOLE_LOGGRE_LEVEL ??
        (process.env.NODE_ENV === 'production' ? 'INFO' : 'WARN')) as LoggerLevel,
      maxCauseChainLength: 10,
    };
  }
}
