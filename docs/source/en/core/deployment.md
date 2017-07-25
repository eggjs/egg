title: Deployment
---

Launching application via `egg-bin dev` will bring something magical to help people to develop in high efficiency. However, actually, those features are not required in production or any other environment. Let's walk through and learn how to deploy your application in Egg's way.

There are two steps to achieve building once and deploying multiply from source code to runtime.

## Build

In the stage, you don't need to compile JavaScript files unless TypeScript or Babel(ES6 features) are involved in stack.

Generally, before deploying the application, dependencies will be installed with `NODE_ENV=production` or `--production`, which will exclude `devDependencies` because those used in development may increase the size of package released or even create pitfalls that you never expect.

```bash
$ cd baseDir
$ npm install --production
$ tar -zcvf ../release.tgz .
```

Both the application and dependencies will be packed into a tgz file, what you are going to do is unzipping and launching it.

Reusable package brings a few pros in:
- Environments in building and runtime are different, try to keep the later environment pure and stable.
- Abbreviating publish progress and making rollback without hassle.

## Deploy

Node.js(`>= 6.0.0`) is required so that you should make sure it is pre-installed in runtime environment.

Egg takes `egg-cluster` to create [Master](https://github.com/eggjs/egg/blob/master/docs/source/en/core/cluster-and-ipc.md#master) process, which you can rely on to secure the application instead of daemon manager like [pm2](https://github.com/Unitech/pm2). The API is also really convenient for developers to achieve that, just `egg.startCluster`.

More about [egg-cluster](https://github.com/eggjs/egg-cluster#options)

### Dispatch file

Create a new dispatch file in the root directory, for instance `dispatch.js`:

```js
// dispatch.js
const egg = require('egg');

egg.startCluster({
  baseDir: __dirname,
});
```

### Dispatch in background

Once you create dispatch file, you can launch the application and redirect standard output to `stdout.log` as well as error details to `stderr.log`, which are really useful for debugging later.

```bash
$ EGG_SERVER_ENV=prod nohup node dispatch.js > stdout.log 2> stderr.log &
```

IMPORTANT:
- `EGG_SERVER_ENV` in production must be `prod`, for more information about [runtime environment](https://github.com/eggjs/egg/blob/master/docs/source/en/basics/env.md).
- Launching directly when the application run in docker instance.
- Egg usually initialize instances as many as cores, which can leverage the capability of the cpu.

### Dispatch with arguments

Arguments of dispatch can be configured in `config.{env}.js`.

```js
// config/config.default.js
exports.cluster = {
  listen: {
    port: '7001',
    hostname: '127.0.0.1',
    // path: '/var/run/egg.sock',
  }
}
```

[server.listen](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback) supports arguments including `path`, `port` and `hostname` to change dispatching behavior. One thing you should know is that the `port` in `egg.startCluster` will override the one in application config.

### Dispatch from extended framework

What about dispatch from your framework extended from [Egg's Application](https://github.com/eggjs/egg/blob/master/docs/source/en/advanced/framework.md) like `yadan`? Egg offers `customEgg` to change the entry:

```js
// dispatch.js
const path = require('path');
const egg = require('egg');

egg.startCluster({
  baseDir: __dirname,
  customEgg: path.join(__dirname, 'node_modules/yadan'),
});
```