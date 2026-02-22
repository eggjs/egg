import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import { logDate } from 'utility';

import { assign, type FileTransportOptions, type LoggerMeta } from '../utils.ts';
import { Transport } from './transport.ts';

type WriteStream = fs.WriteStream & { _onError?: (err: Error) => void };

/**
 * Output log to file.
 */
export class FileTransport extends Transport<FileTransportOptions> {
  declare _stream: WriteStream | null;

  constructor(options?: Partial<FileTransportOptions>) {
    super(options);
    assert(this.options.file, 'should pass options.file');
    this._stream = null;
    this.reload();
  }

  override get defaults(): Partial<FileTransportOptions> {
    return assign(super.defaults as FileTransportOptions, {
      file: null,
      level: 'INFO',
    });
  }

  override reload(): void {
    this._closeStream();
    this._stream = this._createStream();
  }

  override log(level: string, args: unknown[], meta?: LoggerMeta): string | Buffer {
    if (!this.writable) {
      const err = new Error(`${this.options.file} log stream had been closed`);
      console.error(err.stack);
      return '';
    }
    const buf = super.log(level, args, meta);
    if ((buf as string | Buffer).length) {
      this._write(buf as string | Buffer);
    }
    return buf;
  }

  override close(): void {
    this._closeStream();
  }

  /** @deprecated use close() instead */
  override end(): void {
    process.emitWarning('transport.end() is deprecated, use transport.close()', {
      type: 'DeprecationWarning',
      code: 'DEP_EGG_LOGGER_TRANSPORT_END',
    });
    this.close();
  }

  get writable(): boolean {
    return !!(this._stream && !this._stream.closed && this._stream.writable && !this._stream.destroyed);
  }

  _write(buf: string | Buffer): void {
    this._stream!.write(buf);
  }

  _createStream(): WriteStream {
    fs.mkdirSync(path.dirname(this.options.file!), { recursive: true });
    const stream = fs.createWriteStream(this.options.file!, { flags: 'a' }) as WriteStream;

    const onError = (err: Error): void => {
      console.error(
        '%s ERROR %s [egg-logger] [%s] %s',
        logDate(','),
        process.pid,
        this.options.file,
        (err as NodeJS.ErrnoException).stack,
      );
      this.reload();
      console.warn('%s WARN %s [egg-logger] [%s] reloaded', logDate(','), process.pid, this.options.file);
    };
    stream.once('error', onError);
    stream._onError = onError;
    return stream;
  }

  _closeStream(): void {
    if (this._stream) {
      this._stream.end();
      if (this._stream._onError) {
        this._stream.removeListener('error', this._stream._onError);
      }
      this._stream = null;
    }
  }
}
