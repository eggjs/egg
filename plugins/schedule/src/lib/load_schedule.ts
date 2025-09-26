import path from 'node:path';
import assert from 'node:assert';
import { stringify } from 'node:querystring';

import { isClass, isFunction, isGeneratorFunction } from 'is-type-of';
import { importResolve } from '@eggjs/utils';
import type { EggApplicationCore, EggContext } from 'egg';

import type { EggScheduleConfig, EggScheduleTask, EggScheduleItem } from './types.ts';

function getScheduleLoader(app: EggApplicationCore) {
  return class ScheduleLoader extends app.loader.FileLoader {
    async load() {
      const target = this.options.target as Record<string, EggScheduleItem>;
      const items = await this.parse();
      for (const item of items) {
        const schedule = item.exports as { schedule: EggScheduleConfig; task: EggScheduleTask };
        const fullpath = item.fullpath;
        const scheduleConfig = schedule.schedule;
        assert(scheduleConfig, `schedule(${fullpath}): must have "schedule" and "task" properties`);
        assert(
          isClass(schedule) || isFunction(schedule.task),
          `schedule(${fullpath}: \`schedule.task\` should be function or \`schedule\` should be class`
        );

        let task: EggScheduleTask;
        if (isClass(schedule)) {
          assert(
            !isGeneratorFunction(schedule.prototype.subscribe),
            `schedule(${fullpath}): "schedule" generator function is not support, should use async function instead`
          );
          task = async (ctx: EggContext, ...args: any[]) => {
            const instance = new schedule(ctx);
            // s.subscribe = app.toAsyncFunction(s.subscribe);
            return instance.subscribe(...args);
          };
        } else {
          assert(
            !isGeneratorFunction(schedule.task),
            `schedule(${fullpath}): "task" generator function is not support, should use async function instead`
          );
          task = schedule.task;
          // task = app.toAsyncFunction(schedule.task);
        }

        const env = app.config.env;
        const envList = schedule.schedule.env;
        if (Array.isArray(envList) && !envList.includes(env)) {
          app.coreLogger.info(`[@eggjs/schedule]: ignore schedule ${fullpath} due to \`schedule.env\` not match`);
          continue;
        }

        // handle symlink case
        const realFullpath = importResolve(fullpath);
        target[realFullpath] = {
          schedule: scheduleConfig,
          scheduleQueryString: stringify(scheduleConfig as any),
          task,
          key: realFullpath,
        };
      }
      return target;
    }
  };
}

export async function loadSchedule(app: EggApplicationCore) {
  const dirs = [
    ...app.loader.getLoadUnits().map(unit => path.join(unit.path, 'app/schedule')),
    ...app.config.schedule.directory,
  ];

  const Loader = getScheduleLoader(app);
  const schedules = {} as Record<string, EggScheduleItem>;
  await new Loader({
    directory: dirs,
    target: schedules,
    inject: app,
  }).load();
  Reflect.set(app, 'schedules', schedules);
  return schedules;
}
