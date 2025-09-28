import path from 'node:path';
import fs from 'node:fs/promises';

import dayjs from 'dayjs';
import { Application } from 'egg';

export default (app: Application) => {
  return class CleanTmpdir extends app.Subscription {
    static get schedule() {
      return {
        type: 'worker',
        cron: app.config.multipart.cleanSchedule.cron,
        disable: app.config.multipart.cleanSchedule.disable,
        immediate: false,
      };
    }

    async _remove(dir: string) {
      const { ctx } = this;
      if (
        await fs.access(dir).then(
          () => true,
          () => false
        )
      ) {
        ctx.coreLogger.info('[@eggjs/multipart:CleanTmpdir] removing tmpdir: %j', dir);
        try {
          await fs.rm(dir, { force: true, recursive: true });
          ctx.coreLogger.info('[@eggjs/multipart:CleanTmpdir:success] tmpdir: %j has been removed', dir);
        } catch (err) {
          /* c8 ignore next 3 */
          ctx.coreLogger.error('[@eggjs/multipart:CleanTmpdir:error] remove tmpdir: %j error: %s', dir, err);
          ctx.coreLogger.error(err);
        }
      }
    }

    async subscribe() {
      const { ctx } = this;
      const config = ctx.app.config;
      ctx.coreLogger.info('[@eggjs/multipart:CleanTmpdir] start clean tmpdir: %j', config.multipart.tmpdir);
      // last year
      const lastYear = dayjs().subtract(1, 'years');
      const lastYearDir = path.join(config.multipart.tmpdir, lastYear.format('YYYY'));
      await this._remove(lastYearDir);
      // 3 months
      for (let i = 1; i <= 3; i++) {
        const date = dayjs().subtract(i, 'months');
        const dir = path.join(config.multipart.tmpdir, date.format('YYYY/MM'));
        await this._remove(dir);
      }
      // 7 days
      for (let i = 1; i <= 7; i++) {
        const date = dayjs().subtract(i, 'days');
        const dir = path.join(config.multipart.tmpdir, date.format('YYYY/MM/DD'));
        await this._remove(dir);
      }
      ctx.coreLogger.info('[@eggjs/multipart:CleanTmpdir] end');
    }
  };
};
