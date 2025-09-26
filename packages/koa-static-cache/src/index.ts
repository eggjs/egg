import crypto from 'node:crypto';
import { debuglog, promisify } from 'node:util';
import fs from 'node:fs/promises';
import { createReadStream, statSync, readFileSync } from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

import mime from 'mime-types';
import { compressible } from '@eggjs/compressible';
import readDir from 'fs-readdir-recursive';
import { exists, decodeURIComponent as safeDecodeURIComponent } from 'utility';

const debug = debuglog('egg/koa-static-cache');

const gzip = promisify(zlib.gzip);

export type FileFilter = (path: string) => boolean;

export interface FileMeta {
  maxAge?: number;
  cacheControl?: string | ((path: string) => string);
  buffer?: Buffer;
  zipBuffer?: Buffer;
  type?: string;
  mime?: string;
  mtime?: Date;
  path?: string;
  md5?: string;
  length?: number;
}

export interface FileMap {
  [path: string]: FileMeta;
}

export interface FileStore {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

export interface Options {
  /**
   * The root directory from which to serve static assets
   * Default to `process.cwd`
   */
  dir?: string;
  /**
   * The max age for cache control
   * Default to `0`
   */
  maxAge?: number;
  /**
   * The cache control header for static files
   * Default to `undefined`
   * Overrides `options.maxAge`
   */
  cacheControl?: string | ((path: string) => string);
  /**
   * store the files in memory instead of streaming from the filesystem on each request
   */
  buffer?: boolean;
  /**
   * when request's accept-encoding include gzip, files will compressed by gzip
   * Default to `false`
   */
  gzip?: boolean;
  /**
   * try use gzip files, loaded from disk, like nginx gzip_static
   * Default to `false`
   */
  usePrecompiledGzip?: boolean;
  /**
   * object map of aliases
   * Default to `{}`
   */
  alias?: Record<string, string>;
  /**
   * the url prefix you wish to add
   * Default to `''`
   */
  prefix?: string;
  /**
   * filter files at init dir, for example - skip non build (source) files.
   * If array set - allow only listed files
   * Default to `undefined`
   */
  filter?: FileFilter | string[];
  /**
   * dynamic load file which not cached on initialization
   * Default to `false
   */
  dynamic?: boolean;
  /**
   * caches the assets on initialization or not,
   * always work together with `options.dynamic`
   * Default to `true`
   */
  preload?: boolean;
  /**
   * file store for caching
   * Default to `undefined`
   */
  files?: FileMap | FileStore;
}

type Next = () => Promise<void>;

export class FileManager {
  store?: FileStore;
  map?: FileMap;

  constructor(store?: FileStore | FileMap) {
    if (store && typeof store.set === 'function' && typeof store.get === 'function') {
      this.store = store as FileStore;
    } else {
      this.map = store || Object.create(null);
    }
  }

  get(key: string) {
    return this.store ? this.store.get(key) : this.map![key];
  }

  set(key: string, value: FileMeta) {
    if (this.store) {
      return this.store.set(key, value);
    }
    this.map![key] = value;
  }
}

type MiddlewareFunc = (ctx: any, next: Next) => Promise<void> | void;

export function staticCache(): MiddlewareFunc;
export function staticCache(dir: string): MiddlewareFunc;
export function staticCache(options: Options): MiddlewareFunc;
export function staticCache(dir: string, options: Options): MiddlewareFunc;
export function staticCache(dir: string, options: Options, files: FileMap | FileStore): MiddlewareFunc;
export function staticCache(
  dirOrOptions?: string | Options,
  options: Options = {},
  filesStoreOrMap?: FileMap | FileStore
): MiddlewareFunc {
  let dir = '';
  if (typeof dirOrOptions === 'string') {
    // dir priority than options.dir
    dir = dirOrOptions;
  } else if (dirOrOptions) {
    options = dirOrOptions;
  }
  if (!dir && options.dir) {
    dir = options.dir;
  }
  if (!dir) {
    // default to process.cwd
    dir = process.cwd();
  }
  dir = path.normalize(dir);
  debug('staticCache dir: %s', dir);

  // prefix must be ASCII code
  options.prefix = (options.prefix ?? '').replace(/\/*$/, '/');
  const files = new FileManager(filesStoreOrMap ?? options.files);
  const enableGzip = !!options.gzip;
  const filePrefix = path.normalize(options.prefix.replace(/^\//, ''));

  // option.filter
  let fileFilter: FileFilter = () => {
    return true;
  };
  if (Array.isArray(options.filter)) {
    fileFilter = (file: string) => {
      return (options.filter as string[]).includes(file);
    };
  }
  if (typeof options.filter === 'function') {
    fileFilter = options.filter;
  }

  if (options.preload !== false) {
    debug('preload: %s', dir);
    readDir(dir, filename => {
      // ignore dot files and node_modules
      return !filename.startsWith('.') && filename !== 'node_modules';
    })
      .filter(fileFilter)
      .forEach(name => {
        loadFile(name, dir, options, files);
      });
    debug('preload end');
  }

  debug('prepare middleware');
  return async (ctx: any, next: Next) => {
    // only accept HEAD and GET
    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return await next();
    // check prefix first to avoid calculate
    if (!ctx.path.startsWith(options.prefix)) return await next();

    // decode for `/%E4%B8%AD%E6%96%87`
    // normalize for `//index`
    let filename = path.normalize(safeDecodeURIComponent(ctx.path));

    // check alias
    if (options.alias && options.alias[filename]) {
      filename = options.alias[filename];
    }

    let file = files.get(filename) as FileMeta;
    // try to load file
    if (!file) {
      if (!options.dynamic) return await next();
      if (path.basename(filename)[0] === '.') return await next();
      if (filename.charAt(0) === path.sep) {
        filename = filename.slice(1);
      }

      // trim prefix
      if (options.prefix !== '/') {
        if (filename.indexOf(filePrefix) !== 0) {
          return await next();
        }
        filename = filename.slice(filePrefix.length);
      }

      const fullpath = path.join(dir, filename);
      // files that can be accessed should be under options.dir
      if (!fullpath.startsWith(dir)) {
        return await next();
      }

      const stats = await exists(fullpath);
      if (!stats) return await next();
      if (!stats.isFile()) return await next();

      file = loadFile(filename, dir, options, files);
    }

    ctx.status = 200;

    if (enableGzip) ctx.vary('Accept-Encoding');

    if (!file.buffer) {
      const stats = await fs.stat(file.path!);
      if (stats.mtime.getTime() !== file.mtime!.getTime()) {
        file.mtime = stats.mtime;
        file.md5 = undefined;
        file.length = stats.size;
      }
    }

    ctx.response.lastModified = file.mtime;
    if (file.md5) {
      ctx.response.etag = file.md5;
    }

    if (ctx.fresh) {
      ctx.status = 304;
      return;
    }

    ctx.type = file.type;
    ctx.length = file.zipBuffer ? file.zipBuffer.length : file.length!;
    ctx.set('cache-control', file.cacheControl ?? 'public, max-age=' + file.maxAge);
    if (file.md5) ctx.set('content-md5', file.md5);

    if (ctx.method === 'HEAD') {
      return;
    }

    const acceptGzip = ctx.acceptsEncodings('gzip') === 'gzip';

    if (file.zipBuffer) {
      if (acceptGzip) {
        ctx.set('content-encoding', 'gzip');
        ctx.body = file.zipBuffer;
      } else {
        ctx.body = file.buffer;
      }
      return;
    }

    const shouldGzip = enableGzip && file.length! > 1024 && acceptGzip && file.type && compressible(file.type);

    if (file.buffer) {
      if (shouldGzip) {
        const gzFile = files.get(filename + '.gz') as FileMeta;
        if (options.usePrecompiledGzip && gzFile && gzFile.buffer) {
          // if .gz file already read from disk
          file.zipBuffer = gzFile.buffer;
        } else {
          file.zipBuffer = await gzip(file.buffer);
        }
        ctx.set('content-encoding', 'gzip');
        ctx.body = file.zipBuffer;
      } else {
        ctx.body = file.buffer;
      }
      return;
    }

    const stream = createReadStream(file.path!);

    // update file hash
    if (!file.md5) {
      const hash = crypto.createHash('md5');
      stream.on('data', hash.update.bind(hash));
      stream.on('end', () => {
        file.md5 = hash.digest('base64');
      });
    }

    ctx.body = stream;
    // enable gzip will remove content length
    if (shouldGzip) {
      ctx.remove('content-length');
      ctx.set('content-encoding', 'gzip');
      ctx.body = stream.pipe(zlib.createGzip());
    }
  };
}

/**
 * load file and add file content to cache
 */
function loadFile(name: string, dir: string, options: Options, fileManager: FileManager) {
  const pathname = path.normalize(path.join(options.prefix!, name));
  if (!fileManager.get(pathname)) {
    fileManager.set(pathname, {});
  }
  const obj = fileManager.get(pathname) as FileMeta;
  const filename = (obj.path = path.join(dir, name));
  const stats = statSync(filename);
  const buffer = readFileSync(filename);

  obj.cacheControl = typeof options.cacheControl === 'function' ? options.cacheControl(filename) : options.cacheControl; // if cacheControl is a function, it will be called with the filename
  obj.maxAge = (typeof obj.maxAge === 'number' ? obj.maxAge : options.maxAge) || 0;
  obj.type = obj.mime = mime.lookup(pathname) || 'application/octet-stream';
  obj.mtime = stats.mtime;
  obj.length = stats.size;
  obj.md5 = crypto.createHash('md5').update(buffer).digest('base64');

  debug('file: %s', JSON.stringify(obj, null, 2));
  if (options.buffer) {
    obj.buffer = buffer;
  }
  return obj;
}
