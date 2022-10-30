---
title: Deployment
order: 3
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

Node.js(`>= 14.20.0`) is required so that you should make sure it is pre-installed in runtime environment.

Egg takes `egg-cluster` to create [Master](https://github.com/eggjs/egg/blob/master/docs/source/en/core/cluster-and-ipc.md#master) process, which you can rely on to secure the application instead of daemon manager like [pm2]. The API is also really convenient for developers to achieve that, just `egg.startCluster`.

And framework also provide [egg-scripts] for developers to start/stop application at prod mode.

Firstly, we need to import `egg-scripts` as `dependencies`:

```bash
$ npm i egg-scripts --save
```

Then add `npm scripts` to `package.json`:

```json
{
  "scripts": {
    "start": "egg-scripts start --daemon",
    "stop": "egg-scripts stop"
  }
}
```

Then we are able to use `npm start` and `npm stop` to manage application.

> Note: `egg-scripts` has limited support for Windows, see [#22](https://github.com/eggjs/egg-scripts/pull/22).

### Start

```bash
$ egg-scripts start --port=7001 --daemon --title=egg-server-showcase
```

Options:

- `--port=7001` http server port, will use `process.env.PORT`, default to `7001`.
- `--daemon` whether run at background, so you don't need `nohup`. Ignore this when the application run in docker instance.
- `--env=prod` then framework env, will use `process.env.EGG_SERVER_ENV`, default to `prod`。
- `--workers=2` worker count, default to cpu cores, which can leverage the capability of the cpu.
- `--title=egg-server-showcase` convenient for `ps + grep`, default to `egg-server-${appname}`.
- `--framework=yadan` config `egg.framework` at `package.json` or pass this args, when you are using [Custom Framework](../advanced/framework.md).
- `--ignore-stderr` ignore the std err at start up。
- `--https.key` specify the https key full path, if start the server with https.
- `--https.cert` specify the https certificate full path, if start the server with https.
- support all options from [egg-cluster], such as `--port`.

More about [egg-scripts] and [egg-cluster] documents.

#### Dispatch with Arguments

Arguments of dispatch can be configured in `config.{env}.js`.

```js
// config/config.default.js

exports.cluster = {
  listen: {
    port: 7001,
    hostname: '127.0.0.1', // It is not recommended to set the hostname to '0.0.0.0', which will allow connections from external networks and sources, please use it if you know the risk.
    // path: '/var/run/egg.sock',
  },
};
```

[server.listen](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback) supports arguments including `path`, `port` and `hostname` to change dispatching behavior. One thing you should know is that the `port` in `egg.startCluster` will override the one in application config.

### Stop

```bash
$ egg-scripts stop
```

This command will kill master process which will handler and notice worker and agent to gracefull exit.

Also you can manually call `ps -eo "pid,command" | grep -- "--title=egg-server"` to find master process then `kill` without `-9`.

[egg-cluster]: https://github.com/eggjs/egg-cluster
[egg-scripts]: https://github.com/eggjs/egg-scripts
[pm2]: https://github.com/Unitech/pm2
