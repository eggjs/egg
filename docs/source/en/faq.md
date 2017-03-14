title: FAQ
---

If you have questions that is not contained below, please check [Egg issues](https://github.com/eggjs/egg/issues).

## Why my config don't work ?

Framework [Config](./basics/config.md) settings is powerfull, support different environments and different places(framework, plugins, app).

When you got some trouble, and want to find out what is the final config using at runtime, you can checkout `run/application_config.json` and `run/agent_config.json`.

## Why not choose PM2 as process management tool?

1. PM2 itself is too complex to issue problems if any.
2. Deep optimization could be difficlut to achieve if choosing PM2.
3. Pattern like one leader process communicating with remote services, along with serveral follower processes delegating request to it ([Cluster](./core/cluster-and-ipc.md)), is a rigid demand for reducing connections and data exchange load, espeically when facing applications in very large scale. egg originates from Ant Financial Group and Alibaba Group, we start with applications in that scale at first, so we take these goals into consideration. All of these goals above could be hard to achieve with PM2.

Process management is very important. It defines the way we write code, meanwhile relates to deep runtime optimizations. So we think it's better included in framework itself.

**How to start application with PM2?**

Although PM2 is not recommanded, you can use it anyway.

Firstly, put a start file in the root directory of your project:

```js
// server.js
const egg = require('egg');

const workers = Number(process.argv[2] || require('os').cpus().length);
egg.startCluster({
  workers,
  baseDir: __dirname,
});
```

We can start application with PM2 like this:

```bash
pm2 start server.js
```

## How to resolve csrf error?

There are two kinds of common csrf errors:

- `missing csrf token`
- `invalid csrf token`

By default [egg-security](https://github.com/eggjs/egg-security/) plugin built in Egg requires CSRF validation against all 'unsafe' request such as `POST`, `PUT`, `DELETE` requests.

The error will disappear in the presence of correct csrf token in request. For more implentation details, see [./core/security.md#csrf].
