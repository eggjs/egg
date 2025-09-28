import assert from 'node:assert';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable, PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';

// @ts-expect-error no types
import parse from 'co-busboy';
import dayjs from 'dayjs';
import { Context } from 'egg';

import { humanizeBytes } from '../../lib/utils.ts';
import { LimitError } from '../../lib/LimitError.ts';
import { MultipartFileTooLargeError } from '../../lib/MultipartFileTooLargeError.ts';

const HAS_CONSUMED = Symbol('Context#multipartHasConsumed');

export interface EggFile {
  field: string;
  filename: string;
  encoding: string;
  mime: string;
  filepath: string;
}

export interface MultipartFileStream extends Readable {
  fields: Record<string, any>;
  filename: string;
  fieldname: string;
  mime: string;
  mimeType: string;
  transferEncoding: string;
  encoding: string;
  truncated: boolean;
}

export interface MultipartOptions {
  autoFields?: boolean;
  /**
   * required file submit, default is true
   */
  requireFile?: boolean;
  /**
   * default charset encoding
   */
  defaultCharset?: string;
  /**
   * compatible with defaultCharset
   * @deprecated use `defaultCharset` instead
   */
  defCharset?: string;
  defaultParamCharset?: string;
  /**
   * compatible with defaultParamCharset
   * @deprecated use `defaultParamCharset` instead
   */
  defParamCharset?: string;
  limits?: {
    fieldNameSize?: number;
    fieldSize?: number;
    fields?: number;
    fileSize?: number;
    files?: number;
    parts?: number;
    headerPairs?: number;
  };
  checkFile?(fieldname: string, file: any, filename: string, encoding: string, mimetype: string): void | Error;
}

export default class MultipartContext extends Context {
  /**
   * create multipart.parts instance, to get separated files.
   * @function Context#multipart
   * @param {Object} [options] - override default multipart configurations
   *  - {Boolean} options.autoFields
   *  - {String} options.defaultCharset
   *  - {String} options.defaultParamCharset
   *  - {Object} options.limits
   *  - {Function} options.checkFile
   * @return {Yieldable | AsyncIterable<Yieldable>} parts
   */
  multipart(options: MultipartOptions = {}): AsyncIterable<MultipartFileStream> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;
    // multipart/form-data
    if (!ctx.is('multipart')) ctx.throw(400, 'Content-Type must be multipart/*');

    assert(!ctx[HAS_CONSUMED], "the multipart request can't be consumed twice");
    ctx[HAS_CONSUMED] = true;

    const { autoFields, defaultCharset, defaultParamCharset, checkFile } = ctx.app.config.multipart;
    const { fieldNameSize, fieldSize, fields, fileSize, files } = ctx.app.config.multipart;
    options = extractOptions(options);

    const parseOptions = Object.assign(
      {
        autoFields,
        defCharset: defaultCharset,
        defParamCharset: defaultParamCharset,
        checkFile,
      },
      options
    );

    // https://github.com/mscdex/busboy#busboy-methods
    // merge limits
    parseOptions.limits = Object.assign(
      {
        fieldNameSize,
        fieldSize,
        fields,
        fileSize,
        files,
      },
      options.limits
    );

    // mount asyncIterator, so we can use `for await` to get parts
    const parts = parse(this, parseOptions);
    parts[Symbol.asyncIterator] = async function* () {
      let part: MultipartFileStream | undefined;
      do {
        part = await parts();

        if (!part) continue;

        if (Array.isArray(part)) {
          if (part[3]) throw new LimitError('Request_fieldSize_limit', 'Reach fieldSize limit');
          // TODO: still not support at busboy 1.x (only support at urlencoded)
          // https://github.com/mscdex/busboy/blob/v0.3.1/lib/types/multipart.js#L5
          // https://github.com/mscdex/busboy/blob/master/lib/types/multipart.js#L251
          // if (part[2]) throw new LimitError('Request_fieldNameSize_limit', 'Reach fieldNameSize limit');
        } else {
          // user click `upload` before choose a file, `part` will be file stream, but `part.filename` is empty must handler this, such as log error.
          if (!part.filename) {
            ctx.coreLogger.debug(
              '[egg-multipart] file field `%s` is upload without file stream, will drop it.',
              part.fieldname
            );
            await pipeline(part, new PassThrough());
            continue;
          }
          // TODO: check whether filename is malicious input

          // busboy only set truncated when consume the stream
          if (part.truncated) {
            // in case of emit 'limit' too fast
            throw new LimitError('Request_fileSize_limit', 'Reach fileSize limit');
          } else {
            part.once('limit', function (this: MultipartFileStream) {
              this.emit('error', new LimitError('Request_fileSize_limit', 'Reach fileSize limit'));
              this.resume();
            });
          }
        }

        // dispatch part to outter logic such as for-await-of
        yield part;
      } while (part !== undefined);
    };
    return parts;
  }

  /**
   * save request multipart data and files to `ctx.request`
   * @function Context#saveRequestFiles
   * @param {Object} options - { limits, checkFile, ... }
   */
  async saveRequestFiles(options: MultipartOptions = {}) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;

    const allowArrayField = ctx.app.config.multipart.allowArrayField;

    let storeDir: string | undefined;

    const requestBody: Record<string, any> = {};
    const requestFiles: EggFile[] = [];

    options.autoFields = false;
    const parts = ctx.multipart(options);

    try {
      for await (const part of parts) {
        if (Array.isArray(part)) {
          // fields
          const [fieldName, fieldValue] = part;
          if (!allowArrayField) {
            requestBody[fieldName] = fieldValue;
          } else {
            if (!requestBody[fieldName]) {
              requestBody[fieldName] = fieldValue;
            } else if (!Array.isArray(requestBody[fieldName])) {
              requestBody[fieldName] = [requestBody[fieldName], fieldValue];
            } else {
              requestBody[fieldName].push(fieldValue);
            }
          }
        } else {
          // stream
          const { filename, fieldname, encoding, mime } = part;

          if (!storeDir) {
            // ${tmpdir}/YYYY/MM/DD/HH
            storeDir = path.join(ctx.app.config.multipart.tmpdir, dayjs().format('YYYY/MM/DD/HH'));
            await fs.mkdir(storeDir, { recursive: true });
          }

          // write to tmp file
          const filepath = path.join(storeDir, randomUUID() + path.extname(filename));
          const target = createWriteStream(filepath);
          await pipeline(part, target);

          const meta = {
            filepath,
            field: fieldname,
            filename,
            encoding,
            mime,
            // keep same property name as file stream, https://github.com/cojs/busboy/blob/master/index.js#L114
            fieldname,
            transferEncoding: encoding,
            mimeType: mime,
          };

          requestFiles.push(meta);
        }
      }
    } catch (err) {
      await ctx.cleanupRequestFiles(requestFiles);
      throw err;
    }

    ctx.request.body = requestBody;
    ctx.request.files = requestFiles;
  }

  /**
   * get upload file stream
   * @example
   * ```js
   * const stream = await ctx.getFileStream();
   * // get other fields
   * console.log(stream.fields);
   * ```
   * @function Context#getFileStream
   * @param {Object} options
   *  - {Boolean} options.requireFile - required file submit, default is true
   *  - {String} options.defaultCharset
   *  - {String} options.defaultParamCharset
   *  - {Object} options.limits
   *  - {Function} options.checkFile
   * @return {ReadStream} stream
   * @since 1.0.0
   * @deprecated Not safe enough, use `ctx.multipart()` instead
   */
  async getFileStream(options: MultipartOptions = {}): Promise<MultipartFileStream> {
    options.autoFields = true;
    const parts: any = this.multipart(options);
    let stream: MultipartFileStream = await parts();

    if (options.requireFile !== false) {
      // stream not exists, treat as an exception
      if (!stream || !stream.filename) {
        this.throw(400, "Can't found upload file");
      }
    }

    if (!stream) {
      stream = Readable.from([]) as MultipartFileStream;
    }

    if (stream.truncated) {
      throw new LimitError('Request_fileSize_limit', 'Request file too large, please check multipart config');
    }

    stream.fields = parts.field;
    stream.once('limit', () => {
      const err = new MultipartFileTooLargeError(
        'Request file too large, please check multipart config',
        stream.fields,
        stream.filename
      );
      if (stream.listenerCount('error') > 0) {
        stream.emit('error', err);
        this.coreLogger.warn(err);
      } else {
        this.coreLogger.error(err);
        // ignore next error event
        stream.on('error', () => {});
      }
      // ignore all data
      stream.resume();
    });
    return stream;
  }

  /**
   * clean up request tmp files helper
   * @function Context#cleanupRequestFiles
   * @param {Array<String>} [files] - file paths need to cleanup, default is `ctx.request.files`.
   */
  async cleanupRequestFiles(files?: EggFile[]) {
    if (!files || !files.length) {
      files = this.request.files;
    }
    if (Array.isArray(files)) {
      for (const file of files) {
        try {
          await fs.rm(file.filepath, { force: true, recursive: true });
        } catch (err) {
          // warning log
          this.coreLogger.warn('[egg-multipart-cleanupRequestFiles-error] file: %j, error: %s', file, err);
        }
      }
    }
  }
}

function extractOptions(options: MultipartOptions = {}) {
  const opts: MultipartOptions = {};
  if (typeof options.autoFields === 'boolean') {
    opts.autoFields = options.autoFields;
  }
  if (options.limits) {
    opts.limits = options.limits;
  }
  if (options.checkFile) {
    opts.checkFile = options.checkFile;
  }

  if (options.defCharset) {
    opts.defCharset = options.defCharset;
  }
  if (options.defParamCharset) {
    opts.defParamCharset = options.defParamCharset;
  }
  // compatible with config names
  if (options.defaultCharset) {
    opts.defCharset = options.defaultCharset;
  }
  if (options.defaultParamCharset) {
    opts.defParamCharset = options.defaultParamCharset;
  }

  // limits
  if (options.limits) {
    const limits: Record<string, number | undefined> = (opts.limits = { ...options.limits });
    for (const key in limits) {
      if (key.endsWith('Size') && limits[key]) {
        limits[key] = humanizeBytes(limits[key]);
      }
    }
  }

  return opts;
}

declare module 'egg' {
  interface Request {
    /**
     * Files Object Array
     */
    files?: EggFile[];
  }

  interface Context {
    saveRequestFiles(options?: MultipartOptions): Promise<void>;
    getFileStream(options?: MultipartOptions): Promise<MultipartFileStream>;
    cleanupRequestFiles(files?: EggFile[]): Promise<void>;
  }
}
