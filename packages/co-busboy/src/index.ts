import type { IncomingMessage } from 'node:http';
import type { Readable } from 'node:stream';
import { debuglog } from 'node:util';

// @ts-expect-error - no types available for black-hole-stream
import BlackHoleStream from 'black-hole-stream';
import Busboy, { type BusboyConfig, type FieldInfo, type FileInfo } from 'busboy';
// @ts-expect-error - no types available for inflation
import inflate from 'inflation';

const debug = debuglog('co-busboy');

const getDescriptor = Object.getOwnPropertyDescriptor;
const isArray = Array.isArray;

/**
 * Field tuple: [name, value, fieldnameTruncated, valueTruncated]
 */
export type FieldTuple = [string, string, boolean, boolean];

/**
 * A file stream with additional properties attached
 */
export interface FileStream extends Readable {
  fieldname: string;
  filename: string;
  encoding: string;
  transferEncoding: string;
  mime: string;
  mimeType: string;
}

/**
 * A part can be either a field tuple or a file stream
 */
export type Part = FieldTuple | FileStream;

/**
 * Options for co-busboy, extends Busboy config
 */
export interface CoBusboyOptions extends Omit<BusboyConfig, 'headers'> {
  /**
   * When true, automatically collects all form fields.
   * Fields will be available via parts.field (object lookup) and parts.fields (array lookup).
   * Only file streams will be returned in the iteration.
   */
  autoFields?: boolean;

  /**
   * Hook to validate form fields.
   * Return an Error to reject the field.
   * @param name - Field name
   * @param value - Field value
   * @param fieldnameTruncated - Whether the field name was truncated
   * @param valueTruncated - Whether the value was truncated
   */
  checkField?: (
    name: string,
    value: string,
    fieldnameTruncated: boolean,
    valueTruncated: boolean,
  ) => Error | undefined | void;

  /**
   * Hook to validate file uploads.
   * Return an Error to reject the file (the stream will be consumed and discarded).
   * @param fieldname - Form field name
   * @param stream - The file stream (note: not consumed yet when this is called)
   * @param filename - Original uploaded filename
   * @param encoding - Content transfer encoding
   * @param mimetype - MIME type
   */
  checkFile?: (
    fieldname: string,
    stream: Readable,
    filename: string,
    encoding: string,
    mimetype: string,
  ) => Error | undefined | void;
}

/**
 * Custom error with status and code properties
 */
export interface CoBusboyError extends Error {
  status?: number;
  code?: string;
}

/**
 * The parts function returned by parse()
 */
export interface Parts {
  (): Promise<Part | null>;
  field: Record<string, string | string[]>;
  fields: FieldTuple[];
}

/**
 * A request-like object (Node.js IncomingMessage or Koa context)
 */
export interface RequestLike {
  req?: IncomingMessage;
  headers?: IncomingMessage['headers'];
  pipe?: IncomingMessage['pipe'];
  on?: IncomingMessage['on'];
  removeListener?: IncomingMessage['removeListener'];
}

/**
 * Promise-based queue for async iteration
 * Replaces the chan library with a simpler, type-safe implementation
 */
class PromiseQueue {
  private queue: (Part | Error | null)[] = [];
  private pendingResolvers: Array<{
    resolve: (value: Part | null) => void;
    reject: (error: Error) => void;
  }> = [];
  private finished = false;

  push(item: Part | Error | null): void {
    if (this.finished) return;

    // If item is null, mark as finished
    if (item === null) {
      this.finished = true;
    }

    const resolver = this.pendingResolvers.shift();
    if (resolver) {
      if (item instanceof Error) {
        resolver.reject(item);
      } else {
        resolver.resolve(item);
      }
    } else {
      this.queue.push(item);
    }
  }

  pull(): Promise<Part | null> {
    const item = this.queue.shift();
    if (item !== undefined) {
      if (item instanceof Error) {
        return Promise.reject(item);
      }
      return Promise.resolve(item);
    }

    // If finished and queue is empty, return null
    if (this.finished) {
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      this.pendingResolvers.push({ resolve, reject });
    });
  }
}

/**
 * Parse multipart form data from a request.
 *
 * @param request - Node.js request or Koa context
 * @param options - Busboy options with additional co-busboy options
 * @returns A parts function that yields form parts
 *
 * @example
 * ```typescript
 * import { parse } from '@eggjs/co-busboy';
 *
 * // In a Koa middleware
 * app.use(async (ctx) => {
 *   const parts = parse(ctx, { autoFields: true });
 *   let part;
 *   while ((part = await parts())) {
 *     if (Array.isArray(part)) {
 *       // It's a field: [name, value, nameTruncated, valueTruncated]
 *       console.log('Field:', part[0], '=', part[1]);
 *     } else {
 *       // It's a file stream
 *       console.log('File:', part.filename);
 *       part.resume(); // or pipe to a destination
 *     }
 *   }
 *   // Access auto-collected fields
 *   console.log(parts.field); // { fieldName: value }
 *   console.log(parts.fields); // [[name, value, ...], ...]
 * });
 * ```
 */
export function parse(request: RequestLike, options?: CoBusboyOptions): Parts {
  const promiseQueue = new PromiseQueue();

  const parts = function (): Promise<Part | null> {
    return promiseQueue.pull();
  } as Parts;

  // Koa special sauce - extract underlying request if this is a Koa context
  const req = (request.req || request) as IncomingMessage & { headers: IncomingMessage['headers'] };

  const opts: CoBusboyOptions = options || {};
  const checkField = opts.checkField;
  const checkFile = opts.checkFile;
  let lastError: Error | undefined;

  // Create busboy with headers from the request
  const busboyConfig: BusboyConfig = {
    ...opts,
    headers: req.headers,
  };
  const busboy = Busboy(busboyConfig);

  // Handle compressed requests (gzip/deflate)
  const inflatedRequest = inflate(req);
  inflatedRequest.on('close', cleanup);

  busboy.on('field', onField).on('file', onFile).on('close', cleanup).on('error', onEnd).on('finish', onEnd);

  busboy.on('partsLimit', () => {
    const err: CoBusboyError = new Error('Reach parts limit');
    err.code = 'Request_parts_limit';
    err.status = 413;
    onError(err);
  });

  busboy.on('filesLimit', () => {
    const err: CoBusboyError = new Error('Reach files limit');
    err.code = 'Request_files_limit';
    err.status = 413;
    onError(err);
  });

  busboy.on('fieldsLimit', () => {
    const err: CoBusboyError = new Error('Reach fields limit');
    err.code = 'Request_fields_limit';
    err.status = 413;
    onError(err);
  });

  inflatedRequest.pipe(busboy);

  // Auto-fields mode: collect fields automatically
  let field: Record<string, string | string[]> | undefined;
  let fields: FieldTuple[] | undefined;
  if (opts.autoFields) {
    field = parts.field = {};
    fields = parts.fields = [];
  } else {
    // Initialize even when autoFields is false for type safety
    parts.field = {};
    parts.fields = [];
  }

  return parts;

  function onField(name: string, val: string, info: FieldInfo): void {
    const fieldnameTruncated = info.nameTruncated;
    const valTruncated = info.valueTruncated;

    if (checkField) {
      const err = checkField(name, val, fieldnameTruncated, valTruncated);
      if (err) {
        debug('onField error: %s', err);
        return onError(err);
      }
    }

    const args: FieldTuple = [name, val, fieldnameTruncated, valTruncated];

    if (opts.autoFields && field && fields) {
      fields.push(args);

      // Don't overwrite prototypes
      if (getDescriptor(Object.prototype, name)) return;

      const prev = field[name];
      if (prev == null) {
        field[name] = val;
        return;
      }
      if (isArray(prev)) {
        prev.push(val);
        return;
      }
      field[name] = [prev, val];
    } else {
      promiseQueue.push(args);
    }
  }

  function onFile(fieldname: string, file: Readable, info: FileInfo): void {
    function onFileError(err: Error): void {
      debug('onFileError: %s', err);
      lastError = err;
    }

    function onFileCleanup(): void {
      debug('onFileCleanup');
      file.removeListener('error', onFileError);
      file.removeListener('end', onFileCleanup);
      file.removeListener('close', onFileCleanup);
    }

    file.on('error', onFileError);
    file.on('end', onFileCleanup);
    file.on('close', onFileCleanup);

    const { filename, encoding, mimeType } = info;

    if (checkFile) {
      const err = checkFile(fieldname, file, filename, encoding, mimeType);
      if (err) {
        // Make sure request stream's data has been read
        const blackHoleStream = new BlackHoleStream();
        file.pipe(blackHoleStream);
        return onError(err);
      }
    }

    // Attach properties to the file stream for convenience
    const fileStream = file as FileStream;
    fileStream.fieldname = fieldname;
    fileStream.filename = filename;
    fileStream.transferEncoding = fileStream.encoding = encoding;
    fileStream.mimeType = fileStream.mime = mimeType;

    promiseQueue.push(fileStream);
  }

  function onError(err: Error): void {
    debug('onError: %s', err);
    lastError = err;
  }

  function onEnd(err?: Error): void {
    cleanup();
    debug('onEnd error: %s', err);
    busboy.removeListener('finish', onEnd);

    // Remove error listener in next event loop, catch the 'Unexpected end of form' error in next tick
    setImmediate(() => {
      busboy.removeListener('error', onEnd);
    });

    // Ignore 'Unexpected end of form' if we already have an error
    if (!lastError && err && err.message !== 'Unexpected end of form') {
      lastError = err;
      debug('set lastError');
    }

    // Push the error or null to signal completion
    if (lastError) {
      promiseQueue.push(lastError);
    } else {
      promiseQueue.push(null);
    }
  }

  function cleanup(): void {
    debug('cleanup');
    // Keep finish listener to wait for all data flushed
    // Keep error listener to wait for stream error
    inflatedRequest.removeListener('close', cleanup);
    busboy.removeListener('field', onField);
    busboy.removeListener('file', onFile);
    busboy.removeListener('close', cleanup);
  }
}

// Default export for convenience
export default parse;
