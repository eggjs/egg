title: 多进程研发模式增强
---

在前面的[多进程模型章节](../core/cluster-and-ipc.md)中，我们详细讲述了框架的多进程模型，其中适合使用 Agent 进程的有一类常见的场景：一些中间件客户端需要和服务器建立长连接，理论上一台服务器最好只建立一个长连接，但多进程模型会导致 n 倍（n = Worker 进程数）连接被创建。

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

那么有没有更好的方法呢？答案是肯定的，我们提供一种新的模式来降低这类客户端封装的复杂度。通过建立 Agent 和 Worker 的 socket 直连跳过 Master 的中转。Agent 作为对外的门面维持多个 Worker 进程的共享连接。

## 核心思想

- 受到 [Leader/Follower](http://www.cs.wustl.edu/~schmidt/PDF/lf.pdf) 模式的启发
- 客户端会被区分为两种角色：
  - Leader: 负责和远程服务端维持连接，对于同一类的客户端只有一个 Leader
  - Follower: 会将具体的操作委托给 Leader，常见的是订阅模型（让 Leader 和远程服务端交互，并等待其返回）。
- 如何确定谁是 Leader，谁是 Follower 呢？有两种模式：
  - 自由竞争模式：客户端启动的时候通过本地端口的争夺来确定 Leader。例如：大家都尝试监听 7777 端口，最后只会有一个实例抢占到，那它就变成 Leader，其余的都是 Follower。
  - 强制指定模式：框架指定某一个 Leader，其余的就是 Follower
- 框架里面我们采用的是强制指定模式，Leader 只能在 Agent 里面创建，这也符合我们对 Agent 的定位
- 框架启动的时候 Master 会随机选择一个可用的端口作为 Cluster Client 监听的通讯端口，并将它通过参数传递给 Agent 和 App Worker
- Leader 和 Follower 之间通过 socket 直连（通过通讯端口），不再需要 Master 中转

新的模式下，客户端的通信方式如下：

```js
             +-------+
             | start |
             +---+---+
                 |
        +--------+---------+
      __| port competition |__
win /   +------------------+  \ lose
   /                           \
+---------------+     tcp conn     +-------------------+
| Leader(Agent) |<---------------->| Follower(Worker1) |
+---------------+                  +-------------------+
    |            \ tcp conn
    |             \
+--------+         +-------------------+
| Client |         | Follower(Worker2) |
+--------+         +-------------------+
```

## 客户端接口类型抽象

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
  async getData(id) {
    // ...
  }
}
```

## 异常处理

- Leader 如果“死掉”会触发新一轮的端口争夺，争夺到端口的那个实例被推选为新的 Leader
- 为保证 Leader 和 Follower 之间的通道健康，需要引入定时心跳检查机制，如果 Follower 在固定时间内没有发送心跳包，那么 Leader 会将 Follower 主动断开，从而触发 Follower 的重新初始化

## 协议和调用时序

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
      |                                 publish           |
      + ------------------------------------------------> |
      |                                                   |
      |       subscribe result                            |
      | <------------------------------------------------ +
      |                                                   |
      |                                 invoke            |
      + ------------------------------------------------> |
      |          invoke result                            |
      | <------------------------------------------------ +
      |                                                   |
```

## 具体的使用方法

下面我用一个简单的例子，介绍在框架里面如何让一个客户端支持 Leader/Follower 模式

- 第一步，我们的客户端最好是符合上面提到过的接口约定，例如：

```js
// registry_client.js
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
  async init() {
    this.ready(true);
  }

  /**
   * 获取配置
   * @param {String} dataId - the dataId
   * @return {Object} 配置
   */
  async getConfig(dataId) {
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

- 第二步，使用 `agent.cluster` 接口对 RegistryClient 进行封装

```js
// agent.js
const RegistryClient = require('registry_client');

module.exports = agent => {
  // 对 RegistryClient 进行封装和实例化
  agent.registryClient = agent.cluster(RegistryClient)
    // create 方法的参数就是 RegistryClient 构造函数的参数
    .create({});

  agent.beforeStart(async () => {
    await agent.registryClient.ready();
    agent.coreLogger.info('registry client is ready');
  });
};
```

- 第三步，使用 `app.cluster` 接口对 RegistryClient 进行封装

```js
// app.js
const RegistryClient = require('registry_client');

module.exports = app => {
  app.registryClient = app.cluster(RegistryClient).create({});
  app.beforeStart(async () => {
    await app.registryClient.ready();
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
    const res = await app.registryClient.getConfig('demo.DemoService');
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

  async init() {
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

  agent.beforeStart(async () => {
    await agent.mockClient.ready();
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

  app.beforeStart(async () => {
    await app.mockClient.ready();

    app.sub({ id: 'test-id' }, val => {
      // put your code here
    });
  });
};
```

我们已经理解，通过 cluster-client 可以让我们在不理解多进程模型的情况下开发『纯粹』的 RegistryClient，只负责和服务端进行交互，然后使用 cluster-client 进行简单的 wrap 就可以得到一个支持多进程模型的 ClusterClient。这里的 RegistryClient 实际上是一个专门负责和远程服务通信进行数据通信的 DataClient。

大家可能已经发现，ClusterClient 同时带来了一些约束，如果想在各进程暴露同样的方法，那么 RegistryClient 上只能支持 sub/pub 模式以及异步的 API 调用。因为在多进程模型中所有的交互都必须经过 socket 通信，势必带来了这一约束。

假设我们要实现一个同步的 get 方法，subscribe 过的数据直接放入内存，使用 get 方法时直接返回。要怎么实现呢？而真实情况可能比这更复杂。

在这里，我们引入一个 APIClient 的最佳实践。对于有读取缓存数据等同步 API 需求的模块，在 RegistryClient 基础上再封装一个 APIClient 来实现这些与远程服务端交互无关的 API，暴露给用户使用到的是这个 APIClient 的实例。

在 APIClient 内部实现上：

- 异步数据获取，通过调用基于 ClusterClient 的 RegistryClient 的 API 实现。
- 同步调用等与服务端无关的接口在 APIClient 上实现。由于 ClusterClient 的 API 已经抹平了多进程差异，所以在开发 APIClient 调用到 RegistryClient 时也无需关心多进程模型。

例如在模块的 APIClient 中增加带缓存的 get 同步方法：

```js
// some-client/index.js
const cluster = require('cluster-client');
const RegistryClient = require('./registry_client');

class APIClient extends Base {
  constructor(options) {
    super(options);

    // options.cluster 用于给 Egg 的插件传递 app.cluster 进来
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

// 最终模块向外暴露这个 APIClient
module.exports = APIClient;
```

那么我们就可以这么使用该模块：

```js
// app.js || agent.js
const APIClient = require('some-client'); // 上面那个模块
module.exports = app => {
  const config = app.config.apiClient;
  app.apiClient = new APIClient(Object.assign({}, config, { cluster: app.cluster });
  app.beforeStart(async () => {
    await app.apiClient.ready();
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

为了方便你封装 `APIClient`，在 [cluster-client](https://www.npmjs.com/package/cluster-client) 模块中提供了一个 `APIClientBase` 基类，那么上面的 `APIClient` 可以改写为：

```js
const APIClientBase = require('cluster-client').APIClientBase;
const RegistryClient = require('./registry_client');

class APIClient extends APIClientBase {
  // 返回原始的客户端类
  get DataClient() {
    return RegistryClient;
  }

  // 用于设置 cluster-client 相关参数，等同于 cluster 方法的第二个参数
  get clusterOptions() {
    return {
      responseTimeout: 120 * 1000,
    };
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

有兴趣的同学可以看一下[增强多进程研发模式](https://github.com/eggjs/egg/issues/322) 讨论过程。

## 在框架里面 cluster-client 相关的配置项

```js
/**
 * @property {Number} responseTimeout - response timeout, default is 60000
 * @property {Transcode} [transcode]
 *   - {Function} encode - custom serialize method
 *   - {Function} decode - custom deserialize method
 */
config.clusterClient = {
  responseTimeout: 60000,
};
```

配置项                  | 类型      | 默认值          | 描述
-----------------------|----------|-----------------|--------------------------------------------------------------------------
responseTimeout        | number   | 60000 （一分钟） | 全局的进程间通讯的超时时长，不能设置的太短，因为代理的接口本身也有超时设置
transcode              | function | N/A             | 进程间通讯的序列化方式，默认采用 [serialize-json](https://www.npmjs.com/package/serialize-json)（建议不要自行设置）

上面是全局的配置方式。如果，你想对一个客户端单独做设置

- 可以通过 `app/agent.cluster(ClientClass, options)` 的第二个参数 `options` 进行覆盖

```js
app.registryClient = app.cluster(RegistryClient, {
  responseTimeout: 120 * 1000, // 这里传入的是和 cluster-client 相关的参数
}).create({
  // 这里传入的是 RegistryClient 需要的参数
});
```

- 也可以通过覆盖 `APIClientBase` 的 `clusterOptions` 这个 `getter` 属性

```js
const APIClientBase = require('cluster-client').APIClientBase;
const RegistryClient = require('./registry_client');

class APIClient extends APIClientBase {
  get DataClient() {
    return RegistryClient;
  }

  get clusterOptions() {
    return {
      responseTimeout: 120 * 1000,
    };
  }

  // ...
}

module.exports = APIClient;
```
