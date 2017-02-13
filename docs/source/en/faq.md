title: FAQ
---

If you have questions that is not contained below, please check [egg issues](https://github.com/eggjs/egg/issues).

## Why not choose PM2 as process management tool?

1. PM2 itself is too complex to issue problems if any.
2. Deep optimization could be difficlut to achieve if choosing PM2.
3. Pattern like one leader process communicating with remote services, along with serveral follower processes delegating request to it (（[Cluster](./advanced/cluster.md)), is a rigid demand for reducing connections and data exchange load, espeically when facing applications in very large scale. egg originates from Ant Financial Group and Alibaba Group, we start with applications in that scale at first, so we take these goals into consideration. All of these goals above could be hard to achieve with PM2.

Process management is very important. It defines the way we write code, meanwhile relates to deep runtime optimization. So we think it's better defined by framework itself.

__How to start application with PM2?__

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

