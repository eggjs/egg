title: 多进程模型
---

## 背景

我们知道 JavaScript 代码是运行在单线程上的，换句话说一个 node 进程只消耗一个 CPU。那么如果用 node 来做 web server，就无法享受到多核运算的好处。作为企业级的解决方案，我们要解决的一个问题就是:

> 如何榨干服务器资源，利用上多核 CPU 的并发优势？

而 node 官方提供的解决方案是 [cluster 模块](https://nodejs.org/api/cluster.html)

> A single instance of Node.js runs in a single thread. To take advantage of multi-core systems the user will sometimes want to launch a cluster of Node.js processes to handle the load.

> The cluster module allows you to easily create child processes that all share server ports.

## cluster 是什么呢？

简单的说，

- 在服务器上同时启动多个进程。
- 每个进程里都跑的是同一份源代码（好比把以前一个进程的工作分给多个进程去做）。
- 更神奇的是，这些进程可以同时监听一个端口（具体原理推荐阅读 @DavidCai1993 这篇 [cluster 实现原理](https://cnodejs.org/topic/56e84480833b7c8a0492e20c)）。

其中：

- 负责启动其他进程的叫做 Master 进程，他好比是个『包工头』，不做具体的工作，只负责启动其他进程。
- 其他被启动的叫 Worker 进程，顾名思义就是干活的『工人』。它们接收请求，对外提供服务。
- Worker 进程的数量一般根据服务器的 CPU 核数来定，这样就可以完美利用多核资源。

示例代码

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

## cluster 就够了吗？

上面的示例是不是很简单，但是作为企业级的解决方案，要考虑的东西还有很多。

- Worker 进程异常退出以后该如何处理？
- 多个 Worker 进程之间如何共享资源？
- 多个 Worker 进程之间如何调度？
- ...

### 异常处理

健壮性（又叫鲁棒性）是企业级应用必须考虑的问题，除了程序本身代码质量要保证，框架层面也需要提供相应的『兜底』机制保证极端情况下应用的可用性。

当一个 Worker 进程遇到未捕获的异常时，通常需要做两件事情：

1. 关闭当前进程所有的 TCP Server（将已有的连接快速断开，且不再接收新的连接），断开和 Master 的 IPC 通道，让进程能够优雅的退出；
2. 当 Worker 进程『死掉』以后，Master 进程会重新 fork 一个新的 Worker，保证在线的『工人』总数不变。

在框架里，我们采用 [graceful](https://github.com/node-modules/graceful) 和 [egg-cluster](https://github.com/eggjs/egg-cluster) 两个模块配合实现上面的逻辑。这套方案已在阿里和蚂蚁的生产环境广泛部署，且经受过『双11』大促的考验，所以是相对稳定和靠谱的。

流程图

```js
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
        |          exit             |                        |
        +-------------------------> |                        |
        |                           |                        |
       die                          |                        |
                                    |                        |
                                    |                        |
```

### 进程间通讯（IPC）

虽然每个 Worker 进程是相对独立的，但是它们之间始终还是需要通讯的，叫进程间通讯（IPC）。下面是 node 官方提供的一段示例代码

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

细心的你可能已经发现 cluster 的 IPC 通道只存在于 Master 和 Worker 之间，Worker 之间是没有的。那么 Worker 之间想通讯该怎么办呢？是的，通过 Master 来转发。

```js
// 广播消息： one worker => all workers
                 +---------+
                 |  Master |
                 +---------+
                 ^    |     \
                /     |      \
   broadcast   /      |       \
              /       |        \
             /        v         v
  +----------+   +----------+   +----------+
  | Worker 1 |   | Worker 2 |   | Worker 3 |
  +----------+   +----------+   +----------+

// 指定接收方： one worker => another worker
                 +---------+
                 |  Master |
                 +---------+
                 ^    |
     send to    /     |
    worker 2   /      |
              /       |
             /        v
  +----------+   +----------+   +----------+
  | Worker 1 |   | Worker 2 |   | Worker 3 |
  +----------+   +----------+   +----------+
```

为了方便调用，我们封装了一个 messenger 对象挂在 app 实例上，提供一系列友好的 API

```js
// 广播
const data = { ... };
app.messenger.broadcast('custom_action', data);

// 接收
app.messenger.on('custom_action', data => { ... });

// 指定接收方
const pid = 2; // @see https://nodejs.org/api/cluster.html#cluster_worker_id
app.messenger.sendTo(pid, 'custom_action', data);

// 只有 worker id 为 2 的进程会收到消息
app.messenger.on('custom_action', data => { ... });
```

## Agent 机制

说到这里，node 多进程方案貌似已经成型，这也是我们早期线上使用的方案。但后来我们发现有些工作其实不需要每个 Worker 都去做，如果都做，一来是浪费资源，更重要的是可能会导致多进程间资源访问冲突。举个例子：生产环境的日志文件我们一般会按照日期进行归档，在单进程模型下这再简单不过了：

> 1. 每天凌晨 0 点，将当前日志文件按照日期进行重命名
> 2. 销毁以前的文件句柄，并创建新的日志文件继续写入

试想如果现在是 4 个进程来做同样的事情，是不是就乱套了。所以，对于这一类后台运行的逻辑，我们希望将它们放到一个单独的进程上去执行，这个进程就叫 Agent Worker，简称 Agent。Agent 好比是 Master 给其他 Worker 请的一个秘书，它不对外提供服务，只给 App Worker 打工，专门处理一些公共事务。现在我们的多进程模型就变成下面这个样子了

```js
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

```js
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
         |                     |                    |
         |                     |                    |
```

1. Master 启动后先 fork Agent 进程
2. Agent 初始化成功后，通过 IPC 通道通知 Master
3. Master 再 fork 多个 App Worker
4. App Worker 初始化成功，通知 Master
5. 应用启动成功

另外，关于 Agent Worker 还有几点需要注意的是：

1. 由于 App Worker 依赖于 Agent，所以必须等 Agent 初始化完成后才能 fork App Worker
2. Agent 虽然是 App Worker 的『小秘』，但是业务相关的工作不应该放到 Agent 上去做，不然把她累垮了就不好了
3. 由于 Agent 的特殊定位，**我们应该保证它相对稳定**。当它发生未捕获异常，框架不会像 App Worker 一样让他退出重启，而是记录异常日志、报警等待人工处理
4. Agent 和普通 App Worker 挂载的 API 不完全一样，如何识别差异可查看[框架文档](./framework.md)

### Agent 的用法

你可以在应用或插件根目录下的 `agent.js` 中实现你自己的逻辑（和 `app.js` 用法类似，只是入口参数是 agent 对象）

```js
// agent.js
module.exports = agent => {
  // 在这里写你的初始化逻辑

  // 也可以通过 messenger 对象发送消息给 App Worker
  // 但需要等待 App Worker 启动成功后才能发送，不然很可能丢失
  agent.on('egg-ready', () => {
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

## Cluster Client

对于 Agent 的应用还有一类常见的场景：一些中间件客户端需要和服务器建立长连接，理论上一台服务器最好只建立一个长连接，但多进程模型会导致 n 倍（n = Worker 进程数）连接被创建。

```bash
+--------+   +--------+
| Client |   | Client |   ... n
+--------+   +--------+
    |  \     /   |
    |    \ /     |        n * m 个链接
    |    / \     |
    |  /     \   |
+--------+   +--------+
| Server |   | Server |   ... m
+--------+   +--------+
```

为了尽可能的复用长连接（因为它们对于服务端来说是非常宝贵的资源），我们会把它放到 Agent 进程里维护，然后通过 messenger 将数据传递给各个 Worker。这种做法是可行的，但是往往需要写大量代码去封装接口和实现数据的传递，非常麻烦。

另外，通过 messenger 传递数据效率是比较低的，因为它会通过 Master 来做中转；万一 IPC 通道出现问题还可能将 Master 进程搞挂。

那么有没有更好的方法呢？答案是肯定的，我们提供一种新的模式来降低这类客户端封装的复杂度。

### 核心思想

- 受到 [Leader/Follower](http://www.cs.wustl.edu/~schmidt/PDF/lf.pdf) 模式的启发
- 客户端会被区分为两种角色：
  - Leader: 负责和远程服务端维持连接，对于同一类的客户端只有一个 Leader
  - Follower: 会将具体的操作委托给 Leader，常见的是订阅模型（让 Leader 和远程服务端交互，并等待其返回）。
- 如何确定谁是 Leader，谁是 Follower 呢？有两种模式：
  - 自由竞争模式：客户端启动的时候通过本地端口的争夺来确定 Leader。例如：大家都尝试监听 7777 端口，最后只会有一个实例抢占到，那它就变成 Leader，其余的都是 Follower。
  - 强制指定模式：框架指定某一个 Leader，其余的就是 Follower
- 框架里面我们采用的是强制指定模式，Leader 只能在 Agent 里面创建，这也符合我们对 Agent 的定位
- 框架启动的时候 Master 会随机选择一个可用的端口作为 Cluster Client 监听的通讯端口，并将它通过参数传递给 Agent 和 App Worker
- Leader 和 Follower 之间通过 socket 直连（通过通讯端口），不再需要 Master 中转

新的模式下，客户端的启动流程如下：

```js
             +-------+
             | start |
             +---+---+
                 |
        +--------+---------+
      __| port competition |__
win /   +------------------+  \ lose
   /                           \
+--------+     tcp conn     +----------+
| Leader |<---------------->| Follower |
+--------+                  +----------+
    |
+--------+
| Client |
+--------+
    |  \
    |    \
    |      \
    |        \
+--------+   +--------+
| Server |   | Server |   ...
+--------+   +--------+
```

### 客户端接口类型抽象

我们将客户端接口抽象为下面两大类，这也是对客户端接口的一个规范，对于符合规范的客户端，我们可以自动将其包装为 Leader/Follower 模式

- 订阅、发布类（subscribe / publish）
  - `subscribe(info, listener)` 接口包含两个参数，第一个是订阅的信息，第二个是订阅的回调函数
  - `publish(info)` 接口包含一个参数，就是订阅的信息
- 调用类 (invoke)，支持 callback, promise 和 generator function 三种风格的接口，但是推荐使用 generator function。

客户端示例

```js
const Base = require('sdk-base');

class Client extends Base {
  constructor(options) {
    super(options);
    // 在初始化成功以后记得 ready
    this.ready(true);
  }

  /**
   * 订阅
   *
   * @param {Object} info - 订阅的信息（一个 JSON 对象，注意尽量不要包含 Function, Buffer, Date 这类属性）
   * @param {Function} listener - 监听的回调函数，接收一个参数就是监听到的结果对象
   */
  subscribe(info, listener) {
    // ...
  }

  /**
   * 发布
   *
   * @param {Object} info - 发布的信息，和上面 subscribe 的 info 类似
   */
  publish(info) {
    // ...
  }

  /**
   * 获取数据 (invoke)
   *
   * @param {String} id - id
   * @return {Object} result
   */
  * getData(id) {
    // ...
  }
}
```

### 异常处理

- Leader 如果“死掉”会触发新一轮的端口争夺，争夺到端口的那个实例被推选为新的 Leader
- 为保证 Leader 和 Follower 之间的通道健康，需要引入定时心跳检查机制，如果 Follower 在固定时间内没有发送心跳包，那么 Leader 会将 Follower 主动断开，从而触发 Follower 的重新初始化

### 协议和调用时序

Leader 和 Follower 通过下面的协议进行数据交换：

```js
 0       1       2               4                                                              12
 +-------+-------+---------------+---------------------------------------------------------------+
 |version|req/res|    reserved   |                          request id                           |
 +-------------------------------+-------------------------------+-------------------------------+
 |           timeout             |   connection object length    |   application object length   |
 +-------------------------------+---------------------------------------------------------------+
 |         conn object (JSON format)  ...                    |            app object             |
 +-----------------------------------------------------------+                                   |
 |                                          ...                                                  |
 +-----------------------------------------------------------------------------------------------+
```

1. 在通讯端口上 Leader 启动一个 Local Server，所有的 Leader/Follower 通讯都经过 Local Server
1. Follower 连接上 Local Server 后，首先发送一个 register channel 的 packet（引入 channel 的概念是为了区别不同类型的客户端）
2. Local Server 会将 Follower 分配给指定的 Leader（根据客户端类型进行配对）
3. Follower 向 Leader 发送订阅、发布请求，
4. Leader 在订阅数据变更时通过 subscribe result packet 通知 Follower
5. Follower 向 Leader 发送调用请求，Leader 收到后执行相应操作后返回结果

```js
 +----------+             +---------------+          +---------+
 | Follower |             |  Local Server |          |  Leader |
 +----------+             +---------------+          +---------+
      |     register channel     |       assign to        |
      + -----------------------> |  --------------------> |
      |                          |                        |
      |                                subscribe          |
      + ------------------------------------------------> |
      |       subscribe result                            |
      | <------------------------------------------------ +
      |                                                   |
      |                                 invoke            |
      + ------------------------------------------------> |
      |          invoke result                            |
      | <------------------------------------------------ +
      |                                                   |
```

### 具体的使用方法

下面我用一个简单的例子，介绍在框架里面如何让一个客户端支持 Leader/Follower 模式

- 第一步，我们的客户端最好是符合上面提到过的接口约定，例如：

```js
'use strict';

const URL = require('url');
const Base = require('sdk-base');

class RegistryClient extends Base {
  constructor(options) {
    super({
      // 指定异步启动的方法
      initMethod: 'init',
    });
    this._options = options;
    this._registered = new Map();
  }

  /**
   * 启动逻辑
   */
  * init() {
    this.ready(true);
  }

  /**
   * 获取配置
   * @param {String} dataId - the dataId
   * @return {Object} 配置
   */
  * getConfig(dataId) {
    return this._registered.get(dataId);
  }

  /**
   * 订阅
   * @param {Object} reg
   *   - {String} dataId - the dataId
   * @param {Function}  listener - the listener
   */
  subscribe(reg, listener) {
    const key = reg.dataId;
    this.on(key, listener);

    const data = this._registered.get(key);
    if (data) {
      process.nextTick(() => listener(data));
    }
  }

  /**
   * 发布
   * @param {Object} reg
   *   - {String} dataId - the dataId
   *   - {String} publishData - the publish data
   */
  publish(reg) {
    const key = reg.dataId;
    let changed = false;

    if (this._registered.has(key)) {
      const arr = this._registered.get(key);
      if (arr.indexOf(reg.publishData) === -1) {
        changed = true;
        arr.push(reg.publishData);
      }
    } else {
      changed = true;
      this._registered.set(key, [reg.publishData]);
    }
    if (changed) {
      this.emit(key, this._registered.get(key).map(url => URL.parse(url, true)));
    }
  }
}

module.exports = RegistryClient;
```

- 第二步，在 `agent.js` 中使用 `agent.cluster` 接口对 RegistryClient 进行封装

```js
'use strict';

const RegistryClient = require('registry_client');

module.exports = agent => {
  // 对 RegistryClient 进行封装和实例化
  agent.registryClient = agent.cluster(RegistryClient)
    // create 方法的参数就是 RegistryClient 构造函数的参数
    .create({});

  agent.beforeStart(function* () {
    yield agent.registryClient.ready();
    agent.coreLogger.info('registry client is ready');
  });
};
```

- 第三步，在 `app.js` 中使用 `app.cluster` 接口对 RegistryClient 进行封装

```js
'use strict';

const RegistryClient = require('registry_client');

module.exports = app => {
  app.registryClient = app.cluster(RegistryClient).create({});
  app.beforeStart(function* () {
    yield app.registryClient.ready();
    app.coreLogger.info('registry client is ready');

    // 调用 subscribe 进行订阅
    app.registryClient.subscribe({
      dataId: 'demo.DemoService',
    }, val => {
      // ...
    });

    // 调用 publish 发布数据
    app.registryClient.publish({
      dataId: 'demo.DemoService',
      publishData: 'xxx',
    });

    // 调用 getConfig 接口
    const res = yeild app.registryClient.getConfig('demo.DemoService');
    console.log(res);
  });
};
```

是不是很简单？

当然，如果你的客户端不是那么『标准』，那你可能需要用到其他一些 API，比如，你的订阅函数不叫 subscribe，叫 sub

```js
class MockClient extends Base {
  constructor(options) {
    super({
      initMethod: 'init',
    });
    this._options = options;
    this._registered = new Map();
  }

  * init() {
    this.ready(true);
  }

  sub(info, listener) {
    const key = reg.dataId;
    this.on(key, listener);

    const data = this._registered.get(key);
    if (data) {
      process.nextTick(() => listener(data));
    }
  }

  ...
}
```

你需要用 delegate API 手动设置

```js
// agent.js
module.exports = agent => {
  agent.mockClient = agent.cluster(MockClient)
    // 将 sub 代理到 subscribe 逻辑上
    .delegate('sub', 'subscribe')
    .create();

  agent.beforeStart(function* () {
    yield agent.mockClient.ready();
  });
};
```

```js
// app.js
module.exports = app => {
  app.mockClient = app.cluster(MockClient)
    // 将 sub 代理到 subscribe 逻辑上
    .delegate('sub', 'subscribe')
    .create();

  app.beforeStart(function* () {
    yield app.mockClient.ready();

    app.sub({ id: 'test-id' }, val => {
      // put your code here
    });
  });
};
```

我们已经理解，通过 cluster-client 可以让我们在不理解多进程模型的情况下开发『纯粹』的 RegistryClient，只负责和服务端进行交互，然后使用 cluster-client 进行简单的 wrap 就可以得到一个支持多进程模型的 ClusterClient。这里的 RegistryClient 实际上是一个专门负责和远程服务通信进行数据通信的 DataClient。

大家可能已经发现，ClusterClient 同时带来了一些约束，如果想在各进程暴露同样的方法，那么 RegistryClient 上只能支持 sub/pub 模式以及异步的 API 调用。因为在多进程模型中所有的交互都必须经过 socket 通信，势必带来了这一约束。

假设我们要实现一个同步的 get 方法，subscribe 过的数据直接放入内存，使用 get 方法时直接返回。要怎么实现呢？而真实情况可能比之更复杂。

在这里，我们引入一个 APIClient 的最佳实践。对于有读取缓存数据等同步 API 需求的模块，在 RegistryClient 基础上再封装一个 APIClient 来实现这些与远程服务端交互无关的 API，暴露给用户使用到的是这个 APIClient 的实例。

在 APIClient 内部实现上：

- 异步数据获取，通过调用基于 ClusterClient 的 RegistryClient 的 API 实现。
- 同步调用等与服务端无关的接口在 APIClient 上实现。由于 ClusterClient 的 API 已经抹平了多进程差异，所以在开发 APIClient 调用到 RegistryClient 时也无需关心多进程模型。

例如增加带缓存的 get 同步方法：

```js
const cluster = require('cluster-client');
const RegistryClient = require('./registry_client');

class APIClient extends Base {
  constructor(options) {
    super(options);

    // options.cluster 用于给 egg 的插件传递 app.cluster 进来
    this._client = (options.cluster || cluster)(RegistryClient).create(options);
    this._client.ready(() => this.ready(true));

    this._cache = {};

    // subMap:
    // {
    //   foo: reg1,
    //   bar: reg2,
    // }
    const subMap = options.subMap;

    for (const key in subMap) {
      this.subscribe(subMap[key], value => {
        this._cache[key] = value;
      });
    }
  }

  subscribe(reg, listener) {
    this._client.subscribe(reg, listener);
  }

  publish(reg) {
    this._client.publish(reg);
  }

  get(key) {
    return this._cache[key];
  }
}
```

最终模块向外暴露的是这个 APIClient：

```js
// index.js
module.exports = APIClient;
```

那么在插件中我们就可以这么使用：

```js
// app.js || agent.js
const APIClient = require('some-client'); // 上面那个模块
module.exports = app => {
  const config = app.config.apiClient;
  app.apiClient = new APIClient(Object.assign({}, config, { cluster: app.cluster.bind(app) });
  app.beforeStart(function* () {
    yield app.apiClient.ready();
  });
};

// config.${env}.js
exports.apiClient = {
  subMap: {
    foo: {
      id: '',
    },
    // bar...
  }
};
```


总结一下：

```bash
+------------------------------------------------+
| APIClient                                      |
|       +----------------------------------------|
|       | ClusterClient                          |
|       |      +---------------------------------|
|       |      | RegistryClient                  |
+------------------------------------------------+
```

- RegistryClient - 负责和远端服务通讯，实现数据的存取，只支持异步 API，不关心多进程模型。
- ClusterClient - 通过 cluster-client 模块进行简单 wrap 得到的 client 实例，负责自动抹平多进程模型的差异。
- APIClient - 内部调用 ClusterClient 做数据同步，无需关心多进程模型，用户最终使用的模块。API 都通过此处暴露，支持同步和异步。

有兴趣的同学可以看一下 [增强多进程研发模式](https://github.com/eggjs/egg/issues/322) 讨论过程。

[为什么我们没有选择 PM2?](../faq.md#进程管理为什么没有选型-pm2)
