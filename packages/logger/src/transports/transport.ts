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
export class Transport<T extends TransportOptions = TransportOptions> {
  options: T;
  #enabled = true;

  constructor(options?: Partial<T>) {
    this.options = assign({} as T, this.defaults, options);
    if ((this.options as TransportOptions).encoding === 'utf-8') {
      (this.options as TransportOptions).encoding = 'utf8';
    }
    (this.options as TransportOptions).level = normalizeLevel((this.options as TransportOptions).level);
  }

  get defaults(): Partial<T> {
    return {
      level: 'NONE' as LoggerLevel,
      formatter: null,
      contextFormatter: null,
      json: false,
      encoding: 'utf8',
      eol: os.EOL,
    } as Partial<T>;
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
    (this.options as TransportOptions).level = normalizeLevel(level);
  }

  get level(): number {
    return (this.options as TransportOptions).level as number;
  }

  shouldLog(level: string): boolean {
    if (!this.#enabled) return false;
    if ((this.options as TransportOptions).level === levels['NONE']) return false;
    return ((this.options as TransportOptions).level as number) <= levels[level];
  }

  log(level: string, args: unknown[], meta?: LoggerMeta): string | Buffer {
    const opts = this.options as TransportOptions;
    if (!meta?.ctx && opts.localStorage) {
      const ctx = (opts.localStorage as AsyncLocalStorage<unknown>).getStore();
      if (ctx) {
        meta = { ...meta, ctx };
      }
    }
    return formatLog(level, args, meta, opts);
  }

  reload(): void {}
  close(): void {}
  end(): void {}
}
