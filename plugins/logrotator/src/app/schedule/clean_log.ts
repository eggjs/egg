import path from 'node:path';
import fs from 'node:fs/promises';

import { exists } from 'utility';
import moment from 'moment';
import type { Application } from 'egg';

import { walkLoggerFile } from '../../lib/utils.ts';

// clean all xxx.log.YYYY-MM-DD before expired date.
export default (app: Application) => ({
  schedule: {
    type: 'worker', // only one worker run this task
    cron: '0 0 * * *', // run every day at 00:00
  },

  async task() {
    const logger = app.coreLogger;
    const logDirs = new Set<string>();
    const loggerFiles = walkLoggerFile(app.loggers);
    for (const file of loggerFiles) {
      const logDir = path.dirname(file);
      logDirs.add(logDir);
    }
    const maxDays = app.config.logrotator.maxDays;
    if (maxDays && maxDays > 0) {
      try {
        const tasks = Array.from(logDirs, logDir => removeExpiredLogFiles(logDir, maxDays, logger));
        await Promise.all(tasks);
      } catch (err) {
        logger.error(err);
      }
    }

    logger.info('[@eggjs/logrotator] clean all log before %s days', maxDays);
  },
});

// remove expired log files: xxx.log.YYYY-MM-DD
async function removeExpiredLogFiles(logDir: string, maxDays: number, logger: Application['coreLogger']) {
  // ignore not exists dir
  const stat = await exists(logDir);
  if (!stat) {
    logger.warn(`[@eggjs/logrotator] logDir ${logDir} not exists`);
    return;
  }

  const files = await fs.readdir(logDir);
  const expiredDate = moment().subtract(maxDays, 'days').startOf('date');
  const names = files.filter(file => {
    const name = path.extname(file).slice(1);
    if (!/^\d{4}-\d{2}-\d{2}/.test(name)) {
      return false;
    }
    const date = moment(name, 'YYYY-MM-DD').startOf('date');
    if (!date.isValid()) {
      return false;
    }
    return date.isBefore(expiredDate);
  });
  if (names.length === 0) {
    return;
  }

  logger.info(`[@eggjs/logrotator] start remove ${logDir} files: ${names.join(', ')}`);

  await Promise.all(
    names.map(async name => {
      const logFile = path.join(logDir, name);
      try {
        await fs.unlink(logFile);
      } catch (e) {
        const err = e as Error;
        err.message = `[@eggjs/logrotator] remove logFile ${logFile} error, ${err.message}`;
        logger.error(err);
      }
    })
  );
}
