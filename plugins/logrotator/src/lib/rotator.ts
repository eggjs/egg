import assert from 'node:assert';
import { createWriteStream, createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { debuglog } from 'node:util';

import { exists } from 'utility';
import type { EggCore } from '@eggjs/core';

const debug = debuglog('@eggjs/logrotator/lib/rotator');

export interface RotatorOptions {
  app: EggCore;
}

export interface RotateFile {
  srcPath: string;
  targetPath: string;
}

export abstract class LogRotator {
  protected readonly options: RotatorOptions;
  protected readonly app: EggCore;
  protected readonly logger: EggCore['coreLogger'];

  constructor(options: RotatorOptions) {
    this.options = options;
    assert(this.options.app, 'options.app is required');
    this.app = this.options.app;
    this.logger = this.app.coreLogger;
  }

  abstract getRotateFiles(): Promise<Map<string, RotateFile>>;

  async rotate() {
    const files = await this.getRotateFiles();
    assert(files instanceof Map, 'getRotateFiles should return a Map');
    const rotatedFiles: string[] = [];
    for (const file of files.values()) {
      try {
        debug('rename from %s to %s', file.srcPath, file.targetPath);
        await renameOrDelete(file.srcPath, file.targetPath, this.app.config.logrotator.gzip);
        rotatedFiles.push(`${file.srcPath} -> ${file.targetPath}`);
      } catch (e) {
        const err = e as Error;
        err.message = `[@eggjs/logrotator] rename ${file.srcPath}, found exception: ` + err.message;
        this.logger.error(err);
      }
    }

    if (rotatedFiles.length > 0) {
      // tell every one to reload logger
      this.logger.info('[@eggjs/logrotator] broadcast log-reload');
      this.app.messenger.sendToApp('log-reload');
      this.app.messenger.sendToAgent('log-reload');
    }

    this.logger.info('[@eggjs/logrotator] rotate files success by %s, files %j', this.constructor.name, rotatedFiles);
  }
}

// rename from srcPath to targetPath, for example foo.log.1 > foo.log.2
// if gzip is true, then use gzip to compress the file, and delete the src file, for example foo.log.1 -> foo.log.2.gz
async function renameOrDelete(srcPath: string, targetPath: string, gzip: boolean) {
  if (srcPath === targetPath) {
    return;
  }
  const srcExists = await exists(srcPath);
  if (!srcExists) {
    return;
  }
  const targetExists = await exists(targetPath);
  // if target file exists, then throw
  // because the target file always be renamed first.
  if (targetExists) {
    const err = new Error(`targetFile ${targetPath} exists!!!`);
    throw err;
  }
  // if gzip is true, then use gzip
  if (gzip === true) {
    const tmpPath = `${targetPath}.tmp`;
    await fs.rename(srcPath, tmpPath);
    await pipeline(createReadStream(tmpPath), createGzip(), createWriteStream(targetPath));
    await fs.unlink(tmpPath);
  } else {
    await fs.rename(srcPath, targetPath);
  }
}
