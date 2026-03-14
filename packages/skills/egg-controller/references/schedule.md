# 定时任务开发指南

## 注意事项

- **不要将代码放在 `app/schedule` 目录下**，egg 默认会扫描该路径注册定时任务，会和装饰器方式冲突
- 定时任务类必须包含一个 `subscribe` 方法，框架调度时会调用该方法
- import 路径是 `egg/schedule`，不是 `egg`

## Step 1: 创建定时任务

使用 `@Schedule` 装饰器标识一个类为定时任务，支持 interval 和 cron 两种调度模式。

### interval 模式

按固定间隔执行。`interval` 支持毫秒数或 [ms](https://github.com/vercel/ms) 格式字符串（如 `'5s'`、`'1m'`）。

```typescript
// app/port/schedule/Demo.ts
import { Inject, Logger } from 'egg';
import { IntervalParams, Schedule, ScheduleType } from 'egg/schedule';

@Schedule<IntervalParams>({
  type: ScheduleType.WORKER,
  scheduleData: {
    interval: '5s',
  },
})
export class DemoScheduler {
  @Inject()
  private logger: Logger;

  async subscribe() {
    this.logger.info('schedule called');
  }
}
```

### cron 模式

按 cron 表达式执行，格式参考 [cron-parser](https://github.com/harrisiirak/cron-parser)：

```text
*    *    *    *    *    *
┬    ┬    ┬    ┬    ┬    ┬
│    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
│    │    │    │    └───── month (1 - 12)
│    │    │    └────────── day of month (1 - 31)
│    │    └─────────────── hour (0 - 23)
│    └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, optional)
```

```typescript
// app/port/schedule/CronDemo.ts
import { Inject, Logger } from 'egg';
import { CronParams, Schedule, ScheduleType } from 'egg/schedule';

@Schedule<CronParams>({
  type: ScheduleType.WORKER,
  scheduleData: {
    cron: '0 0 3 * * *', // 每日 3 点执行
  },
})
export class CronScheduler {
  @Inject()
  private logger: Logger;

  async subscribe() {
    this.logger.info('schedule called');
  }
}
```

## Step 2: 选择工作模式

| 模式                  | 说明                                     | 使用场景                             |
| --------------------- | ---------------------------------------- | ------------------------------------ |
| `ScheduleType.WORKER` | 每台机器只有一个 worker 执行（随机选择） | 大多数场景，如数据同步、缓存刷新     |
| `ScheduleType.ALL`    | 每台机器的所有 worker 都执行             | 需要每个 worker 都更新本地状态的场景 |

## Step 3: 配置运行参数

`@Schedule` 装饰器支持第二个参数，控制定时任务的运行行为：

```typescript
@Schedule<IntervalParams>(
  {
    type: ScheduleType.WORKER,
    scheduleData: {
      interval: '1m',
    },
  },
  {
    immediate: true,            // 应用启动后立即执行一次
    // disable: true,           // 禁用该定时任务
    env: ['devserver', 'test'], // 仅在指定环境下启动
  },
)
export class MyScheduler {
  async subscribe() {
    // ...
  }
}
```

| 参数        | 类型     | 说明                            |
| ----------- | -------- | ------------------------------- |
| `immediate` | boolean  | 应用启动并 ready 后立即执行一次 |
| `disable`   | boolean  | 设为 true 时不启动该定时任务    |
| `env`       | string[] | 仅在指定环境下启动              |
