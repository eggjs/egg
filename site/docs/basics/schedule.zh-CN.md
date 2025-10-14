---
title: Schedule Controller
---

## 使用场景

支持普通定时任务，在每台部署机器上都会执行。

## 使用方法

:::warning
⚠️ 注意：**<font style="color:#DF2A3F;">不要将代码写在 app/schedule 路径下</font>**，因为 egg 默认会扫描该路径注册定时任务，会和使用装饰器方式有冲突。
:::

### 普通定时任务

普通定时任务在每台部署的机器上都会执行定时任务调度逻辑。例如通常一个应用在生产环境最少部署在 2 台机器，则定时任务在这 2 台机器中都会运行。

使用 `Schedule` 装饰器标识一个类为定时任务控制器，该类要求必须包含一个名称为 `subscribe` 的方法。框架调度定时任务执行时，会调用 `Schedule` 注解类的 `subscribe` 方法执行。

#### 开启插件

```typescript
export default {
  teggSchedule: true,
};
```

#### interval 模式

普通定时任务，可以配置为 `interval` 模式，即每间隔指定的时间在每台机器上执行一次。间隔时间通过 `Schedule` 装饰器的 `scheduleData.interval` 参数设置。

- `interval` 传值数字类型时，单位为毫秒数，例如 `100`。
- `interval` 传值字符类型时，会通过 [ms](https://github.com/vercel/ms) 转换成毫秒数，例如 `5s`。

```typescript
import { Inject, IntervalParams, Logger, Schedule, ScheduleType } from 'egg';

@Schedule<IntervalParams>({
  type: ScheduleType.WORKER,
  scheduleData: {
    interval: 100, // 每 100ms 执行一次
    // interval: '5s', // 每 5s 执行一次
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

#### cron 模式

普通定时任务，也支持 cron 表达式模式，即按照 cron 表达式规则执行定时任务。cron 表达式说明可参考 [cron-parser](https://github.com/harrisiirak/cron-parser)。

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

例如下列代码将会每日 3 点在每台机器上执行一次。

```typescript
import { CronParams, Inject, Logger, Schedule, ScheduleType } from 'egg';

@Schedule<CronParams>({
  type: ScheduleType.WORKER,
  scheduleData: {
    cron: '0 0 3 * * *',
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

#### 工作模式

普通定时任务，一般使用 `worker` 模式，即每台机器上只有一个 worker 会执行这个定时任务。框架也提供了 `all` 模式选项，用于每台机器上的所有 worker 都需要执行定时任务的场景。

- `worker` 模式：每台机器上只有一个 worker 会执行这个定时任务，每次执行定时任务的 worker 的选择是**随机的**。 
- `all` 模式：每台机器上的每个 worker 都会执行这个定时任务。

```typescript
import { Inject, IntervalParams, Logger, Schedule, ScheduleType } from 'egg';

@Schedule<IntervalParams>({
  type: ScheduleType.ALL, // 所有 worker 都会执行
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

#### 定时任务参数

普通定时任务的 `Schedule` 装饰器支持传入第二个参数，用于指定定时任务运行参数。

- `immediate`：配置了该参数为 true 时，这个定时任务会在应用启动并 ready 后立刻执行一次这个定时任务。
- `disable`：配置该参数为 true 时，这个定时任务不会被启动。
- `env`：数组，仅在指定的环境下才启动该定时任务。

```typescript
import { Inject, IntervalParams, Logger, Schedule, ScheduleType } from 'egg';

@Schedule<IntervalParams>(
  {
    type: ScheduleType.WORKER,
    scheduleData: {
      interval: 100,
    },
  },
  {
    immediate: true, // 在应用启动并 ready 后立刻执行一次
    // disable: true, // 为 true 时，定时任务不会被启动
    env: [ 'devserver', 'test' ], // 仅在线下环境运行
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
