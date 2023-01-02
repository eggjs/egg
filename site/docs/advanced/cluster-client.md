---
title: Multi-Process Development Model Enhancement
order: 4
---

In the previous [Multi-Process Model chapter](../core/cluster-and-ipc.md), we covered the multi-process model of the framework in detail, whose Agent process suits for a common class of scenarios: some middleware clients need to establish a persistent connection with server. In theory, a server had better establish only one persistent connection. However, the multi-process model will result in n times (n = number of Worker processes) connections being created.

```bash
+--------+   +--------+
| Client |   | Client |   ... n
+--------+   +--------+
    |  \     /   |
    |    \ /     |        n * m links
    |    / \     |
    |  /     \   |
+--------+   +--------+
| Server |   | Server |   ... m
+--------+   +--------+
```

In order to reuse persistent connections as much as possible (because they are very valuable resources for server), we put them into the Agent process to maintain, and then we transmit data to each Worker via messenger. It's feasible but we often need to write many codes to encapsulate the interface and realize data transmission, which is very troublesome.

In addition, it's relatively inefficient to transmit data via messenger, since messenger will do the transmission through the Master; In case IPC channel goes wrong, it would probably break Master process down.

So is there any better way? The answer is: YES! We provide a new type of model to reduce the complexity of this type of client encapsulation. The new Model bypasses the Master by establishing a direct socket between Agent and Worker. And as an external interface, Agent maintains shared connection among multiple Worker processes.

## Core Idea

- Inspired by the [Leader/Follower](https://www.dre.vanderbilt.edu/~schmidt/PDF/lf.pdf) model.
- The client is divided into two roles:
  - Leader: Be responsible for maintaining the connection with the remote server, only one Leader for the same type of client.
  - Follower: Delegate specific operations to the Leader. A common way is Subscribe-Model (let the Leader interact with remote server and wait for its return).
- How to determine who Leader is, who Follower is? There are two modes:
  - Free competition mode: clients determine the Leader by the competition of the local port when start up. For example: every one tries to monitor port 7777, and finally the only one instance who seizes it will become Leader, the rest will be Followers.
  - Mandatory mode: the framework designates a Leader and the rest are Followers.
- we use mandatory mode inside the framework. The Leader can only be created inside the Agent, which is also in line with our positioning of the Agent.
- When the framework starts up, Master will randomly select an available port as the communication port monitored by the Cluster Client, and passes it by parameter to Agent and App Worker.
- Leader communicates with Follower through direct socket connection (through communication port), no longer needs Master to transit.

Under the new mode, the client's communication is as follows:

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

## Client Interface Type Abstraction

We abstract the client interface into the following two broad categories, which is also a specification of the client interface. For clients that are in line with norms, we can automatically wrap it as Leader / Follower mode.

- Subscribe / Publish Mode:
  - The `subscribe(info, listener)` interface contains two parameters. The first one is the information subscribed and the second one is callback function for subscribe.
  - The `publish(info)` interface contains a parameter which is the information subscribed.
- Invoke Mode, supports three styles of interface: callback, promise and generator function, but generator function is recommended.

Client example

```js
const Base = require('sdk-base');

class Client extends Base {
  constructor(options) {
    super(options); // remember to invoke ready after initialization is successful
    this.ready(true);
  }
  /**
   * Subscribe
   *
   * @param {Object} info - subscription information (a JSON object, try not to include attributes such as Function, Buffer, Date)
   * @param {Function} listener - monitoring callback function, receives a parameter as the result of monitoring
   */

  subscribe(info, listener) {
    // ...
  }
  /**
   * Publish
   *
   * @param {Object} info - publishing information, which is similar to that of subscribe described above
   */

  publish(info) {
    // ...
  }
  /**
   * Get data (invoke)
   *
   * @param {String} id - id
   * @return {Object} result
   */

  async getData(id) {
    // ...
  }
}
```

## Exception Handling

- If Leader "dies", a new round of port contention will be triggered. The instance which seizes the port will be elected as the new Leader.
- To ensure that the channel between Leader and Follower is healthy, heartbeat mechanism needs to be introduced. If the Follower does not send a heartbeat packet within a fixed time, the Leader will proactively disconnect from the Follower, which will trigger the reinitialization of Follower.

## Protocol and Time Series to Invoke

Leader and Follower exchange data via the following protocols:

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

1. On the communication port Leader starts a Local Server, via which all Leaders / Followers communicate.
2. After Follower connects Local Server, it will firstly send a register channel packet (introduction of the channel concept is to distinguish between different types of clients).
3. Local Server will assign Follower to a specified Leader (match based on client type).
4. Follower sends requests to Leader to subscribe and publish.
5. Leader notifies Follower through the subscribe result packet when the subscription data changes.
6. Follower sends a call request to the Leader. The Leader executes a corresponding operation after receiving, and returns the result.

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

## Specific Usage

In the following I will use a simple example to introduce how to make a client support Leader / Follower mode in the framework.

- The first step, our client is best to meet the interface conventions mentioned above, for example:

```js
// registry_client.js
const URL = require('url');
const Base = require('sdk-base');

class RegistryClient extends Base {
  constructor(options) {
    super({
      // Specify a method for asynchronous start
      initMethod: 'init',
    });
    this._options = options;
    this._registered = new Map();
  }
  /**
   * Start logic
   */

  async init() {
    this.ready(true);
  }
  /**
   * Get configuration
   * @param {String} dataId - the dataId
   * @return {Object} configuration
   */

  async getConfig(dataId) {
    return this._registered.get(dataId);
  }
  /**
   * Subscribe
   * @param {Object} reg
   *   - {String} dataId - the dataId
   * @param {Function} listener - the listener
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
   * publish
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
      this.emit(
        key,
        this._registered.get(key).map((url) => URL.parse(url, true)),
      );
    }
  }
}

module.exports = RegistryClient;
```

- The second step is to encapsulate the `RegistryClient` using the `agent.cluster` interface:

```js
// agent.js
const RegistryClient = require('registry_client');

module.exports = (agent) => {
  // encapsulate and instantiate RegistryClient
  agent.registryClient = agent
    .cluster(RegistryClient) // parameter of create method is the parameter of RegistryClient constructor
    .create({});

  agent.beforeStart(async () => {
    await agent.registryClient.ready();
    agent.coreLogger.info('registry client is ready');
  });
};
```

- The third step, use the `app.cluster` interface to encapsulate `RegistryClient`:

```js
// app.js
const RegistryClient = require('registry_client');

module.exports = (app) => {
  app.registryClient = app.cluster(RegistryClient).create({});
  app.beforeStart(async () => {
    await app.registryClient.ready();
    app.coreLogger.info('registry client is ready');

    // invoke subscribe to subscribe
    app.registryClient.subscribe(
      {
        dataId: 'demo.DemoService',
      },
      (val) => {
        // ...
      },
    );

    // invoke publish to publsih data
    app.registryClient.publish({
      dataId: 'demo.DemoService',
      publishData: 'xxx',
    });

    // invoke getConfig interface
    const res = await app.registryClient.getConfig('demo.DemoService');
    console.log(res);
  });
};
```

Isn't it so simple?

Of course, if your client is not so 『standard』, then you may need to use some other APIs, for example, your subscription function is not named `subscribe`, but `sub`:

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

You need to set it manually with the `delegate` API:

```js
// agent.js
module.exports = (agent) => {
  agent.mockClient = agent
    .cluster(MockClient)
    // delegate sub to logic of subscribe
    .delegate('sub', 'subscribe')
    .create();

  agent.beforeStart(async () => {
    await agent.mockClient.ready();
  });
};
```

```js
// app.js
module.exports = (app) => {
  app.mockClient = app
    .cluster(MockClient)
    // delegate sub to subscribe logic
    .delegate('sub', 'subscribe')
    .create();

  app.beforeStart(async () => {
    await app.mockClient.ready();

    app.sub({ id: 'test-id' }, (val) => {
      // put your code here
    });
  });
};
```

We've already known that using `cluster-client` allows us to develop a 『pure』 RegistryClient without understanding the multi-process model. We can only focus on interacting with server, and use the `cluster-client` with a simple wrap to get a `ClusterClient` which supports multi-process model. The `RegistryClient` here is actually a `DataClient` that is specifically responsible for data communication with remote service.

You may have noticed that the `ClusterClient` brings with several constraints at the same time. If you want to expose the same approach to each process, `RegistryClient` can only support sub/pub mode and asynchronous API calls. Because all interactions in multi-process model must use socket communications, under which it is bound to bring this constraint.

Suppose we want to realize a synchronous `get` method. Put subscribed data directly into memory and use the `get` method to return data directly. How to achieve it? The real situation may be more complicated.

Here, we introduce an `APIClient` best practice. For modules that have requirements of synchronous API such as reading cached data, an `APIClient` is encapsulated base on RegistryClient to implement these APIs that are not related to interaction with the remote server. The `APIClient` instance is exposed to the user.

In `APIClient` internal implementation:

- To obtain data asynchronously, invoke RegistryClient's API base on ClusterClient.
- Interfaces that are unrelated to server, such as synchronous call, are to be implemented in `APIClient`. Since ClusterClient's APIs have flushed multi-process differences, there is no need to concern about multi-process model when calls to RegistryClient during developing `APIClient`.

For example, add a synchronous get method with buffer in the `APIClient` module:

```js
// some-client/index.js
const cluster = require('cluster-client');
const RegistryClient = require('./registry_client');

class APIClient extends Base {
  constructor(options) {
    super(options); // options.cluster is used to pass app.cluster to Egg's plugin

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
      this.subscribe(subMap[key], (value) => {
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

// at last the module exposes this APIClient
module.exports = APIClient;
```

Then we can use this module like this:

```js
// app.js || agent.js
const APIClient = require('some-client'); // the module above
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

To make it easy for you to encapsulate `APIClient`, we provide an` APIClientBase` base class in the [cluster-client](https://www.npmjs.com/package/cluster-client) module. Then `APIClient` above can be rewritten as:

```js
const APIClientBase = require('cluster-client').APIClientBase;
const RegistryClient = require('./registry_client');

class APIClient extends APIClientBase {
  // return the original client class
  get DataClient() {
    return RegistryClient;
  } // used to set the cluster-client related parameters, equivalent to the second parameter of the cluster method

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

in conclusion:

```bash
+------------------------------------------------+
| APIClient                                      |
|       +----------------------------------------|
|       | ClusterClient                          |
|       |      +---------------------------------|
|       |      | RegistryClient                  |
+------------------------------------------------+
```

- RegistryClient - responsible for communicating with remote service, to access data, supports for asynchronous APIs only, and does't care about multi-process model.
- ClusterClient - a client instance that is simply wrapped by the `cluster-client` module and is responsible for automatically flushing differences in multi-process model.
- APIClient - internally calls `ClusterClient` to synchronize data, without the need to concern about multi-process model and is the final exposed module for users. APIs are exposed Through this, and support for synchronization and asynchronization.

Students who are interested may have look at [enhanced multi-process development model](https://github.com/eggjs/egg/issues/322) discussion process.

## The Configuration Items Related to Cluster-Client in the Framework

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

| Configuration Items | Type     | Default            | Description                                                                                                                                                 |
| ------------------- | -------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| responseTimeout     | number   | 60000 (one minute) | Global interprocess communication timeout, you cannot set too short, because the proxy interface itself has a timeout setting                               |
| transcode           | function | N/A                | Serialization of interprocess communication, by default [serialize-json](https://www.npmjs.com/package/serialize-json) (set up manually is not recommended) |

The above is about global configuration. If you want to do a separate setting for a client:

- You can override by setting the second argument `options` in `app/agent.cluster(ClientClass, options)`:

```js
app.registryClient = app
  .cluster(RegistryClient, {
    responseTimeout: 120 * 1000, // the parameters passing here are related to cluster-client
  })
  .create({
    // here are parameters required by RegistryClient
  });
```

- You can also override the `getter` attribute of `clusterOptions` in `APIClientBase`:

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
