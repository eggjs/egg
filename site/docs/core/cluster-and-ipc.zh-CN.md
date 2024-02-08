---
title: 多进程模型和进程间通讯
order: 7
---

我们知道 JavaScript 代码是运行在单线程上的，换句话说，一个 Node.js 进程只能运行在一个 CPU 上。那么如果用 Node.js 来做 Web Server，就无法享受到多核运算的好处。作为企业级的解决方案，我们要解决的一个问题就是：

> 如何榨干服务器资源，利用上多核 CPU 的并发优势？

Node.js 官方提供的解决方案是 [Cluster 模块](https://nodejs.org/api/cluster.html)。其中包含一段简介：

> 单个 Node.js 实例在单线程环境下运行。为了更好地利用多核环境，用户有时希望启动一批 Node.js 进程用于加载。
>
> 集群化模块使得你很方便地创建子进程，以便于在服务端口之间共享。

## Cluster 是什么？

简单地说，Cluster 是：

- 在服务器上同时启动多个进程。
- 每个进程里都运行着同一份源代码（好比把以前一个进程的工作分给多个进程去做）。
- 更神奇的是，这些进程可以同时监听一个端口（具体原理推荐阅读 @DavidCai1993 这篇关于 [Cluster 实现原理](https://cnodejs.org/topic/56e84480833b7c8a0492e20c) 的文章）。

其中：

- 负责启动其他进程的叫做 Master 进程，好比是一个“包工头”，不做具体的工作，只负责启动其他进程。
- 其他被启动的进程叫 Worker 进程，顾名思义就是干活的“工人”。它们接收请求，对外提供服务。
- Worker 进程的数量一般根据服务器的 CPU 核数来定，这样可以完美利用多核资源。

```js
const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  // Workers can share any TCP connection.
  // In this case it is an HTTP server.
  http
    .createServer((req, res) => {
      res.writeHead(200);
      res.end('hello world\n');
    })
    .listen(8000);
}
```
## 框架的多进程模型

上面的示例是否很简单呢？但作为企业级应用解决方案，我们需要考虑的问题还有很多。

- Worker 进程异常退出后，我们应如何处理？
- 多个 Worker 进程之间，如何共享资源？
- 多个 Worker 进程之间，又该如何调度？
- ...（此处省略号不需要修改为中文省略号，因为它在用列表符号表示内容，并不是句子的结束）

### 进程守护

健壮性（又称鲁棒性）是企业级应用必须要考虑的问题。除了程序代码质量要保证外，框架层面也需要提供相应的“兜底”机制，以保证极端情况下应用的可用性。

一般来说，Node.js 进程退出可以分为两类：

#### 未捕获异常

当代码抛出未被捕获的异常时，进程将会退出。这时 Node.js 提供了 `process.on('uncaughtException', handler)` 接口来捕获它。但是，当一个 Worker 进程遇到[未捕获的异常](https://nodejs.org/dist/latest-v6.x/docs/api/process.html#process_event_uncaughtexception)时，它已经处于不确定状态，此时我们应该让这个进程优雅退出：

1. 关闭异常 Worker 进程的所有 TCP Server（将已有连接快速断开，且不再接收新的连接），断开与 Master 的 IPC 通道，不再接受新的用户请求。
2. Master 立即 fork 一个新的 Worker 进程，以确保在线的“工人”总数保持不变。
3. 异常 Worker 等待一段时间，在处理完已接收的请求后退出。

```bash
   +---------+                 +---------+
   |  Worker |                 |  Master |
   +---------+                 +----+----+
        | uncaughtException         |
        +------------+              |
        |            |              |                   +---------+
        | <----------+              |                   |  Worker |
        |                           |                   +----+----+
        |        disconnect         |   fork a new worker    |
        +-------------------------> + ---------------------> |
        |         wait...           |                        |
        |          exit             |                        |
        +-------------------------> |                        |
        |                           |                        |
       die                          |                        |
                                    |                        |
                                    |                        |
```

#### OOM、系统异常

当进程由于异常导致 crash 或者因 OOM 被系统杀死时，不同于未捕获异常发生时我们还有让进程继续执行的机会，只能让当前进程直接退出。Master 立即 fork 一个新的 Worker。

在框架里，我们采用 [graceful] 和 [egg-cluster] 两个模块配合，实现上述逻辑。这套方案已在阿里巴巴和蚂蚁金服的生产环境中广泛部署，并经历过“双 11”大促的考验。因此，它相对稳定可靠。

### Agent 机制

Node.js 的多进程方案现已成型，这也是我们早期线上使用的方案。但后来我们发现，有些工作不需要每个 Worker 都去做。如果都去做，既是资源浪费，更重要的是，可能会导致多进程间资源访问冲突。举个例子，在生产环境中我们通常按日期归档日志文件，在单进程模型下这非常简单：

> 1. 每天凌晨 0 点，将当前日志文件按日期重命名。
> 2. 销毁之前的文件句柄，并创建新的日志文件继续写入。

试想，如果现在有 4 个进程同时做同样事情，就会混乱。因此，对于这类后台任务，我们希望它们在一个单独的进程中执行，该进程就叫 Agent Worker，简称 Agent。Agent 类似于 Master 为其他 Worker 雇佣的“秘书”，不对外提供服务，只服务于 App Worker，专门处理公共事务。现在我们的多进程模型就成了下面这个样子：

```bash
                  +--------+          +-------+
                  | Master |<-------->| Agent |
                  +--------+          +-------+
                  ^   ^    ^
                 /    |     \
               /      |       \
             /        |         \
           v          v          v
  +----------+   +----------+   +----------+
  | Worker 1 |   | Worker 2 |   | Worker 3 |
  +----------+   +----------+   +----------+
```

框架的启动时序如下：

```bash
    +---------+           +---------+          +---------+
    |  Master |           |  Agent  |          |  Worker |
    +---------+           +----+----+          +----+----+
         |      fork agent     |                    |
         +-------------------->|                    |
         |      agent ready    |                    |
         |<--------------------+                    |
         |                     |     fork worker    |
         +----------------------------------------->|
         |     worker ready    |                    |
         |<-----------------------------------------+
         |      Egg ready      |                    |
         +-------------------->|                    |
         |      Egg ready      |                    |
         +----------------------------------------->|
```

1. Master 启动后先 fork Agent 进程。
2. Agent 初始化成功后，通过 IPC 通道通知 Master。
3. Master 接着 fork 多个 App Worker。
4. App Worker 初始化成功后，通知 Master。
5. 所有进程初始化成功后，Master 通知 Agent 和 Worker，应用启动成功。

关于 Agent Worker，还有几点需要注意：

1. 因为 App Worker 依赖于 Agent，所以必须要等 Agent 初始化完成后才能 fork App Worker。
2. Agent 是 App Worker 的“小秘”，但不应该安排业务相关的工作，以免过于繁忙。
3. 由于 Agent 的特殊定位，我们应该确保它相对稳定。遇到未捕获异常时，框架不会像 App Worker 那样重启，而是记录异常日志、报警等待人工处理。
4. Agent 和普通 App Worker 提供的 API 不完全相同。想知道具体差异，请查看[框架文档](../advanced/framework.md)。

### Agent 的用法

你可以在应用或插件的根目录下的 `agent.js` 文件中实现你自己的逻辑（使用方法类似于[启动自定义](../basics/app-start.md)，只是入口参数为 agent 对象）。

```js
// agent.js
module.exports = agent => {
  // 在这里写你的初始化逻辑。

  // 你还可以通过 messenger 对象发送消息给 App Worker。
  // 但是，需要等 App Worker 启动成功后才能发送，否则可能丢失消息。
  agent.messenger.on('egg-ready', () => {
    const data = { ... };
    agent.messenger.sendToApp('xxx_action', data);
  });
};
```

```js
// app.js
module.exports = app => {
  app.messenger.on('xxx_action', data => {
    // ...
  });
};
```

这个例子中，`agent.js` 的代码将在 Agent 进程上执行，`app.js` 的代码则在 Worker 进程上执行。它们通过框架封装的 `messenger` 对象进行进程间通信（IPC）。后续章节会对框架的 IPC 进行详细讲解。
### Master VS Agent VS Worker

应用启动时，会同时创建三类进程。下表概述了每种进程的数量、作用、稳定性以及是否运行业务代码：

| 类型   | 进程数量           | 作用                       | 稳定性 | 是否运行业务代码 |
| ------ | ------------------ | -------------------------- | ------ | ---------------- |
| Master | 1                   | 进程管理，进程间消息转发   | 非常高 | 否               |
| Agent  | 1                   | 后台运行工作（长连接客户端） | 高     | 少量             |
| Worker | 通常设置为 CPU 核数  | 执行业务代码                | 一般   | 是               |

#### Master

在此模型中，Master 进程负责进程管理，类似 [pm2]，它不运行业务代码。我们仅需启动一个 Master 进程，它就会自动管理 Worker、Agent 进程的初始化及重启。

Master 进程非常稳定，在线上环境中，我们通过 [egg-scripts] 后台运行 Master 进程即可，不需额外使用 [pm2] 等进程守护模块。

```bash
$ egg-scripts start --daemon
```

#### Agent

在绝大多数情况下，编写业务代码时可以忽略 Agent 进程。但若需要代码仅运行在单个进程上，Agent 进程便显得尤为重要。

Agent 进程因只有一个实例，且承担多种任务，因此不能轻易重启。遇到未捕获的异常时，Agent 进程会记录错误日志，**我们应对日志中的未捕获异常保持警惕**。

#### Worker

Worker 进程处理用户请求和[定时任务](../basics/schedule.md)。Egg 的定时任务可控制仅由一个 Worker 进程执行，**因此可被解决的问题不应放在 Agent 上**。

Worker 进程因运行复杂的业务代码，稳定性相对较低。一旦 Worker 异常退出，Master 将重新启动一个新进程。

## 进程间通讯（IPC）

尽管 Worker 进程相对独立，它们间仍需通讯。以下是 Node.js 官方的 IPC 示例代码：

```js
'use strict';
const cluster = require('cluster');

if (cluster.isMaster) {
  const worker = cluster.fork();
  worker.send('hi there');
  worker.on('message', (msg) => {
    console.log(`msg: ${msg} from worker#${worker.id}`);
  });
} else if (cluster.isWorker) {
  process.on('message', (msg) => {
    process.send(msg);
  });
}
```

注意到 cluster 的 IPC 仅在 Master 和 Worker/Agent 之间有效，Worker 与 Agent 间无法直接通讯。Worker 之间的通讯需要经由 Master 转发。

```bash
广播消息：Agent => 所有 Worker
                  +--------+            +-------+
                  | Master |<-----------| Agent |
                  +--------+            +-------+
                 /    |     \
                /     |      \
               /      |       \
              /       |        \
             v        v         v
  +----------+   +----------+   +----------+
  | Worker 1 |   | Worker 2 |   | Worker 3 |
  +----------+   +----------+   +----------+

指定接收方：一个 Worker => 另一个 Worker
                  +--------+            +-------+
                  | Master |------------| Agent |
                  +--------+            +-------+
                 ^    |
                 |    | 发送至 Worker 2
                 |    |
                 |    v
  +----------+   +----------+   +----------+
  | Worker 1 |   | Worker 2 |   | Worker 3 |
  +----------+   +----------+   +----------+
```

为简化调用，我们在 app 和 agent 实例上封装了 messenger 对象，并提供了友好的 API：

### 发送

- `app.messenger.broadcast(action, data)`: 向所有的 agent / app 进程发送消息（包括自己）。
- `app.messenger.sendToApp(action, data)`: 发送至所有的 app 进程。
  - app 上调用即发送至自己与其他 app 
  - agent 上调用则发送至所有 app 进程。
- `app.messenger.sendToAgent(action, data)`: 发送消息至 agent 进程。
  - app 上调用即发送至 agent
  - agent 上调用即发送至自己。
- `agent.messenger.sendRandom(action, data)`: 
  - app 上无此方法（Egg 实现与 sentToAgent 类似）
  - agent 随机向某 app 进程发送消息（由 master 控制）。
- `app.messenger.sendTo(pid, action, data)`: 向指定进程发送消息。

```js
// app.js
module.exports = (app) => {
  // 只有在 egg-ready 事件后才能发送消息
  app.messenger.once('egg-ready', () => {
    app.messenger.sendToAgent('agent-event', { foo: 'bar' });
    app.messenger.sendToApp('app-event', { foo: 'bar' });
  });
};
```

所有 `app.messenger` 方法也可在 `agent.messenger` 上调用。

#### egg-ready

如上所述，在接到 `egg-ready` 消息后方可发送消息。只有当 Master 确认所有 Agent 和 Worker 启动成功并就绪后，才会通过 messenger 发送 `egg-ready` 通知每个 Agent 和 Worker，表示一切就绪，可使用 IPC。

### 接收

监听 messenger 上的相应 action 事件可收到其他进程发送的消息。

```js
app.messenger.on(action, (data) => {
  // 处理数据
});
app.messenger.once(action, (data) => {
  // 处理数据
});
```

_agent 上收消息的方式与 app 相同。_
现在我将开始根据《优秀技术文档的写作标准》修改全文。

---

## IPC 实战

我们通过一个简单的例子，来感受一下在框架的多进程模型下，如何使用 IPC 解决实际问题。

### 需求

我们有一个接口，需要从远程数据源中读取数据，并对外提供 API。但这个数据源的数据很少变化，因此我们希望将数据缓存到内存中以提升服务能力，降低 RT。此时就需要一个更新内存缓存的机制。

1. 定时从远程数据源获取数据，更新内存缓存。为了降低对数据源的压力，我们会把更新间隔时间设置得较长。
2. 远程数据源提供一个检查是否有数据更新的接口。我们的服务可以更频繁地调用此接口。当有数据更新时，才去重新拉取数据。
3. 远程数据源通过消息中间件推送数据更新的消息。我们的服务监听此消息来更新数据。

在实际项目中，我们可以采用方案一作为基础。结合方案三或方案二中的一种，以提升数据更新的实时性。而在这个示例中，我们会使用 IPC + [定时任务](../basics/schedule.md)，同时实现这三种更新方案。

### 实现

我们把所有与远程数据源交互的逻辑封装在一个 Service 中。并提供 `get` 方法给 Controller 调用。

```js
// app/service/source.js
let memoryCache = {};

class SourceService extends Service {
  get(key) {
    return memoryCache[key];
  }

  async checkUpdate() {
    // check if remote data source has changed
    const updated = await mockCheck();
    this.ctx.logger.info('check update response %s', updated);
    return updated;
  }

  async update() {
    // update memory cache from remote
    memoryCache = await mockFetch();
    this.ctx.logger.info('update memory cache from remote: %j', memoryCache);
  }
}
```

编写定时任务，实现方案一。每 10 分钟定时从远程数据源获取数据并更新缓存做兜底。

```js
// app/schedule/force_refresh.js
exports.schedule = {
  interval: '10m',
  type: 'all' // 在所有的 workers 中运行
};

exports.task = async (ctx) => {
  await ctx.service.source.update();
  ctx.app.lastUpdateBy = 'force';
};
```

再编写一个定时任务，来实现方案二的检查逻辑。让一个 worker 每 10 秒调用一次检查接口。发现数据有变化时，通过 messenger 通知所有的 Worker。

```js
// app/schedule/pull_refresh.js
exports.schedule = {
  interval: '10s',
  type: 'worker' // 只在一个 worker 中运行
};

exports.task = async (ctx) => {
  const needRefresh = await ctx.service.source.checkUpdate();
  if (!needRefresh) return;

  // notify all workers to update memory cache from `file`
  ctx.app.messenger.sendToApp('refresh', 'pull');
};
```

在自定义启动文件中，监听 `refresh` 事件并更新数据。所有的 Worker 进程都能收到这个消息，并触发更新。此时，我们的方案二也已经完成。

```js
// app.js
module.exports = (app) => {
  app.messenger.on('refresh', (by) => {
    app.logger.info('start update by %s', by);
    // 创建一个匿名 context 来访问 service
    const ctx = app.createAnonymousContext();
    ctx.runInBackground(async () => {
      await ctx.service.source.update();
      app.lastUpdateBy = by;
    });
  });
};
```

现在我们来看看如何实现第三个方案。我们需要一个消息中间件的客户端。它会和服务端维持长连接，适合在 Agent 进程上运行。这可以有效降低连接数，减少两端的消耗。所以我们在 Agent 进程上开启消息监听。

```js
// agent.js

const Subscriber = require('./lib/subscriber');

module.exports = (agent) => {
  const subscriber = new Subscriber();
  // 监听变更事件，广播到所有 workers
  subscriber.on('changed', () => agent.messenger.sendToApp('refresh', 'push'));
};
```

通过合理使用 Agent 进程、定时任务和 IPC，我们可以轻松搞定类似的需求。同时也可降低对数据源的压力。具体的示例代码可以查看 [examples/ipc](https://github.com/eggjs/examples/tree/master/ipc)。

## 更复杂的场景

在上面的例子中，我们在 Agent 进程上运行了一个 subscriber，来监听消息中间件的消息。如果 Worker 进程也需要监听一些消息怎么办？如何通过 Agent 进程建立连接，再转发给 Worker 进程呢？这些问题可以在 [多进程模型增强](../advanced/cluster-client.md) 文档中找到答案。
