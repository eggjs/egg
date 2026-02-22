import { levels, type LoggerLevel } from '../level.ts';
import { normalizeLevel, assign, type ConsoleTransportOptions } from '../utils.ts';
import { Transport } from './transport.ts';

/**
 * Output log to console.
 * EGG_LOG env variable has the highest priority for log level.
 */
export class ConsoleTransport extends Transport<ConsoleTransportOptions> {
  constructor(options?: Partial<ConsoleTransportOptions>) {
    super(options);
    this.options.stderrLevel = normalizeLevel(this.options.stderrLevel);
    // EGG_LOG has the highest priority
    if (process.env.EGG_LOG) {
      this.options.level = normalizeLevel(process.env.EGG_LOG as LoggerLevel);
    }
  }

  override get defaults(): Partial<ConsoleTransportOptions> {
    return assign(super.defaults as ConsoleTransportOptions, {
      stderrLevel: 'ERROR' as LoggerLevel,
    });
  }

  override log(level: string, args: unknown[], meta?: import('../utils.ts').LoggerMeta): string | Buffer {
    const msg = super.log(level, args, meta);
    if (levels[level] >= (this.options.stderrLevel as number) && levels[level] < levels['NONE']) {
      process.stderr.write(msg as string);
    } else {
      process.stdout.write(msg as string);
    }
    return msg;
  }
}
