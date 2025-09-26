import { debuglog } from 'node:util';

import type { ILifecycleBoot, EggLogger } from 'egg';

import type { EggScheduleJobInfo } from './lib/types.ts';
import type Application from './app/extend/application.ts';

const debug = debuglog('egg/schedule/app');

export default class Boot implements ILifecycleBoot {
  #app: Application;
  #logger: EggLogger;
  constructor(app: Application) {
    this.#app = app;
    this.#logger = app.getLogger('scheduleLogger');
  }

  async configDidLoad(): Promise<void> {
    const scheduleWorker = this.#app.scheduleWorker;
    await scheduleWorker.init();

    // log schedule list
    for (const s in scheduleWorker.scheduleItems) {
      const schedule = scheduleWorker.scheduleItems[s];
      if (!schedule.schedule.disable) {
        this.#logger.info('[@eggjs/schedule]: register schedule %s', schedule.key);
      }
    }

    // register schedule event
    this.#app.messenger.on('egg-schedule', async info => {
      debug('app got "egg-schedule" message: %o', info);
      const { id, key } = info;
      this.#logger.debug(`[Job#${id}] ${key} await app ready`);
      await this.#app.ready();
      const schedule = scheduleWorker.scheduleItems[key];
      this.#logger.debug(`[Job#${id}] ${key} task received by app`);

      if (!schedule) {
        this.#logger.warn(`[Job#${id}] ${key} unknown task`);
        return;
      }

      /* istanbul ignore next */
      if (schedule.schedule.disable) {
        this.#logger.warn(`[Job#${id}] ${key} disable`);
        return;
      }

      this.#logger.info(`[Job#${id}] ${key} executing by app`);

      // run with anonymous context
      const ctx = this.#app.createAnonymousContext({
        method: 'SCHEDULE',
        url: `/__schedule?path=${key}&${schedule.scheduleQueryString}`,
      });

      const start = Date.now();

      let success: boolean;
      let e: Error | undefined;
      try {
        // execute
        await this.#app.ctxStorage.run(ctx, async () => {
          return await schedule.task(ctx, ...info.args);
        });
        success = true;
      } catch (err: any) {
        success = false;
        e = err;
      }

      const rt = Date.now() - start;

      const msg = `[Job#${id}] ${key} execute ${success ? 'succeed' : 'failed'}, used ${rt}ms.`;
      if (success) {
        this.#logger.info(msg);
      } else {
        this.#logger.error(msg, e);
      }

      // notify agent job finish
      this.#app.messenger.sendToAgent('egg-schedule', {
        ...info,
        success,
        workerId: process.pid,
        rt,
        message: e?.message,
      } as EggScheduleJobInfo);
    });
    debug('configDidLoad');
  }
}
