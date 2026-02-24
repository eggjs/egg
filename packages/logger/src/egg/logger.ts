import path from 'node:path';

import type { LoggerLevel } from '../level.ts';
import { Logger } from '../logger.ts';
import { ConsoleTransport } from '../transports/console.ts';
import { FileTransport } from '../transports/file.ts';
import { FileBufferTransport } from '../transports/file_buffer.ts';
import { defaultFormatter, consoleFormatter, assign, type EggLoggerOptions } from '../utils.ts';

/**
 * Egg Logger: supports File, BufferedFile and Console transports.
 */
export class EggLogger extends Logger {
  readonly opts: EggLoggerOptions;

  constructor(options?: Partial<EggLoggerOptions>) {
    super();
    this.opts = assign<EggLoggerOptions>({}, this.defaults, options);
    // Keep this.options for external backward compatibility
    this.options = this.opts;

    const { opts } = this;

    if (opts.file && opts.dir && !path.isAbsolute(opts.file)) {
      opts.file = path.join(opts.dir, opts.file);
    }

    if (opts.outputJSON === true && opts.file) {
      opts.jsonFile = opts.file.replace(/\.log$/, '.json.log');
    }

    const EggFileTransport = opts.buffer === true ? FileBufferTransport : FileTransport;

    if (!opts.outputJSONOnly && opts.file) {
      this.set(
        'file',
        new EggFileTransport({
          file: opts.file!,
          level: opts.level ?? 'INFO',
          encoding: opts.encoding,
          formatter: opts.formatter,
          contextFormatter: opts.contextFormatter,
          paddingMessageFormatter: opts.paddingMessageFormatter,
          flushInterval: opts.flushInterval,
          eol: opts.eol,
          localStorage: opts.localStorage,
          dateISOFormat: opts.dateISOFormat,
          maxCauseChainLength: opts.maxCauseChainLength,
        }),
      );
    }

    if (opts.jsonFile) {
      this.set(
        'jsonFile',
        new EggFileTransport({
          file: opts.jsonFile,
          level: opts.level ?? 'INFO',
          encoding: opts.encoding,
          flushInterval: opts.flushInterval,
          json: true,
          eol: opts.eol,
          localStorage: opts.localStorage,
          dateISOFormat: opts.dateISOFormat,
          maxCauseChainLength: opts.maxCauseChainLength,
        }),
      );
    }

    this.set(
      'console',
      new ConsoleTransport({
        level: opts.consoleLevel ?? 'NONE',
        formatter: consoleFormatter,
        contextFormatter: opts.contextFormatter,
        paddingMessageFormatter: opts.paddingMessageFormatter,
        eol: opts.eol,
        localStorage: opts.localStorage,
        dateISOFormat: opts.dateISOFormat,
        maxCauseChainLength: opts.maxCauseChainLength,
      }),
    );
  }

  get level(): LoggerLevel {
    return this.opts.level!;
  }

  set level(level: LoggerLevel) {
    this.opts.level = level;
    for (const transport of this.values()) {
      if (transport instanceof ConsoleTransport) continue;
      transport.level = level;
    }
  }

  get consoleLevel(): LoggerLevel {
    return this.opts.consoleLevel!;
  }

  set consoleLevel(level: LoggerLevel) {
    this.opts.consoleLevel = level;
    for (const transport of this.values()) {
      if (transport instanceof ConsoleTransport) {
        transport.level = level;
      }
    }
  }

  get defaults(): Partial<EggLoggerOptions> {
    return {
      file: null,
      encoding: 'utf8',
      level: 'INFO',
      consoleLevel: 'NONE',
      formatter: defaultFormatter,
      buffer: true,
      outputJSON: false,
      outputJSONOnly: false,
      dateISOFormat: false,
      jsonFile: '',
      maxCauseChainLength: 10,
    };
  }
}
