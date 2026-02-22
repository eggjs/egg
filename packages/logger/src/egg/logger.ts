import path from 'node:path';

import type { LoggerLevel } from '../level.ts';
import { Logger } from '../logger.ts';
import { ConsoleTransport } from '../transports/console.ts';
import { FileTransport } from '../transports/file.ts';
import { FileBufferTransport } from '../transports/file_buffer.ts';
import type { Transport } from '../transports/transport.ts';
import { defaultFormatter, consoleFormatter, assign, type EggLoggerOptions } from '../utils.ts';

/**
 * Egg Logger: supports File, BufferedFile and Console transports.
 */
export class EggLogger extends Logger {
  constructor(options?: Partial<EggLoggerOptions>) {
    super();
    const opts = assign({} as EggLoggerOptions, this.defaults, options);
    this.options = opts as Record<string, unknown>;

    if (opts.file && opts.dir && !path.isAbsolute(opts.file)) {
      opts.file = path.join(opts.dir, opts.file);
    }

    if (opts.outputJSON === true && opts.file) {
      opts.jsonFile = opts.file.replace(/\.log$/, '.json.log');
    }

    const EggFileTransport = opts.buffer === true ? FileBufferTransport : FileTransport;

    if (!opts.outputJSONOnly) {
      const fileTransport = new EggFileTransport({
        file: opts.file!,
        level: (opts.level ?? 'INFO') as LoggerLevel,
        encoding: opts.encoding,
        formatter: opts.formatter,
        contextFormatter: opts.contextFormatter,
        paddingMessageFormatter: opts.paddingMessageFormatter,
        flushInterval: opts.flushInterval,
        eol: opts.eol,
        localStorage: opts.localStorage,
        dateISOFormat: opts.dateISOFormat,
        maxCauseChainLength: opts.maxCauseChainLength,
      });
      this.set('file', fileTransport as Transport);
    }

    if (opts.jsonFile) {
      const jsonFileTransport = new EggFileTransport({
        file: opts.jsonFile,
        level: opts.level as LoggerLevel,
        encoding: opts.encoding,
        flushInterval: opts.flushInterval,
        json: true,
        eol: opts.eol,
        localStorage: opts.localStorage,
        dateISOFormat: opts.dateISOFormat,
        maxCauseChainLength: opts.maxCauseChainLength,
      });
      this.set('jsonFile', jsonFileTransport as Transport);
    }

    const consoleTransport = new ConsoleTransport({
      level: opts.consoleLevel as LoggerLevel,
      formatter: consoleFormatter,
      contextFormatter: opts.contextFormatter,
      paddingMessageFormatter: opts.paddingMessageFormatter,
      eol: opts.eol,
      localStorage: opts.localStorage,
      dateISOFormat: opts.dateISOFormat,
      maxCauseChainLength: opts.maxCauseChainLength,
    });
    this.set('console', consoleTransport as Transport);
  }

  private get _opts(): EggLoggerOptions {
    return this.options as EggLoggerOptions;
  }

  get level(): LoggerLevel {
    return this._opts.level as LoggerLevel;
  }

  set level(level: LoggerLevel) {
    this._opts.level = level;
    for (const transport of this.values()) {
      if (transport instanceof ConsoleTransport) continue;
      transport.level = level;
    }
  }

  get consoleLevel(): LoggerLevel {
    return this._opts.consoleLevel as LoggerLevel;
  }

  set consoleLevel(level: LoggerLevel) {
    this._opts.consoleLevel = level;
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
      level: 'INFO' as LoggerLevel,
      consoleLevel: 'NONE' as LoggerLevel,
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
