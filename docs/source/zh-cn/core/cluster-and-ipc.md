title: 多进程模型和进程间通讯
---

我们知道 JavaScript 代码是运行在单线程上的，换句话说一个 Node.js 进程只能运行在一个 CPU 上。那么如果用 Node.js 来做 Web Server，就无法享受到多核运算的好处。作为企业级的解决方案，我们要解决的一个问题就是:

> 如何榨干服务器资源，利用上多核 CPU 的并发优势？

而 Node.js 官方提供的解决方案是 [Cluster 模块](https://nodejs.org/api/cluster.html)

> A single instance of Node.js runs in a single thread. To take advantage of multi-core systems the user will sometimes want to launch a cluster of Node.js processes to handle the load.

> The cluster module allows you to easily create child processes that all share server ports.

## Cluster 是什么呢？

简单的说，

- 在服务器上同时启动多个进程。
- 每个进程里都跑的是同一份源代码（好比把以前一个进程的工作分给多个进程去做）。
- 更神奇的是，这些进程可以同时监听一个端口（具体原理推荐阅读 @DavidCai1993 这篇 [Cluster 实现原理](https://cnodejs.org/topic/56e84480833b7c8a0492e20c)）。

其中：

- 负责启动其他进程的叫做 Master 进程，他好比是个『包工头』，不做具体的工作，只负责启动其他进程。
- 其他被启动的叫 Worker 进程，顾名思义就是干活的『工人』。它们接收请求，对外提供服务。
- Worker 进程的数量一般根据服务器的 CPU 核数来定，这样就可以完美利用多核资源。

```js
const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });
} else {
  // Workers can share any TCP connection
  // In this case it is an HTTP server
  http.createServer(function(req, res) {
    res.writeHead(200);
    res.end("hello world\n");
  }).listen(8000);
}
```

## 框架的多进程模型

上面的示例是不是很简单，但是作为企业级的解决方案，要考虑的东西还有很多。

- Worker 进程异常退出以后该如何处理？
- 多个 Worker 进程之间如何共享资源？
- 多个 Worker 进程之间如何调度？
- ...

### 进程守护

健壮性（又叫鲁棒性）是企业级应用必须考虑的问题，除了程序本身代码质量要保证，框架层面也需要提供相应的『兜底』机制保证极端情况下应用的可用性。

一般来说，Node.js 进程退出可以分为两类：

#### 未捕获异常

当代码抛出了异常没有被捕获到时，进程将会退出，此时 Node.js 提供了 `process.on('uncaughtException', handler)` 接口来捕获它，但是当一个 Worker 进程遇到 [未捕获的异常](https://nodejs.org/dist/latest-v6.x/docs/api/process.html#process_event_uncaughtexception) 时，它已经处于一个不确定状态，此时我们应该让这个进程优雅退出：

1. 关闭异常 Worker 进程所有的 TCP Server（将已有的连接快速断开，且不再接收新的连接），断开和 Master 的 IPC 通道，不再接受新的用户请求。
2. Master 立刻 fork 一个新的 Worker 进程，保证在线的『工人』总数不变。
3. 异常 Worker 等待一段时间，处理完已经接受的请求后退出。

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

而当一个进程出现异常导致 crash 或者 OOM 被系统杀死时，不像未捕获异常发生时我们还有机会让进程继续执行，只能够让当前进程直接退出，Master 立刻 fork 一个新的 Worker。

在框架里，我们采用 [graceful] 和 [egg-cluster] 两个模块配合实现上面的逻辑。这套方案已在阿里巴巴和蚂蚁金服的生产环境广泛部署，且经受过『双11』大促的考验，所以是相对稳定和靠谱的。

### Agent 机制

说到这里，Node.js 多进程方案貌似已经成型，这也是我们早期线上使用的方案。但后来我们发现有些工作其实不需要每个 Worker 都去做，如果都做，一来是浪费资源，更重要的是可能会导致多进程间资源访问冲突。举个例子：生产环境的日志文件我们一般会按照日期进行归档，在单进程模型下这再简单不过了：

> 1. 每天凌晨 0 点，将当前日志文件按照日期进行重命名
> 2. 销毁以前的文件句柄，并创建新的日志文件继续写入

试想如果现在是 4 个进程来做同样的事情，是不是就乱套了。所以，对于这一类后台运行的逻辑，我们希望将它们放到一个单独的进程上去执行，这个进程就叫 Agent Worker，简称 Agent。Agent 好比是 Master 给其他 Worker 请的一个『秘书』，它不对外提供服务，只给 App Worker 打工，专门处理一些公共事务。现在我们的多进程模型就变成下面这个样子了

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

那我们框架的启动时序如下：

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

1. Master 启动后先 fork Agent 进程
2. Agent 初始化成功后，通过 IPC 通道通知 Master
3. Master 再 fork 多个 App Worker
4. App Worker 初始化成功，通知 Master
5. 所有的进程初始化成功后，Master 通知 Agent 和 Worker 应用启动成功

另外，关于 Agent Worker 还有几点需要注意的是：

1. 由于 App Worker 依赖于 Agent，所以必须等 Agent 初始化完成后才能 fork App Worker
2. Agent 虽然是 App Worker 的『小秘』，但是业务相关的工作不应该放到 Agent 上去做，不然把她累垮了就不好了
3. 由于 Agent 的特殊定位，**我们应该保证它相对稳定**。当它发生未捕获异常，框架不会像 App Worker 一样让他退出重启，而是记录异常日志、报警等待人工处理
4. Agent 和普通 App Worker 挂载的 API 不完全一样，如何识别差异可查看[框架文档](../advanced/framework.md)

### Agent 的用法

你可以在应用或插件根目录下的 `agent.js` 中实现你自己的逻辑（和[启动自定义](../basics/app-start.md) 用法类似，只是入口参数是 agent 对象）

```js
// agent.js
module.exports = agent => {
  // 在这里写你的初始化逻辑

  // 也可以通过 messenger 对象发送消息给 App Worker
  // 但需要等待 App Worker 启动成功后才能发送，不然很可能丢失
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

这个例子中，`agent.js` 的代码会执行在 agent 进程上，`app.js` 的代码会执行在 Worker 进程上，他们通过框架封装的 `messenger` 对象进行进程间通讯（IPC），后面的章节会对框架的 IPC 做详细的讲解。

### Master VS Agent VS Worker

当一个应用启动时，会同时启动这三类进程。

| 类型 | 进程数量 | 作用 | 稳定性 | 是否运行业务代码
|------|--------|-----|-------|--------------
| Master | 1 | 进程管理，进程间消息转发 | 非常高 | 否
| Agent | 1 | 后台运行工作（长连接客户端）|高 | 少量
| Worker | 一般设置为 CPU 核数 | 执行业务代码 | 一般 | 是

#### Master

在这个模型下，Master 进程承担了进程管理的工作（类似 [pm2]），不运行任何业务代码，我们只需要运行起一个 Master 进程它就会帮我们搞定所有的 Worker、Agent 进程的初始化以及重启等工作了。

Master 进程的稳定性是极高的，线上运行时我们只需要通过 [egg-scripts] 后台运行通过 `egg.startCluster` 启动的 Master 进程就可以了，不再需要使用 [pm2] 等进程守护模块。

```bash
$ egg-scripts start --daemon
```

#### Agent

在大部分情况下，我们在写业务代码的时候完全不用考虑 Agent 进程的存在，但是当我们遇到一些场景，只想让代码运行在一个进程上的时候，Agent 进程就到了发挥作用的时候了。

由于 Agent 只有一个，而且会负责许多维持连接的脏活累活，因此它不能轻易挂掉和重启，所以 Agent 进程在监听到未捕获异常时不会退出，但是会打印出错误日志，**我们需要对日志中的未捕获异常提高警惕**。

#### Worker

Worker 进程负责处理真正的用户请求和[定时任务](../basics/schedule.md)的处理。而 Egg 的定时任务也提供了只让一个 Worker 进程运行的能力，**所以能够通过定时任务解决的问题就不要放到 Agent 上执行**。

Worker 运行的是业务代码，相对会比 Agent 和 Master 进程上运行的代码复杂度更高，稳定性也低一点，**当 Worker 进程异常退出时，Master 进程会重启一个 Worker 进程。**

## 进程间通讯（IPC）

虽然每个 Worker 进程是相对独立的，但是它们之间始终还是需要通讯的，叫进程间通讯（IPC）。下面是 Node.js 官方提供的一段示例代码

```js
'use strict';
const cluster = require('cluster');

if (cluster.isMaster) {
  const worker = cluster.fork();
  worker.send('hi there');
  worker.on('message', msg => {
    console.log(`msg: ${msg} from worker#${worker.id}`);
  });
} else if (cluster.isWorker) {
  process.on('message', (msg) => {
    process.send(msg);
  });
}
```

细心的你可能已经发现 cluster 的 IPC 通道只存在于 Master 和 Worker/Agent 之间，Worker 与 Agent 进程互相间是没有的。那么 Worker 之间想通讯该怎么办呢？是的，通过 Master 来转发。

```bash
广播消息： agent => all workers
                  +--------+          +-------+
                  | Master |<---------| Agent |
                  +--------+          +-------+
                 /    |     \
                /     |      \
               /      |       \
              /       |        \
             v        v         v
  +----------+   +----------+   +----------+
  | Worker 1 |   | Worker 2 |   | Worker 3 |
  +----------+   +----------+   +----------+

指定接收方： one worker => another worker
                  +--------+          +-------+
                  | Master |----------| Agent |
                  +--------+          +-------+
                 ^    |
     send to    /     |
    worker 2   /      |
              /       |
             /        v
  +----------+   +----------+   +----------+
  | Worker 1 |   | Worker 2 |   | Worker 3 |
  +----------+   +----------+   +----------+
```

为了方便调用，我们封装了一个 messenger 对象挂在 app / agent 实例上，提供一系列友好的 API。

### 发送

- `app.messenger.broadcast(action, data)`：发送给所有的 agent / app 进程（包括自己）
- `app.messenger.sendToApp(action, data)`: 发送给所有的 app 进程
   - 在 app 上调用该方法会发送给自己和其他的 app 进程
   - 在 agent 上调用该方法会发送给所有的 app 进程
- `app.messenger.sendToAgent(action, data)`: 发送给 agent 进程
   - 在 app 上调用该方法会发送给 agent 进程
   - 在 agent 上调用该方法会发送给 agent 自己
- `agent.messenger.sendRandom(action, data)`:
   - app 上没有该方法（现在 Egg 的实现是等同于 sentToAgent）
   - agent 会随机发送消息给一个 app 进程（由 master 来控制发送给谁）
- `app.messenger.sendTo(pid, action, data)`: 发送给指定进程

```js
// app.js
module.exports = app => {
  // 注意，只有在 egg-ready 事件拿到之后才能发送消息
  app.messenger.once('egg-ready', () => {
    app.messenger.sendToAgent('agent-event', { foo: 'bar' });
    app.messenger.sendToApp('app-event', { foo: 'bar' });
  });
}
```

*上面所有 `app.messenger` 上的方法都可以在 `agent.messenger` 上使用。*

#### egg-ready

上面的示例中提到，需要等 `egg-ready` 消息之后才能发送消息。只有在 Master 确认所有的 Agent 进程和 Worker 进程都已经成功启动（并 ready）之后，才会通过 messenger 发送 `egg-ready` 消息给所有的 Agent 和 Worker，告知一切准备就绪，IPC 通道可以开始使用了。

### 接收

在 messenger 上监听对应的 action 事件，就可以收到其他进程发送来的信息了。

```js
app.messenger.on(action, data => {
  // process data
});
app.messenger.once(action, data => {
  // process data
});
```

*agent 上的 messenger 接收消息的用法和 app 上一致。*

## IPC 实战

我们通过一个简单的例子来感受一下在框架的多进程模型下如何使用 IPC 解决实际问题。

### 需求

我们有一个接口需要从远程数据源中读取一些数据，对外部提供 API，但是这个数据源的数据很少变化，因此我们希望将数据缓存到内存中以提升服务能力，降低 RT。此时就需要有一个更新内存缓存的机制。

1. 定时从远程数据源获取数据，更新内存缓存，为了降低对数据源压力，更新的间隔时间会设置的比较长。
2. 远程数据源提供一个检查是否有数据更新的接口，我们的服务可以更频繁的调用检查接口，当有数据更新时才去重新拉取数据。
3. 远程数据源通过消息中间件推送数据更新的消息，我们的服务监听消息来更新数据。

在实际项目中，我们可以采用方案一用于兜底，结合方案三或者方案二的一种用于提升数据更新的实时性。而在这个示例中，我们会通过 IPC + [定时任务](../basics/schedule.md)来同时实现这三种缓存更新方案。

### 实现

我们将所有的与远程数据源交互的逻辑封装在一个 Service 中，并提供 `get` 方法给 Controller 调用。

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

编写定时任务，实现方案一，每 10 分钟定时从远程数据源获取数据更新缓存做兜底。

```js
// app/schedule/force_refresh.js
exports.schedule = {
  interval: '10m',
  type: 'all', // run in all workers
};

exports.task = async ctx => {
  await ctx.service.source.update();
  ctx.app.lastUpdateBy = 'force';
};
```

再编写一个定时任务来实现方案二的检查逻辑，每 10s 让一个 worker 调用检查接口，当发现数据有变化时，通过 messenger 提供的方法通知所有的 Worker。

```js
// app/schedule/pull_refresh.js
exports.schedule = {
  interval: '10s',
  type: 'worker', // only run in one worker
};

exports.task = async ctx => {
  const needRefresh = await ctx.service.source.checkUpdate();
  if (!needRefresh) return;

  // notify all workers to update memory cache from `file`
  ctx.app.messenger.sendToApp('refresh', 'pull');
};
```

在启动自定义文件中监听 `refresh` 事件，并更新数据，所有的 Worker 进程都能收到这个消息，并触发更新，此时我们的方案二也已经大功告成了。

```js
// app.js
module.exports = app => {
  app.messenger.on('refresh', by => {
    app.logger.info('start update by %s', by);
    // create an anonymous context to access service
    const ctx = app.createAnonymousContext();
    ctx.runInBackground(async () => {
      await ctx.service.source.update();
      app.lastUpdateBy = by;
    });
  });
};
```

现在我们来看看如何实现第三个方案。我们需要有一个消息中间件的客户端，它会和服务端保持长连接，这一类的长连接维持比较适合在 Agent 进程上做，可以有效降低连接数，减少两端的消耗。所以我们在 Agent 进程上来开启消息监听。

```js
// agent.js

const Subscriber = require('./lib/subscriber');

module.exports = agent => {
  const subscriber = new Subscriber();
  // listen changed event, broadcast to all workers
  subscriber.on('changed', () => agent.messenger.sendToApp('refresh', 'push'));
};
```

通过合理使用 Agent 进程、定时任务和 IPC，我们可以轻松搞定类似的需求并降低对数据源的压力。具体的示例代码可以查看 [examples/ipc](https://github.com/eggjs/examples/tree/master/ipc)。

## 更复杂的场景

上面的例子中，我们在 Agent 进程上运行了一个 subscriber，来监听消息中间件的消息，如果 Worker 进程也需要监听一些消息怎么办？如何通过 Agent 进程建立连接再转发给 Worker 进程呢？这些问题可以在[多进程研发模式增强](../advanced/cluster-client.md)中找到答案。

[pm2]: https://github.com/Unitech/pm2
[egg-cluster]: https://github.com/eggjs/egg-cluster
[egg-scripts]: https://github.com/eggjs/egg-scripts
[graceful]: https://github.com/node-modules/graceful
