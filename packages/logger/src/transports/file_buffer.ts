import { type FileTransportOptions } from '../utils.ts';
import { FileTransport } from './file.ts';

/**
 * Extends FileTransport, saves log in memory and flushes to file at intervals.
 */
export class FileBufferTransport extends FileTransport {
  declare _bufSize: number;
  declare _buf: Array<string | Buffer>;
  declare _timer: ReturnType<typeof setInterval> | null;

  constructor(options?: Partial<FileTransportOptions>) {
    super(options);
    this._bufSize = 0;
    this._buf = [];
    this._timer = this._createInterval();
  }

  override get defaults(): Partial<FileTransportOptions> {
    return {
      ...super.defaults,
      flushInterval: 1000,
      maxBufferLength: 1000,
    };
  }

  override close(): void {
    this._closeInterval();
    super.close();
  }

  flush(): void {
    if (this._buf.length > 0 && this.writable) {
      if (this.options.encoding === 'utf8') {
        this._stream!.write((this._buf as string[]).join(''));
      } else {
        this._stream!.write(Buffer.concat(this._buf as Buffer[], this._bufSize));
      }
      this._buf = [];
      this._bufSize = 0;
    }
  }

  override _closeStream(): void {
    if (this._buf && this._buf.length > 0) {
      this.flush();
    }
    super._closeStream();
  }

  override _write(buf: string | Buffer): void {
    this._bufSize += typeof buf === 'string' ? Buffer.byteLength(buf) : buf.length;
    this._buf.push(buf);
    if (this._buf.length > (this.options.maxBufferLength ?? 1000)) {
      this.flush();
    }
  }

  _createInterval(): ReturnType<typeof setInterval> {
    return setInterval(() => this.flush(), this.options.flushInterval ?? 1000);
  }

  _closeInterval(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}
