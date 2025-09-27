import moment from 'moment';
import path from 'node:path';
import { debuglog } from 'node:util';

import { exists } from 'utility';

import { LogRotator, type RotateFile } from './rotator.js';

const debug = debuglog('@eggjs/logrotator/lib/hour_rotator');

// rotate log by hour
// rename from foo.log to foo.log.YYYY-MM-DD-HH
export class HourRotator extends LogRotator {
  async getRotateFiles() {
    const files = new Map<string, RotateFile>();
    const logDir = this.app.config.logger.dir;
    const filesRotateByHour = this.app.config.logrotator.filesRotateByHour || [];

    for (let logPath of filesRotateByHour) {
      // support relative path
      if (!path.isAbsolute(logPath)) {
        logPath = path.join(logDir, logPath);
      }
      const stat = await exists(logPath);
      if (!stat) {
        continue;
      }
      this._setFile(logPath, files);
    }

    return files;
  }

  get hourDelimiter() {
    return this.app.config.logrotator.hourDelimiter;
  }

  _setFile(srcPath: string, files: Map<string, RotateFile>) {
    if (!files.has(srcPath)) {
      const ext = this.app.config.logrotator.gzip === true ? '.gz' : '';
      const targetPath = srcPath + moment().subtract(1, 'hours').format(`.YYYY-MM-DD${this.hourDelimiter}HH`) + ext;
      debug('set file %s => %s', srcPath, targetPath);
      files.set(srcPath, { srcPath, targetPath });
    }
  }
}
