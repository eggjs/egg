import type { Logger } from '../logger.ts';
import { defaultContextPaddingMessage } from '../utils.ts';

let _warned = false;

/**
 * Request context Logger, wraps a Logger with context-aware padding.
 * @deprecated Use EggLogger directly with localStorage instead.
 */
export class EggContextLogger {
  ctx: unknown;
  _logger: Logger;

  constructor(ctx: unknown, logger: Logger) {
    this.ctx = ctx;
    this._logger = logger;
    if (!_warned) {
      _warned = true;
      process.emitWarning('EggContextLogger is deprecated, use the EggLogger directly', {
        type: 'DeprecationWarning',
        code: 'DEP_EGG_CONTEXT_LOGGER',
      });
    }
  }

  get paddingMessage(): string {
    return defaultContextPaddingMessage(this.ctx as Record<string, unknown>);
  }

  write(msg: string): void {
    this._logger.write(msg);
  }

  error(...args: unknown[]): void {
    this._logger.log('ERROR', args, { paddingMessage: this.paddingMessage, ctx: this.ctx });
  }

  warn(...args: unknown[]): void {
    this._logger.log('WARN', args, { paddingMessage: this.paddingMessage, ctx: this.ctx });
  }

  info(...args: unknown[]): void {
    this._logger.log('INFO', args, { paddingMessage: this.paddingMessage, ctx: this.ctx });
  }

  debug(...args: unknown[]): void {
    this._logger.log('DEBUG', args, { paddingMessage: this.paddingMessage, ctx: this.ctx });
  }
}

// Keep for backward compatibility
export { EggContextLogger as ContextLogger };
