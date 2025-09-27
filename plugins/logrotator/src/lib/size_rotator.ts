import fs from 'node:fs/promises';
import path from 'node:path';
import { debuglog } from 'node:util';

import { exists } from 'utility';

import { LogRotator, type RotateFile } from './rotator.js';

const debug = debuglog('@eggjs/logrotator/lib/size_rotator');

// rotate log by size, if the size of file over maxFileSize,
// it will rename from foo.log to foo.log.1
// if foo.log.1 exists, foo.log.1 will rename to foo.log.2
export class SizeRotator extends LogRotator {
  async getRotateFiles() {
    const files = new Map<string, RotateFile>();
    const logDir = this.app.config.logger.dir;
    const filesRotateBySize = this.app.config.logrotator.filesRotateBySize || [];
    const maxFileSize = this.app.config.logrotator.maxFileSize;
    const maxFiles = this.app.config.logrotator.maxFiles;
    for (let logPath of filesRotateBySize) {
      // support relative path
      if (!path.isAbsolute(logPath)) {
        logPath = path.join(logDir, logPath);
      }
      const stat = await exists(logPath);
      if (!stat) {
        continue;
      }
      const size = stat.size;
      try {
        if (size >= maxFileSize) {
          this.logger.info(
            `[@eggjs/logrotator] file ${logPath} reach the maximum file size, current size: ${size}, max size: ${maxFileSize}`
          );
          // delete max log file if exists, otherwise will throw when rename
          const maxFileName = `${logPath}.${maxFiles}`;
          const stat = await exists(maxFileName);
          if (stat) {
            await fs.unlink(maxFileName);
            this.logger.info(`[@eggjs/logrotator] delete max log file ${maxFileName}`);
          }
          this._setFile(logPath, files);
        }
      } catch (e) {
        const err = e as Error;
        err.message = '[@eggjs/logrotator] ' + err.message;
        this.logger.error(err);
      }
    }
    return files;
  }

  _setFile(logPath: string, files: Map<string, RotateFile>) {
    const maxFiles = this.app.config.logrotator.maxFiles;
    if (files.has(logPath)) {
      return;
    }
    const ext = this.app.config.logrotator.gzip === true ? '.gz' : '';
    // foo.log.2 -> foo.log.3
    // foo.log.1 -> foo.log.2
    for (let i = maxFiles - 1; i >= 1; i--) {
      const srcPath = `${logPath}.${i}`;
      const targetPath = `${logPath}.${i + 1}${ext}`;
      debug('set file %s => %s', srcPath, targetPath);
      files.set(srcPath, { srcPath, targetPath });
    }
    // foo.log -> foo.log.1
    debug('set file %s => %s', logPath, `${logPath}.1`);
    files.set(logPath, { srcPath: logPath, targetPath: `${logPath}.1${ext}` });
  }
}
