title: 定时任务
---

虽然我们通过框架开发的 HTTP Server 是请求响应模型的，但是仍然还会有许多场景需要执行一些定时任务，例如：

1. 定时上报应用状态。
1. 定时从远程接口更新本地缓存。
1. 定时进行文件切割、临时文件删除。

框架提供了一套机制来让定时任务的编写和维护更加优雅。

## 编写定时任务

所有的定时任务都统一存放在 `app/schedule` 目录下，每一个文件都是一个独立的定时任务，可以配置定时任务的属性和要执行的方法。

一个简单的例子，我们定义一个更新远程数据到内存缓存的定时任务，就可以在 `app/schedule` 目录下创建一个 `update_cache.js` 文件

```js
module.exports = {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  schedule: {
    interval: '1m', // 1 分钟间隔
    type: 'all', // 指定所有的 worker 都需要执行
  },
  // task 是真正定时任务执行时被运行的函数，第一个参数是一个匿名的 Context 实例
  * task(ctx) {
    const res = yield ctx.curl('http://www.api.com/cache', {
      dataType: 'json',
    });
    ctx.app.cache = res.data;
  },
};
```

编写完这个文件就意味着一个定时任务定义完成了。这个定时任务会在每一个 Worker 进程上每 1 分钟执行一次，将远程数据请求回来挂载到 `app.cache` 上。

### 定时方式

定时任务可以指定 interval 或者 cron 两种不同的定时方式。

#### interval

通过 `schedule.interval` 参数来配置定时任务的执行时机，定时任务将会每间隔指定的时间执行一次。interval 可以配置成

- 数字类型，单位为毫秒数，例如 `5000`。
- 字符类型，会通过 [ms](https://github.com/zeit/ms) 转换成毫秒数，例如 `5s`。

```js
exports.schedule = {
  // 每 10 秒执行一次
  interval: '10s',
};
```

#### cron

通过 `schedule.cron` 参数来配置定时任务的执行时机，定时任务将会按照 cron 表达式在特定的时间点执行。cron 表达式通过 [cron-parser](https://github.com/harrisiirak/cron-parser) 进行解析。

**注意：cron-parser 支持可选的秒（linux crontab 不支持）。**

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
exports.schedule = {
  // 每三小时准点执行一次
  cron: '0 0 */3 * * *',
};
```

### 类型

框架提供的定时任务默认支持两种类型，worker 和 all。worker 和 all 都支持上面的两种定时方式，但是当到执行时机时，会执行定时任务的 worker 不同

- worker 类型：每台机器上只有一个 worker 会执行这个定时任务，每次执行定时任务的 worker 的选择是随机的。
- all 类型：每台机器上的每个 worker 都会执行这个定时任务。

### 其他参数

除了刚才介绍到的几个参数之外，定时任务还支持这些参数：

- immediate：配置了该参数为 true 时，这个定时任务会在应用启动并 ready 后立刻执行一次这个定时任务。
- disable：配置改参数为 true 时，这个定时任务不会被启动。

### 动态配置定时任务

有时候我们需要判断不同的环境来配置定时任务的参数。定时任务还有支持另一种写法：

```js
module.exports = app => {
  return {
    schedule: {
      interval: '1m',
      type: 'all',
      disable: app.config.env === 'local', // 本地开发环境不执行
    },
    * task(ctx) {
      const res = yield ctx.curl('http://www.api.com/cache', {
        contentType: 'json',
      });
      ctx.app.cache = res.data;
    },
  };
};
```

## 手动执行定时任务

我们可以通过 `app.runSchedule(schedulePath)` 来运行一个定时任务。`app.runSchedule` 接受一个定时任务文件路径（`app/schedule` 目录下的相对路径或者完整的绝对路径），执行对应的定时任务，返回一个 Promise。

有一些场景我们可能需要手动的执行定时任务，例如

- 通过手动执行定时任务可以更优雅的编写对定时任务的单元测试。

```js
const mm = require('egg-mock');
const assert = require('assert');

it('should schedule work fine', function*() {
  const app = mm.app();
  yield app.ready();
  yield app.runSchedule('update_cache');
  assert(app.cache);
});
```

- 应用启动时，手动执行定时任务进行系统初始化，等初始化完毕后再启动应用。参见[应用启动自定义](./app-start.md)章节，我们可以在 `app.js` 中编写初始化逻辑。

```js
module.exports = app => {
  app.beforeStart(function* () {
    // 保证应用启动监听端口前数据已经准备好了
    // 后续数据的更新由定时任务自动触发
    yield app.runSchedule('update_cache');
  });
};
```

## 扩展定时任务类型

默认框架提供的定时任务只支持每台机器的单个进程执行和全部进程执行，有些情况下，我们的服务并不是单机部署的，这时候可能有一个集群的某一个进程执行一个定时任务的需求，而框架并没有提供，这时上层框架可以基于其他的定时任务服务自行扩展新的定时任务类型。

在 `agent.js` 中扩展 `agent[Symbol.for('egg#scheduleHandler')]` 对象：

```js
const SCHEDULE_HANDLER = Symbol.for('egg#scheduleHandler');

module.exports = agent => {
  agent[SCHEDULE_HANDLER].cluster = (schedule, sender) => {
    // 订阅其他的分布式调度服务发送的消息，收到消息后让一个进程执行定时任务
    // 用户在定时任务的 schedule 配置中来配置分布式调度的场景（scene）
    agent.mq.subscribe(schedule.scene, () => sender.one());
  };
};
```

schedule hander 接受两个个参数：

- `schedule` - 定时任务的属性，disbale 和 immediate 是默认统一支持的，其他配置可以自行解析。
- `sender` - 发消息通知 worker 执行 task 的方法。
  - `sender.one()` - 随机通知一个 worker 执行 task。
  - `sender.all()` - 通知所有的 worker 执行 task。
