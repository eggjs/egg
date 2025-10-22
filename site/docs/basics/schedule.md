# Schedule Controller

## Use Cases

Supports regular scheduled tasks that will execute on every deployed machine.

## Usage

:::warning
⚠️ Note: **<font style="color:#DF2A3F;">Do not place your code in the `app/schedule` path</font>**, because Egg scans this path by default to register scheduled tasks, which will conflict with the decorator-based approach.
:::

### Regular Scheduled Tasks

Regular scheduled tasks will execute the scheduling logic on every deployed machine. For example, if an application is typically deployed on at least 2 machines in a production environment, the scheduled task will run on both machines.

Use the `Schedule` decorator to mark a class as a scheduled task controller. The class must contain a method named `subscribe`. When the framework schedules the task execution, it will call the `subscribe` method of the `Schedule` annotated class.

#### Enable Plugin

Built-in plugin, enabled by default.

```typescript
export default {
  teggSchedule: true,
};
```

#### Interval Mode

Regular scheduled tasks can be configured in `interval` mode, which means they execute once on each machine at specified intervals. The interval is set through the `scheduleData.interval` parameter of the `Schedule` decorator.

- When `interval` is a number type, the unit is milliseconds, e.g., `100`.
- When `interval` is a string type, it will be converted to milliseconds using [ms](https://github.com/vercel/ms), e.g., `5s`.

```typescript
// app/port/schedule/Demo.ts
import { Inject, Logger } from 'egg';
import { IntervalParams, Schedule, ScheduleType } from 'egg/schedule';

@Schedule<IntervalParams>({
  type: ScheduleType.WORKER,
  scheduleData: {
    interval: 100, // Execute every 100ms
    // interval: '5s', // Execute every 5s
  },
})
export class IntervalScheduler {
  @Inject()
  private logger: Logger;

  async subscribe() {
    this.logger.info('schedule called');
  }
}
```

#### Cron Mode

Regular scheduled tasks also support cron expression mode, which executes scheduled tasks according to cron expression rules. For cron expression syntax, please refer to [cron-parser](https://github.com/harrisiirak/cron-parser).

```text
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

For example, the following code will execute once daily at 3 AM on each machine.

```typescript
// app/port/schedule/CronDemo.ts
import { Inject, Logger } from 'egg';
import { CronParams, Schedule, ScheduleType } from 'egg/schedule';

@Schedule<CronParams>({
  type: ScheduleType.WORKER,
  scheduleData: {
    // Execute once daily at 3 AM
    cron: '0 0 3 * * *',
    // Execute every 5 seconds
    // cron: '*/5 * * * * *',
  },
})
export class CronSubscriber {
  @Inject()
  private logger: Logger;

  async subscribe() {
    this.logger.info('schedule called');
  }
}
```

#### Worker Mode

Regular scheduled tasks generally use `worker` mode, which means only one worker on each machine will execute the scheduled task. The framework also provides an `all` mode option for scenarios where all workers on each machine need to execute the scheduled task.

- `worker` mode: Only one worker on each machine will execute this scheduled task. The worker that executes the task each time is selected **randomly**.
- `all` mode: Every worker on each machine will execute this scheduled task.

```typescript
import { Inject, Logger } from 'egg';
import { IntervalParams, Schedule, ScheduleType } from 'egg/schedule';

@Schedule<IntervalParams>({
  type: ScheduleType.ALL, // All workers will execute
  scheduleData: {
    interval: 100,
  },
})
export class AllScheduler {
  @Inject()
  private logger: Logger;

  async subscribe() {
    this.logger.info('schedule called');
  }
}
```

#### Scheduled Task Parameters

The `Schedule` decorator for regular scheduled tasks supports a second parameter to specify task runtime parameters.

- `immediate`: When set to true, the scheduled task will execute once immediately after the application starts and becomes ready.
- `disable`: When set to true, the scheduled task will not be started.
- `env`: An array specifying that the scheduled task should only start in specific environments.

```typescript
import { Inject, Logger } from 'egg';
import { IntervalParams, Schedule, ScheduleType } from 'egg/schedule';

@Schedule<IntervalParams>(
  {
    type: ScheduleType.WORKER,
    scheduleData: {
      interval: 100,
    },
  },
  {
    immediate: true, // Execute once immediately after app starts and becomes ready
    // disable: true, // When true, the scheduled task will not start
    env: ['devserver', 'test'], // Only run in offline environments
  },
)
export class ParamScheduler {
  @Inject()
  private logger: Logger;

  async subscribe() {
    this.logger.info('schedule called');
  }
}
```
