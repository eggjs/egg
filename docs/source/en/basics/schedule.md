title: Scheduled Tasks
---

Although the HTTP Server we developed using the framework is a request-response model, there are still many scenarios that need to execute some scheduled tasks, for example:

1. Regularly report server application status.
1. Regularly update the local cache from the remote interface.
1. Regularly split files, delete temporary files.

The framework provides a mechanism to make the development and maintenance of scheduled tasks more elegant.

## Develop Scheduled Tasks

All scheduled tasks should be placed in directory `app/schedule`. Each file is an independent scheduled task that could configure the properties and the detail methods to be executed.

A simple example, to define a scheduled task to update the remote data to the memory cache, we can create a `update_cache.js` file in the directory 'app/schedule`

```js
const Subscription = require('egg').Subscription;

class UpdateCache extends Subscription {
  // using `schedule` property to set the scheduled task execution interval and other configurations
  static get schedule() {
    return {
      interval: '1m', // 1 minute interval
      type: 'all', // specify all `workers` need to execute
    };
  }

  // `subscribe` is the function to be executed when the scheduled task is triggered
  async subscribe() {
    const res = await this.ctx.curl('http://www.api.com/cache', {
      dataType: 'json',
    });
    this.ctx.app.cache = res.data;
  }
}

module.exports = UpdateCache;
```

Can also be abbreviated as

```js
module.exports = {
  schedule: {
    interval: '1m', // 1 minute interval
    type: 'all', // specify all `workers` need to execute
  },
  async task(ctx) {
    const res = await ctx.curl('http://www.api.com/cache', {
      dataType: 'json',
    });
    ctx.app.cache = res.data;
  },
};
```

This scheduled task will be executed every 1 minute on every worker process, the requested remote data will be mounted back to `app.cache`.

### Task

- `task` or `subscribe` is compatible with `generator function` and `async function`.
- The parameter of `task` is `ctx`, anonymous Context instance, we could call `service` and others via it.

### Schedule Mode

Schedule tasks can specify `interval` or `cron` two different schedule modes.

#### interval

Configure the scheduled tasks by `schedule.interval`, scheduled tasks will be executed every specified time interval. `interval` can be configured as

- Integer type, the unit is milliseconds, e.g `5000`.
- String type, will be transformed to milliseconds by [ms](https://github.com/zeit/ms), e.g `5s`.

```js
module.exports = {
  schedule: {
    // executed every 10 seconds
    interval: '10s',
  },
};
```

#### cron

Configure the scheduled tasks by `schedule.cron`, scheduled tasks will be executed at specified timing according to the cron expressions. cron expressions are parsed by [cron-parser](https://github.com/harrisiirak/cron-parser).

**Note: cron-parser supports second (which don't support by linux crontab).**

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

```js
module.exports = {
  schedule: {
    // executed every three hours (zero minutes and zero seconds)
    cron: '0 0 */3 * * *',
  },
};
```

### Type

The framework scheduled tasks support two types by default, worker and all. Both worker and all support the above two schedule modes, except when it comes time to execute, the worker who executes the scheduled tasks is different:

- `worker` type: only one worker per machine executes this scheduled task, the worker to execute is random.
- `all` type: each worker on each machine executes this scheduled task.

### Other Parameters

In addition to the parameters just introduced, scheduled task also supports these parameters:

- `cronOptions`: configure cron time zone and so on, reference [cron-parser](https://github.com/harrisiirak/cron-parser#options)
- `immediate`: when this parameter is set to true, this scheduled task will be executed immediately after the application is started and ready.
- `disable`: when this parameter is set to true, this scheduled task will not be executed.
- `env`: env list to decide whether start this task at current env.

### Logging

Schedule log will be written to `${appInfo.root}/logs/{app_name}/egg-schedule.log`, but won't be logged to terminal by default, you could customize via `config.customLogger.scheduleLogger`.

```js
// config/config.default.js
config.customLogger = {
  scheduleLogger: {
    // consoleLevel: 'NONE',
    // file: path.join(appInfo.root, 'logs', appInfo.name, 'egg-schedule.log'),
  },
};
```

### Dynamically Configure Scheduled Tasks

Sometimes we need to configure the parameters of scheduled tasks. Scheduled tasks support another development style:

```js
module.exports = app => {
  return {
    schedule: {
      interval: app.config.cacheTick,
      type: 'all',
    },
    async task(ctx) {
      const res = await ctx.curl('http://www.api.com/cache', {
        contentType: 'json',
      });
      ctx.app.cache = res.data;
    },
  };
};
```

## Manually Execute Scheduled Tasks

We can run a scheduled task via `app.runSchedule(schedulePath)`. `app.runSchedule` reads a scheduled task file path (either a relative path in `app/schedule` or a complete absolute path), executes the corresponding scheduled task, and returns a Promise.

There are some scenarios we may need to manually execute scheduled tasks, for example

- Executing scheduled tasks manually for more elegant unit testing of scheduled tasks.

```js
const mm = require('egg-mock');
const assert = require('assert');

it('should schedule work fine', async () => {
  const app = mm.app();
  await app.ready();
  await app.runSchedule('update_cache');
  assert(app.cache);
});
```

When the application starts up, manually perform the scheduled tasks for system initialization, waiting for the initialization finished and then starting the application. See chapter [Application Startup Configuration](./app-start.md), we can implement initialization logic in `app.js`.

```js
module.exports = app => {
  app.beforeStart(async () => {
    // ensure the data is ready before the application starts listening port
    // follow-up data updates automatically by the scheduled task
    await app.runSchedule('update_cache');
  });
};
```

## Extend Scheduled Task Type

The framework scheduled tasks only support single worker execution and all worker execution, in some cases, our services are not deployed on a single machine, one of the worker processes in the cluster may execute a scheduled task.

The framework does not provide this functionality directly, but developers can extend the new type of scheduled tasks themselves in the upper framework.

Inherit `agent.ScheduleStrategy` in `agent.js` and register it with `agent.schedule.use()`:

```js
module.exports = agent => {
  class ClusterStrategy extends agent.ScheduleStrategy {
    start() {
      // subscribe other distributed scheduling service message, after receiving the message, allow a worker process to execute scheduled tasks
      // the user configures the distributed scheduling scenario in the configuration of the scheduled task
      agent.mq.subscribe(schedule.scene, () => this.sendOne());
    }
  }
  agent.schedule.use('cluster', ClusterStrategy);
};
```

`ScheduleStrategy` base class provides:

- `schedule` - Properties of schedule tasks, `disable` is supported by default, other configurations can be parsed by developers.
- `this.sendOne(...args)` - Notice worker to execute the task randomly, `args` will pass to `subscribe(...args)` or `task(ctx, ...args)`.
- `this.sendAll(...args)` - Notice all worker to execute the task.
