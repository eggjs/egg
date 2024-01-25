---
title: 多进程研发模式增强
order: 4
---

在前面的[多进程模型章节](../core/cluster-and-ipc.md)中，我们详细讲述了框架的多进程模型。其中，适合使用 Agent 进程的有一类常见的场景：一些中间件客户端需要和服务器建立长连接。理论上，一台服务器最好只建立一个长连接，但多进程模型会导致 n 倍（n = Worker 进程数）的连接被创建。

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

为了尽可能复用长连接（因为它们对服务端来说是非常宝贵的资源），我们会把它放到 Agent 进程里维护，然后通过 messenger 将数据传递给各个 Worker。这种做法是可行的，但往往需要编写大量代码去封装接口和实现数据的传递，非常麻烦。

另外，通过 messenger 传递数据的效率比较低，因为它需要通过 Master 来做中转；万一 IPC 通道出现问题，还可能导致 Master 进程崩溃。

那么，有没有更好的方法呢？答案是肯定的，我们提供一种新的模式来降低这类客户端封装的复杂度。通过建立 Agent 和 Worker 的 socket 直连，避开 Master 的中转。Agent 作为对外的门面，维护多个 Worker 进程的共享连接。
修改后的文档内容如下：

核心思想

受到 [Leader/Follower 模式](https://www.dre.vanderbilt.edu/~schmidt/PDF/lf.pdf) 的启发，客户端被区分为两种角色：

- Leader：负责与远程服务端维持连接。在同一类型的客户端中，仅有一个 Leader。
- Follower：将具体操作委托给 Leader。常见的是订阅模型（让 Leader 与远程服务端交互，然后等待其返回）。

如何确定谁是 Leader，谁是 Follower 呢？有两种模式：

- 自由竞争模式：客户端启动时，通过本地端口的争夺来确定 Leader。例如，大家都尝试监听 7777 端口，只有一个实例能够抢占成功，它就成为 Leader，其余的则成为 Follower。
- 强制指定模式：框架强制指定某个 Leader，剩余的客户端自动成为 Follower。

在框架中，我们采用的是强制指定模式。Leader 只能在 Agent 中创建，符合 Agent 的定位。

框架启动时，Master 会随机选择一个可用端口作为 Cluster Client 监听通信的端口，并通过参数传递给 Agent 和 App Worker。Leader 与 Follower 之间通过 socket 直接连接（通过通信端口），不再经由 Master 中转。

新模式下，客户端的通信方式如下图所示：

```bash
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

我们将客户端接口抽象为下面两大类。这也是对客户端接口的一个规范，对于符合规范的客户端，我们可以自动将其包装为 Leader/Follower 模式。

- 订阅、发布类（subscribe / publish）：
  - `subscribe(info, listener)` 接口包含两个参数，第一个是订阅的信息，第二个是订阅回调函数。
  - `publish(info)` 接口包含一个参数，就是订阅的信息。
- 调用类（invoke），支持 callback，promise 和 generator function 三种风格的接口，推荐使用 generator function。

客户端示例

```javascript
const Base = require('sdk-base');

class Client extends Base {
  constructor(options) {
    super(options);
    // 初始化成功后记得调用 `ready`
    this.ready(true);
  }

  /**
   * 订阅
   *
   * @param {Object} info - 订阅信息（一个 JSON 对象，注意尽量不要包含 Function, Buffer, Date 这类属性）
   * @param {Function} listener - 监听回调函数，接收一个参数即监听到的结果对象
   */
  subscribe(info, listener) {
    // ...
  }

  /**
   * 发布
   *
   * @param {Object} info - 发布的信息，和上面的 subscribe 的 info 类似
   */
  publish(info) {
    // ...
  }

  /**
   * 获取数据 (invoke)
   *
   * @param {String} id - id
   * @return {Object} result - 获取的数据
   */
  async getData(id) {
    // ...
  }
}
```

## 异常处理

- 如果 Leader "死掉"，将触发新一轮的端口争夺。争夺到端口的实例将被推选为新的 Leader。
- 为确保 Leader 和 Follower 之间的通道健康，需引入定时心跳检查机制。若 Follower 在规定时间内未发送心跳包，Leader 将主动断开与 Follower 的连接，触发其重新初始化。
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

1. 在通讯端口上，Leader 启动一个 Local Server，所有的 Leader/Follower 通讯都经过 Local Server。
2. Follower 连接上 Local Server 后，首先发送一个 register channel 的 packet（引入 channel 的概念是为了区别不同类型的客户端）。
3. Local Server 会将 Follower 分配给指定的 Leader（根据客户端类型进行配对）。
4. Follower 向 Leader 发送订阅、发布请求。
5. Leader 在订阅数据变更时，通过 subscribe result packet 通知 Follower。
6. Follower 向 Leader 发送调用请求，Leader 收到后执行相应操作后返回结果。

```js
 +----------+             +---------------+          +---------+
 | Follower |             |  Local Server |          |  Leader |
 +----------+             +---------------+          +---------+
      |     register channel     |       assign to        |
      + ------------------------> | ---------------------> |
      |                           |                       |
      |                          subscribe                |
      + -----------------------------------------------> |
      |                          publish                 |
      + -----------------------------------------------> |
      |                                                  |
      |         subscribe result                         |
      | <------------------------------------------------+
      |                                                  |
      |                          invoke                  |
      + -----------------------------------------------> |
      |          invoke result                           |
      | <------------------------------------------------+
      |                                                  |
```
## 具体的使用方法

下面我用一个简单的例子，介绍在框架里如何让一个客户端支持 Leader/Follower 模式：

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
   * @param {String} dataId - 数据 ID
   * @return {Object} 配置
   */
  async getConfig(dataId) {
    return this._registered.get(dataId);
  }

  /**
   * 订阅
   * @param {Object} reg
   *   - {String} dataId - 数据 ID
   * @param {Function} listener - 监听器函数
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
   *   - {String} dataId - 数据 ID
   *   - {String} publishData - 发布的数据
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
      this.emit(
        key,
        this._registered.get(key).map(url => URL.parse(url, true)),
      );
    }
  }
}

module.exports = RegistryClient;
```

- 第二步，使用 `agent.cluster` 接口对 `RegistryClient` 进行封装：

```js
// agent.js
const RegistryClient = require('./registry_client');

module.exports = agent => {
  // 对 RegistryClient 进行封装和实例化
  agent.registryClient = agent
    .cluster(RegistryClient)
    // create 方法的参数就是 RegistryClient 构造函数的参数
    .create({});

  agent.beforeStart(async () => {
    await agent.registryClient.ready();
    agent.coreLogger.info('registry client is ready');
  });
};
```

- 第三步，使用 `app.cluster` 接口对 `RegistryClient` 进行封装：

```js
// app.js
const RegistryClient = require('./registry_client');

module.exports = app => {
  app.registryClient = app.cluster(RegistryClient).create({});
  app.beforeStart(async () => {
    await app.registryClient.ready();
    app.coreLogger.info('registry client is ready');

    // 调用 subscribe 进行订阅
    app.registryClient.subscribe(
      { dataId: 'demo.DemoService' },
      val => {
        // 这里是当获取到新的配置信息后的处理逻辑
      },
    );

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

看起来是不是很简单？

当然，如果你的客户端不是那么“标准”，那你可能需要用到其他一些 API，比如，你的订阅函数不叫 `subscribe` 而叫 `sub`：

```js
class MockClient extends Base {
  constructor(options) {
    super({
      initMethod: 'init',
    ...
  }

  sub(info, listener) {
    ...
  }

  ...
}
```

你需要通过 `delegate`（API 代理）手动设置此委托：

```js
// agent.js
module.exports = agent => {
  ...
    // 将 sub 代理到 subscribe 逻辑上
    .delegate('sub', 'subscribe')
    .create();
  ...
};
```

```js
// app.js
module.exports = app => {
  ...
    // 将 sub 代理到 subscribe 逻辑上
    .delegate('sub', 'subscribe')
    .create();
  ...
};
```

我们已经知道，通过 `cluster-client` 可以让我们在不理解多进程模型的情况下开发“纯粹”的 `RegistryClient`，只负责和服务端进行交互，然后通过 `cluster-client` 的简单封装就可以得到支持多进程模型的 `ClusterClient`。这里的 `RegistryClient` 实际上是一个专门负责和远程服务通信进行数据通信的 `DataClient`。

大家可能已经注意到，`ClusterClient` 同时带来了一些约束。如果想在各进程暴露相同的方法，则 `RegistryClient` 上只能支持 sub/pub 模式和异步的 API 调用。因为在多进程模型中所有的交互都必须经过 socket 通信，这就带来了这些约束。

假设我们要实现一个同步的 get 方法，已订阅的数据直接放入内存，使用 get 方法时直接返回，应该怎么做呢？而真实情况可能比这更复杂。

在这里，我们会接纳一个 `APIClient` 的最佳实践。对于需要读取缓存数据等同步 API 的模块，在 `RegistryClient` 的基础上再封装一个 `APIClient` 来实现这些与远程服务端无关的 API，用户使用到的实际上是 `APIClient` 的实例。

在 `APIClient` 的内部实现上：

- 异步数据获取是通过调用基于 `ClusterClient` 的 `RegistryClient` 的 API 实现的。
- 同步调用等与服务端无关的接口在 `APIClient` 上实现。由于 `ClusterClient` 的 API 已经抹平了多进程差异，因此在开发 `APIClient` 调用 `RegistryClient` 时也无需关心多进程模型。

例如，我们可以在模块的 `APIClient` 中增加一个带缓存的 get 同步方法：

```js
// some-client/index.js
const cluster = require('cluster-client');
const RegistryClient = require('./registry_client');

class APIClient extends Base {
  ...
  get(key) {
    ...
  }
}

// 最终模块向外暴露这个 APIClient
module.exports = APIClient;
```

这样我们就可以这样使用该模块：

```js
// app.js || agent.js
const APIClient = require('some-client');
module.exports = app => {
  ...
};

// config.${env}.js
exports.apiClient = {
  ...
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

  // 用于设置 cluster-client 相关参数，相当于 cluster 方法的第二个参数
  get clusterOptions() {
    ...
  }

  subscribe(reg, listener) {
    ...
  }

  publish(reg) {
    ...
  }

  get(key) {
    ...
  }
}
```

总结一下整个结构：

```plaintext
+------------------------------------------------+
| APIClient                                      |
|       +----------------------------------------|
|       | ClusterClient                          |
|       |      +---------------------------------|
|       |      | RegistryClient                  |
+------------------------------------------------+
```

- RegistryClient - 负责与远端服务通讯，实现数据的存取，只支持异步 API，不关心多进程模型。
- ClusterClient - 通过 `cluster-client` 模块对 `RegistryClient` 进行的包装，它负责自动抹平多进程模型的差异。
- APIClient - 内部通过调用 `ClusterClient` 来做数据同步，无需关心多进程模型，用户最终使用的就是这个模块。API 通过它暴露，支持同步和异步。

有兴趣的同学可以看一下[增强多进程研发模式](https://github.com/eggjs/egg/issues/322)讨论过程。
## 在框架里面 `cluster-client` 相关的配置项

```js
/**
 * @property {Number} responseTimeout - 响应超时时间，默认值为 60000
 * @property {Transcode} [transcode]
 *   - {Function} encode - 自定义序列化方法
 *   - {Function} decode - 自定义反序列化方法
 */
config.clusterClient = {
  responseTimeout: 60000,
};
```

| 配置项          | 类型      | 默认值          | 描述                                                                                   |
| --------------- | --------- | --------------- | -------------------------------------------------------------------------------------- |
| responseTimeout | Number    | 60000（一分钟） | 全局的进程间通讯的超时时长，不宜设置得太短，因为代理的接口本身也有超时设置           |
| transcode       | Function  | N/A             | 进程间通讯的序列化方式，默认采用 [serialize-json](https://www.npmjs.com/package/serialize-json)（建议不要自行设置） |

上述是全局的配置方式。如果你想对一个客户端单独设置：

- 可以通过 `app/agent.cluster(ClientClass, options)` 的第二个参数 `options` 进行覆盖。

```js
app.registryClient = app
  .cluster(RegistryClient, {
    responseTimeout: 120000, // 这里传入的是与 `cluster-client` 相关的参数
  })
  .create({
    // 这里传入的是 `RegistryClient` 所需的参数
  });
```

- 也可以通过覆盖 `APIClientBase` 的 `clusterOptions` 这个 `getter` 属性。

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