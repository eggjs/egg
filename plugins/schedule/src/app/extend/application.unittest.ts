import { debuglog } from 'node:util';
import path from 'node:path';

import { importResolve } from '@eggjs/utils';

import type { EggScheduleItem } from '../../lib/types.ts';
import Application from './application.ts';

const debug = debuglog('egg/schedule/app');

export default class ApplicationUnittest extends Application {
  async runSchedule(schedulePath: string, ...args: any[]) {
    debug('[runSchedule] start schedulePath: %o, args: %o', schedulePath, args);
    // for test purpose
    const config = this.config;
    const directory = [path.join(config.baseDir, 'app/schedule'), ...config.schedule.directory];

    // resolve real path
    if (path.isAbsolute(schedulePath)) {
      schedulePath = importResolve(schedulePath);
    } else {
      for (const dir of directory) {
        const trySchedulePath = path.join(dir, schedulePath);
        try {
          schedulePath = importResolve(trySchedulePath);
          break;
        } catch (err) {
          debug('[runSchedule] importResolve %o error: %s', trySchedulePath, err);
        }
      }
    }

    debug('[runSchedule] resolve schedulePath: %o', schedulePath);
    let schedule: EggScheduleItem;
    try {
      schedule = this.scheduleWorker.scheduleItems[schedulePath];
      if (!schedule) {
        debug(
          '[runSchedule] Cannot find schedule %o, scheduleItems: %o',
          schedulePath,
          this.scheduleWorker.scheduleItems
        );
        throw new TypeError(`Cannot find schedule ${schedulePath}`);
      }
    } catch (err: any) {
      err.message = `[@eggjs/schedule] ${err.message}`;
      throw err;
    }

    // run with anonymous context
    const ctx = this.createAnonymousContext({
      method: 'SCHEDULE',
      url: `/__schedule?path=${schedulePath}&${schedule.scheduleQueryString}`,
    });
    return await this.ctxStorage.run(ctx, async () => {
      return await schedule.task(ctx, ...args);
    });
  }
}

declare module '@eggjs/mock' {
  interface MockApplication {
    runSchedule(schedulePath: string, ...args: any[]): Promise<any>;
  }
}
