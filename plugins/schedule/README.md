# @eggjs/schedule

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/schedule.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/schedule.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/schedule
[snyk-image]: https://snyk.io/test/npm/@eggjs/schedule/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/schedule
[download-image]: https://img.shields.io/npm/dm/@eggjs/schedule.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/schedule

A schedule plugin for egg, has been built-in plugin for egg enabled by default.

It's fully extendable for a developer and provides a simple built-in TimerStrategy.

## Usage

Just add your job file to `{baseDir}/app/schedule`.

```ts
// {baseDir}/app/schedule/cleandb.ts
import { Subscription } from 'egg';

export default class CleanDB extends Subscription {
  /**
   * @property {Object} schedule
   *  - {String} type - schedule type, `worker` or `all` or your custom types.
   *  - {String} [cron] - cron expression, see [below](#cron-style-scheduling)
   *  - {Object} [cronOptions] - cron options, see [cron-parser#options](https://github.com/harrisiirak/cron-parser#options)
   *  - {String | Number} [interval] - interval expression in millisecond or express explicitly like '1h'. see [below](#interval-style-scheduling)
   *  - {Boolean} [immediate] - To run a scheduler at startup
   *  - {Boolean} [disable] - whether to disable a scheduler, usually use in dynamic schedule
   *  - {Array} [env] - only enable scheduler when match env list
   */
  static get schedule() {
    return {
      type: 'worker',
      cron: '0 0 3 * * *',
      // interval: '1h',
      // immediate: true,
    };
  }

  async subscribe() {
    await this.ctx.service.db.cleandb();
  }
}
```

You can also use function simply like:

```ts
import { EggContext } from 'egg';

export const schedule = {
  type: 'worker',
  cron: '0 0 3 * * *',
  // interval: '1h',
  // immediate: true,
};

export async function task(ctx: EggContext) {
  await ctx.service.db.cleandb();
}
```

## Overview

`@eggjs/schedule` supports both cron-based scheduling and interval-based scheduling.

Schedule decision is being made by `agent` process. `agent` triggers a task and sends a message to `worker` process. Then, one or all `worker` process(es) execute the task based on schedule type.

To setup a schedule task, simply create a job file in `{app_root}/app/schedule`. A file contains one job and exports `schedule` and `task` properties.

The rule of thumbs is one job per file.

## Task

Task is a class which will be instantiated with every schedule, and a `subscribe` method will be invoked.

You can get anonymous context with `this.ctx`.

- ctx.method: `SCHEDULE`
- ctx.path: `/__schedule?path=${schedulePath}&${schedule}`.

To create a task, `subscribe` can be a generator function or async function. For example:

```ts
// A simple logger example
import { Subscription } from 'egg';

export default class LoggerExample extends Subscription {
  async subscribe() {
    this.ctx.logger.info('Info about your task');
  }
}
```

```ts
// A real world example: wipe out your database.
// Use it with caution. :)
import { Subscription } from 'egg';

export default class CleanDB extends Subscription {
  async subscribe() {
    await this.ctx.service.db.cleandb();
  }
}
```

## Scheduling

`schedule` is an object that contains one required property, `type`, and optional properties, `{ cron, cronOptions, interval, immediate, disable, env }`.

### Cron-style Scheduling

Use [cron-parser](https://github.com/harrisiirak/cron-parser).

> Note: `cron-parser` support `second` as optional that is not supported by linux crontab.
>
> `@hourly / @daily / @weekly / @monthly / @yearly` is also supported.

```bash
*    *    *    *    *    *
┬    ┬    ┬    ┬    ┬    ┬
│    │    │    │    │    |
│    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
│    │    │    │    └───── month (1 - 12)
│    │    │    └────────── day of month (1 - 31)
│    │    └─────────────── hour (0 - 23)
│    └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, optional)
```

Example:

```ts
// To execute task every 3 hours
export const schedule = {
  type: 'worker',
  cron: '0 0 */3 * * *',
  cronOptions: {
    // tz: 'Europe/Athens',
  },
};
```

### Interval-style Scheduling

To use `setInterval`, and support [ms](https://www.npmjs.com/package/ms) conversion style

Example:

```ts
// To execute task every 3 hours
export const schedule = {
  type: 'worker',
  interval: '3h',
};
```

**Notice: Egg built-in TimerStrategy will schedule each execution at a fix rate, regardless of its execution time. So you have to make sure that your actual execution time of your `task/subscribe` must be smaller than your delay time.**

### Schedule Type

**Build-in support is:**

- `worker`: will be executed in one random worker when a schedule runs.
- `all`: will be executed in all workers when a schedule runs.

**Custom schedule:**

To create a custom schedule, simply extend `agent.ScheduleStrategy` and register it by `agent.schedule.use(type, clz)`.
You can schedule the task to be executed by one random worker or all workers with
the built-in method `this.sendOne(...args)` or `this.sendAll(...args)` which support params,
it will pass to `subscribe(...args)` or `task(ctx, ...args)`.

```ts
// {baseDir}/agent.ts
import { Agent } from 'egg';

export default (agent: Agent) => {
  class CustomStrategy extends agent.ScheduleStrategy {
    start() {
      // such as mq / redis subscribe
      agent.notify.subscribe('remote_task', data => {
        this.sendOne(data);
      });
    }
  }

  agent.schedule.use('custom', CustomStrategy);
};
```

Then you could use it to defined your job:

```ts
// {baseDir}/app/schedule/other.ts
import { Subscription } from 'egg';

export default class ClusterTask extends Subscription {
  static get schedule() {
    return {
      type: 'custom',
    };
  }

  async subscribe(data) {
    console.log('got custom data:', data);
    await this.ctx.service.someTask.run();
  }
}
```

## Dynamic schedule

```ts
// {baseDir}/app/schedule/sync.ts
import { Application } from 'egg';

export default (app: Application) => {
  class SyncTask extends app.Subscription {
    static get schedule() {
      return {
        interval: 10000,
        type: 'worker',
        // only start task when hostname match
        disable: require('os').hostname() !== app.config.sync.hostname,
        // only start task at prod mode
        env: ['prod'],
      };
    }

    async subscribe() {
      await this.ctx.sync();
    }
  }

  return SyncTask;
};
```

## Configuration

### Logging

See `${appInfo.root}/logs/{app_name}/egg-schedule.log` which provided by [config.customLogger.scheduleLogger](https://github.com/eggjs/schedule/blob/master/src/config/config.default.ts).

```ts
// config/config.default.ts
import { EggAppConfig } from 'egg';

export default {
  customLogger: {
    scheduleLogger: {
      // consoleLevel: 'NONE',
      // file: path.join(appInfo.root, 'logs', appInfo.name, 'egg-schedule.log'),
    },
  },
} as Partial<EggAppConfig>;
```

### Customize directory

If you want to add additional schedule directories, you can use this config.

```ts
// config/config.default.ts
import { EggAppConfig } from 'egg';

export default {
  schedule: {
    directory: ['path/to/otherSchedule'],
  },
} as Partial<EggAppConfig>;
```

## Testing

`app.runSchedule(scheduleName)` is provided by `@eggjs/schedule` plugin only for test purpose.

Example:

```ts
it('test a schedule task', async () => {
  // get app instance
  await app.runSchedule('clean_cache');
});
```

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
