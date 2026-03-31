import { levels, type LoggerLevel } from '../level.ts';
import { type EggLoggerOptions } from '../utils.ts';
import { EggLogger } from './logger.ts';

/**
 * Error Logger: only prints ERROR level and above.
 */
export class EggErrorLogger extends EggLogger {
  constructor(options?: Partial<EggLoggerOptions>) {
    const opts = options ?? {};
    opts.level = getMinLevel(opts.level);
    opts.consoleLevel = getMinLevel(opts.consoleLevel);
    super(opts);
  }
}

function getMinLevel(level?: LoggerLevel): LoggerLevel {
  if (!level) return 'ERROR';
  return levels[level] >= levels.ERROR ? level : 'ERROR';
}
