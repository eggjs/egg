import path from 'node:path';
import moment from 'moment';
import fs from 'node:fs/promises';
import { debuglog } from 'node:util';

import { exists } from 'utility';

import { LogRotator, type RotateFile, type RotatorOptions } from './rotator.js';
import { walkLoggerFile } from './utils.js';

const debug = debuglog('@eggjs/logrotator/lib/day_rotator');

// rotate log by day
// rename from foo.log to foo.log.YYYY-MM-DD
export class DayRotator extends LogRotator {
  private filesRotateBySize: string[];
  private filesRotateByHour: string[];

  constructor(options: RotatorOptions) {
    super(options);
    this.filesRotateBySize = this.app.config.logrotator.filesRotateBySize || [];
    this.filesRotateByHour = this.app.config.logrotator.filesRotateByHour || [];
  }

  async getRotateFiles() {
    const files = new Map<string, RotateFile>();
    const logDir = this.app.config.logger.dir;
    const loggers = this.app.loggers;
    const loggerFiles = walkLoggerFile(loggers);
    for (let file of loggerFiles) {
      // support relative path
      if (!path.isAbsolute(file)) {
        file = path.join(logDir, file);
      }
      this._setFile(file, files);
    }

    // Should rotate agent log, because schedule is running under app worker,
    // agent log is the only difference between app worker and agent worker.
    // - app worker -> egg-web.log
    // - agent worker -> egg-agent.log
    const agentLogName = this.app.config.logger.agentLogName;
    this._setFile(path.join(logDir, agentLogName), files);

    // rotateLogDirs is deprecated
    const rotateLogDirs = this.app.config.logger.rotateLogDirs;
    if (rotateLogDirs && rotateLogDirs.length > 0) {
      this.app.deprecate(
        '[egg-logrotator] Do not use app.config.logger.rotateLogDirs, only rotate core loggers and custom loggers'
      );

      for (const dir of rotateLogDirs) {
        const stat = await exists(dir);
        if (!stat) continue;

        try {
          const names = await fs.readdir(dir);
          for (const name of names) {
            if (!name.endsWith('.log')) {
              continue;
            }
            this._setFile(path.join(dir, name), files);
          }
        } catch (err) {
          this.logger.error(err);
        }
      }
    }

    return files;
  }

  _setFile(srcPath: string, files: Map<string, RotateFile>) {
    // don't rotate logPath in filesRotateBySize
    if (this.filesRotateBySize.includes(srcPath)) {
      return;
    }

    // don't rotate logPath in filesRotateByHour
    if (this.filesRotateByHour.includes(srcPath)) {
      return;
    }

    if (!files.has(srcPath)) {
      const ext = this.app.config.logrotator.gzip === true ? '.gz' : '';
      // allow 2 minutes deviation
      const targetPath = srcPath + moment().subtract(23, 'hours').subtract(58, 'minutes').format('.YYYY-MM-DD') + ext;
      debug('set file %s => %s', srcPath, targetPath);
      files.set(srcPath, { srcPath, targetPath });
    }
  }
}
