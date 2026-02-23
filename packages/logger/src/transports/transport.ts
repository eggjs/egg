import type { AsyncLocalStorage } from 'node:async_hooks';
import os from 'node:os';

import { levels, type LoggerLevel } from '../level.ts';
import { normalizeLevel, formatLog, assign, type LoggerMeta, type TransportOptions } from '../utils.ts';

export type { TransportOptions };

/**
 * Transport is an output channel of the log that can be output to a file,
 * console or service.
 * A Logger can configure multiple Transports to meet a variety of complex needs.
 */
export class Transport {
  options: TransportOptions;
  #enabled = true;

  constructor(options?: Partial<TransportOptions>) {
    this.options = assign<TransportOptions>({}, this.defaults, options);
    if (this.options.encoding === 'utf-8') {
      this.options.encoding = 'utf8';
    }
    const normalizedLevel = normalizeLevel(this.options.level);
    if (normalizedLevel !== undefined) {
      this.options.level = normalizedLevel;
    }
  }

  get defaults(): Partial<TransportOptions> {
    return {
      level: 'NONE' as LoggerLevel,
      formatter: null,
      contextFormatter: null,
      json: false,
      encoding: 'utf8',
      eol: os.EOL,
    };
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  enable(): void {
    this.#enabled = true;
  }

  disable(): void {
    this.#enabled = false;
  }

  set level(level: LoggerLevel | number) {
    const normalized = normalizeLevel(level);
    if (normalized !== undefined) {
      this.options.level = normalized;
    }
  }

  get level(): number {
    return this.options.level as number;
  }

  shouldLog(level: string): boolean {
    if (!this.#enabled) return false;
    if (this.options.level === levels['NONE']) return false;
    return (this.options.level as number) <= levels[level];
  }

  log(level: string, args: unknown[], meta?: LoggerMeta): string | Buffer {
    if (!meta?.ctx && this.options.localStorage) {
      const ctx = (this.options.localStorage as AsyncLocalStorage<unknown>).getStore();
      if (ctx) {
        meta = { ...meta, ctx };
      }
    }
    return formatLog(level, args, meta, this.options);
  }

  reload(): void {}
  close(): void {}
  end(): void {}
}
