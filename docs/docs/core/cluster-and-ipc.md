---
title: Multi-Process Model and Inter-Process Communication
order: 7
---

We know that JavaScript codes are run on single thread, in other words, one Node.js process only runs on one CPU. So if we use Node.js as a Web Server, we cannot benefit from multi-core any more. As an enterprise-level solution, one problem that must be solved is:

> how to squeeze all server resources, taking advantages of multi-cores?

And the official solution provided by Node.js is [Cluster module](https://nodejs.org/api/cluster.html), and there's an introduction:

> A single instance of Node.js runs in a single thread. To take advantage of multi-core systems the user will sometimes want to launch a cluster of Node.js processes to handle the load.
>
> The cluster module allows you to easily create child processes that all share server ports.

# What is Cluster?

In short,

- fork multiple processes on the server concurrently.
- every single process runs the same source code(just like assigning work done by one process to multiple processes).
- what is more, all these processes can listen on the same one port(for detailed mechanism referring to @DavidCai1993 [Cluster Implementation Mechanism](https://cnodejs.org/topic/56e84480833b7c8a0492e20c))

of which:

- the process that forks other processes is called Master process, it seems like a contractor that does nothing except forking other processes.
- other forked processes are called Worker processes, as the name suggests, they are workers that work actually. They accept requests and provide services.
- usually the number of Worker processes depends on the CPU core number, only in this way can we take full advantage of multi-core resources.

```js
const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', function (worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });
} else {
  // Workers can share any TCP connection
  // In this case it is an HTTP server
  http
    .createServer(function (req, res) {
      res.writeHead(200);
      res.end('hello world\n');
    })
    .listen(8000);
}
```

## Multi-Process Model of the Framework

Simple like the example above, but as an enterprise-level solution, much more remains to be considered.

- How to handle the exception that Worker processes exit unexpected?
- How to share resources among multiple Worker processes?
- How to schedule multiple Worker processes?
- ...

### Daemon Process

Haleness(aka Robustness) of an enterprise-level application must be considered, apart from the guarantee of high quality codes of program itself, the framework level should provide the cache-all mechanism to ensure the availability under extreme circumstance.

Generally, Node.js processes exit for two reasons:

#### Uncaught Exception

The process will exit when codes throw an exception but fail to catch it, at this time, Node.js provides `process.on('uncaughtException', handler)` interface to catch it, But if a Worker process encounters an uncaught exception, it enters an uncertain state and what we should do is to make it exit elegantly:

1. close all TCP Servers started by the corrupted Worker process(close all connections and stop accepting new requests), close the IPC channel between Master and do not accept user requests any more.
2. a new Worker process should be forked by the Master immediately to ensure the total number of workers unchanged.
3. the corrupted Worker process waits for a while before exit in order to get through accepted requests.

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

#### OOM, System Exception

When a process crashes due to exceptions or is killed due to OOM by the OS, we have no chance to resume the process like uncaught exceptions occurring, the only choice is to exit current process directly then Master forks a new Worker immediately.

In the framework, we use [graceful] and [egg-cluster] 2 modules correspondingly to implement above logics. This solution has been widely deployed in production environment in Alibaba Cor. and Ant Financial Cor. and is long-tested by 'Double 11' big promotion, solid and reliable.

### Agent Mechanism

Up to now, Node.js multi-process solution seems good enough and it's also the solution that we used in production environment previously. But before long, we find that there is some work that should not be done by every Worker in fact, if not, it leads to wasting of resources and, even worse, it may result in conflicts on resource access among processes. For example: we usually archive log file by date in production environment and it is easy to do in single process model:

> 1. at 0 o'clock in the morning, rename current log file by date
> 2. destroy previous file handle, create new log file and continue writing

Now imagine there are 4 processes doing the same work, and they may get into a mess. So for this kind of background logics, we'd like to run it on a single process which is called Agent Worker, or Agent for short. Agent is something like a 'secretary' for other Worker which is introduced by Master, it does not serve outside but only App Workers, especially processes common affairs. Now our multi-process model becomes something like below:

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

And our framework startup sequence looks like:

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

1. Agent process is forked after Mater starts up
2. when Agent initialized successfully, Master is notified via IPC channel
3. Master forks many App Workers
4. when App Worker initialized successfully, Master is notified
5. when all process initialized successfully, Master notifies Agent and Worker that the application starts up successfully

Besides, there still is something about Agent Worker needing to be notices:

1. since App Worker depends on Agent, App Worker can be forked only after Agent being initialized
2. although Agent is the secretary of App Worker, business related work should not be assigned to Agent, or it may be broken down
3. considering the special orientation of Agent, **we must ensure it's relatively stable**. When it throws an uncaught exception, framework does not shut it down then restart it like App Worker, instead, it logs the exception, gives an alarm and waits for manual handling
4. mounting API of Agent differs from that of App Worker, and differences are listed in [Framework docs](../advanced/framework.md)

### Agent Usage

You can implement your own logics in `agent.js` which is under the directory of the application or the plugin(like the usage of [Customized Startup](../basics/app-start.md), and the only difference is using agent object as the entrance parameter)

```js
// agent.js
module.exports = agent => {
  // put your initialization logics here

  // messages can also be sent by the messenger object to App Worker
  // but you should wait until App Worker starts up successfully, or the message may be lost
  agent.messenger.on('egg-ready', () => {
    const data = { ... };
    agent.messenger.sendToApp('xxx_action', data);
  });
};
```

```js
// app.js
module.exports = (app) => {
  app.messenger.on('xxx_action', (data) => {
    // ...
  });
};
```

In this example, codes of `agent.js` are run in Agent process, codes of `app.js` are run in the Worker process, and they do the Inter-Process Communication(IPC) through the `messenger` object encapsulated by framework. Details about the IPC are explained in later sections.

### Master vs Agent vs Worker

When an application starts up, 3 kinds of processes will be forked.

| Type   | Number of Processes             | Purpose                                                      | Stability | Run Business Codes or Not |
| ------ | ------------------------------- | ------------------------------------------------------------ | --------- | ------------------------- |
| Master | 1                               | Managing processes and transmitting messages among processes | Very High | No                        |
| Agent  | 1                               | Running background jobs(persistent connection client)        | High      | Little                    |
| Worker | usually the number of CPU cores | Running Business codes                                       | Normal    | Yes                       |

#### Master

With this model, Master process undertakes the process management workers(like [pm2]) but runs no business codes. We simply start up a Master process and it will handle all initialization and restarting issues of Worker and Agent processes.

Master process is extremely stable. We simply use [egg-scripts] for online and `egg.startCluster` for background to start Master process and [pm2] or other daemon module is no long necessary.

```bash
$ egg-scripts start --daemon
```

#### Agent

In most cases, we needn't care about Agent process when writing business codes, but in several cases, where we propose to run the codes in a single process and that is the time we use Agent process.

Since there's only one Agent that is in charge of tough and tedious work like keeping connections, it cannot be hang or restarted rashly. Agent process won't exit when encounters uncaught exceptions, but output an error log instead, **so we should always keep out eyes on the uncaught exceptions in logs**.

#### Worker

Worker process undertakes user requests and [scheduled tasks](../basics/schedule.md) actually. Egg provides scheduled tasks with the ability to be run only in one Worker process, **so never solve problems by Agent as long as they can be solved by scheduled tasks**.

Worker runs business codes, which are more complicated than those of Agent and Master but the stability may be lower, **a Worker process will be restarted by Master when a Worker process exits unexpectedly**.

## Inter-Process Communication(IPC)

Although every Worker process runs individually, it's necessary for them to communicate with each other which is called inter-process communication(IPC). Below is an example code provided by Node.js officially.

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

Carefully you can see that the IPC channel of clusters exists only between Master and Worker/Agent, not between Worker and Agent. So how to communicate among Workers? Yes, Master helps transmit.

```bash
Broadcast messages: agent => all workers
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

Specify receivers: one worker => another worker
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

To simplify the invocation, we have encapsulated a messenger object and attached it to the app/agent instance, a set of friendly APIs is provided too.

### Send

- `app.messenger.broadcast(action, data)`: sends messages to all agent/app processes(including itself)
- `app.messenger.sendToApp(action, data)`: sends messages to all app processes
  - when called on app, it sends messages to itself and other app processes
  - when called on agent, it sends messages to all app processes
- `app.messenger.sendToAgent(action, data)`: sends messages to the agent process
  - when called on app, it sends messages to the agent process
  - when called on agent, it sends messages to the agent itself
- `agent.messenger.sendRandom(action, data)`:
  - app dose not have this method(now Egg implements it as sendToAgent)
  - agent sends a random message to one app process(master determines whom to send to)
- `app.messenger.sendTo(pid, action, data)`: send messages to specified process

```js
// app.js
module.exports = (app) => {
  // Note, only after egg-ready event occurs can the message be sent
  app.messenger.once('egg-ready', () => {
    app.messenger.sendToAgent('agent-event', { foo: 'bar' });
    app.messenger.sendToApp('app-event', { foo: 'bar' });
  });
};
```

_All methods called on `app.messenger` above can be called on `agent.messenger` too._

#### `egg-ready`

We mentioned in the example above that, only after egg-ready event occurs can the message be sent. Only after Master makes sure that all Agent process and Worker processes have been started successfully(and ready), can the `egg-ready` message be sent to all Agent and Worker through messenger, notifying that everything is ready and the IPC channel can be used.

### Receive

Listen the action event on messenger therefore messages sent by other processes can be received.

```js
app.messenger.on(action, (data) => {
  // process data
});
app.messenger.once(action, (data) => {
  // process data
});
```

_The way to receive messages using messenger in agent is the same with that of app._

## IPC in Practice

Now we will show you how IPC solves real problems with the multi-process model of framework by a simple example.

### Requisition

We have a API that gets data from the remote data source and provides services outside. Since data of the data source change little and we prefer to cache it in the memory to accelerate the response of services and reduce the RT. Now a mechanism to update the memory cache is needed.

1. Get data from the remote data source periodically and update the memory cache. To reduce pressure on the data source, the period for updating may be set relatively long.
2. The remote data source provides an API to check whether its data has been updated. Our service calls that API more frequently and only when data is updated can it pull the data.
3. The remote data source pushes data changes through a message-oriented middleware on which our service listens to update the data.

In real projects, we use solution one to catch all, and, in combination with solution tow or three, the instantaneity of data updating can be sped up. In the example, we use IPC + [scheduled tasks](../basics/schedule.md) to implement these three cache updating solutions in the same time.

### Implementation

We put all logics that is used to interact with the remote data source into a Service, where a `get` method is exposed to Controller to invoke.

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

Write the scheduled task to implement solution one: gets data changes from the remote data source every 10 minutes to update cache as a cache-all.

```js
// app/schedule/force_refresh.js
exports.schedule = {
  interval: '10m',
  type: 'all', // run in all workers
};

exports.task = async (ctx) => {
  await ctx.service.source.update();
  ctx.app.lastUpdateBy = 'force';
};
```

Write a scheduled task again to implement check logics of solution two: make a worker call the check API every 10 seconds and notify all Workers using methods provided by messenger when data changes are found.

```js
// app/schedule/pull_refresh.js
exports.schedule = {
  interval: '10s',
  type: 'worker', // only run in one worker
};

exports.task = async (ctx) => {
  const needRefresh = await ctx.service.source.checkUpdate();
  if (!needRefresh) return;

  // notify all workers to update memory cache from `file`
  ctx.app.messenger.sendToApp('refresh', 'pull');
};
```

Listen on the `pullRefresh` event in the customized start-up file and update data. All Worker processes will receive this message, trigger updates and our solution two succeeds at last.

```js
// app.js
module.exports = (app) => {
  app.messenger.on('refresh', (by) => {
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

Now let's consider how to implement solution three. We need a message-oriented middleware that keeps persistent connections with the server side. This kind of persistent connections is proper for Agent process to keep which can effectively reduce connection numbers and reduce costs both ends. So we start message listening on Agent process.

```js
// agent.js

const Subscriber = require('./lib/subscriber');

module.exports = (agent) => {
  const subscriber = new Subscriber();
  // listen changed event, broadcast to all workers
  subscriber.on('changed', () => agent.messenger.sendToApp('refresh', 'push'));
};
```

With an intelligent use of Agent process, scheduled tasks and IPC, we can easily implement this kind of requisition and reduce pressure on the data source. Detailed example codes refer to [examples/ipc](https://github.com/eggjs/examples/tree/master/ipc).

## More Complex Scenario

In the above example, we runs a subscriber on Agent process to listen messages sent by the message-oriented middleware. What if Worker processes need to listen messages? How to create connections by Agent process and transmit messages to Worker processes? Answers to these questions can be found in [Advanced Multi-Process Developing Pattern](../advanced/cluster-client.md).

[pm2]: https://github.com/Unitech/pm2
[egg-cluster]: https://github.com/eggjs/egg-cluster
[egg-scripts]: https://github.com/eggjs/egg-scripts
[graceful]: https://github.com/node-modules/graceful
