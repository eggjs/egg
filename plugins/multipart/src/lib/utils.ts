import path from 'node:path';
import assert from 'node:assert';

import bytes from 'bytes';
import type { MultipartConfig } from '../config/config.default.ts';

export const whitelist = [
  // images
  '.jpg',
  '.jpeg', // image/jpeg
  '.png', // image/png, image/x-png
  '.gif', // image/gif
  '.bmp', // image/bmp
  '.wbmp', // image/vnd.wap.wbmp
  '.webp',
  '.tif',
  '.psd',
  // text
  '.svg',
  '.js',
  '.jsx',
  '.json',
  '.css',
  '.less',
  '.html',
  '.htm',
  '.xml',
  // tar
  '.zip',
  '.gz',
  '.tgz',
  '.gzip',
  // video
  '.mp3',
  '.mp4',
  '.avi',
];

export function humanizeBytes(size: number | string) {
  if (typeof size === 'number') {
    return size;
  }
  return bytes(size) as number;
}

export function normalizeOptions(options: MultipartConfig) {
  // make sure to cast the value of config **Size to number
  options.fileSize = humanizeBytes(options.fileSize);
  options.fieldSize = humanizeBytes(options.fieldSize);
  options.fieldNameSize = humanizeBytes(options.fieldNameSize);

  // validate mode
  options.mode = options.mode || 'stream';
  assert(['stream', 'file'].includes(options.mode), `Expect mode to be 'stream' or 'file', but got '${options.mode}'`);
  if (options.mode === 'file') {
    assert(!options.fileModeMatch, '`fileModeMatch` options only work on stream mode, please remove it');
  }

  // normalize whitelist
  if (Array.isArray(options.whitelist)) {
    options.whitelist = options.whitelist.map(extname => extname.toLowerCase());
  }

  // normalize fileExtensions
  if (Array.isArray(options.fileExtensions)) {
    options.fileExtensions = options.fileExtensions.map(extname => {
      return extname.startsWith('.') || extname === '' ? extname.toLowerCase() : `.${extname.toLowerCase()}`;
    });
  }

  function checkExt(fileName: string) {
    if (typeof options.whitelist === 'function') {
      return options.whitelist(fileName);
    }
    const extname = path.extname(fileName).toLowerCase();
    if (Array.isArray(options.whitelist)) {
      return options.whitelist.includes(extname);
    }
    // only if user don't provide whitelist, we will use default whitelist + fileExtensions
    return whitelist.includes(extname) || options.fileExtensions.includes(extname);
  }

  options.checkFile = (_fieldName: string, fileStream: any, fileName: string): void | Error => {
    // just ignore, if no file
    if (!fileStream || !fileName) return;
    try {
      if (!checkExt(fileName)) {
        const err = new Error('Invalid filename: ' + fileName);
        Reflect.set(err, 'status', 400);
        return err;
      }
    } catch (err: any) {
      err.status = 400;
      return err;
    }
  };

  return options;
}
