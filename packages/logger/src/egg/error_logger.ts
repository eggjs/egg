import { levels, type LoggerLevel } from '../level.ts';
import { normalizeLevel, type EggLoggerOptions } from '../utils.ts';
import { EggLogger } from './logger.ts';

/**
 * Error Logger: only prints ERROR level and above.
 */
export class EggErrorLogger extends EggLogger {
  constructor(options?: Partial<EggLoggerOptions>) {
    const opts = options ?? {};
    opts.level = getDefaultLevel(opts.level);
    opts.consoleLevel = getDefaultLevel(opts.consoleLevel);
    super(opts);
  }
}

function getDefaultLevel(level?: LoggerLevel | number): number {
  const normalized = normalizeLevel(level);
  if (normalized === undefined) return levels.ERROR;
  return normalized > levels.ERROR ? normalized : levels.ERROR;
}
