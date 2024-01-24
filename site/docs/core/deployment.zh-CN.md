---
title: 应用部署
order: 3
---

在[本地开发](./development.md)时，我们使用 `egg-bin dev` 来启动服务，但在部署应用时不可以这样使用。因为 `egg-bin dev` 会针对本地开发做很多处理，而生产环境需要一个更加简单稳定的方式。本章主要讲解如何部署你的应用。

一般从源码到运行，会分为构建和部署两步，实现**一次构建、多次部署**。

## 构建

JavaScript 语言本身不需要编译，构建过程主要是下载依赖。如果使用 TypeScript 或 Babel 支持 ES6 及以上特性，则必须构建。

一般安装依赖时，会指定 `NODE_ENV=production` 或 `npm install --production` 仅安装核心依赖。因为开发依赖包体积大，在生产环境不必要，且可能导致问题。

```bash
$ cd baseDir
$ npm install --production
$ tar -zcvf ../release.tgz .
```

构建后，将其打包为 tgz 文件。部署时解压启动即可。

增加构建环节，能实现真正的**一次构建、多次部署**。理论上，代码未变更时，无需重构，可用原包部署，带来诸多好处：

- 构建环境与运行环境差异，避免污染运行环境。
- 缩短发布时间，便于回滚，只需重启原包即可。

## 部署

服务器需要预装 Node.js，框架支持 Node 版本 `>= 14.20.0`。

框架内置 [egg-cluster] 启动 [Master 进程](./cluster-and-ipc.md#master)，Master 稳定，不需 [pm2] 等进程守护模块。

框架同时提供 [egg-scripts] 支持线上运行和停止。

首先，将 `egg-scripts` 模块引入 `dependencies`：

```bash
$ npm i egg-scripts --save
```

`package.json` 添加 `npm scripts`：

```json
{
  "scripts": {
    "start": "egg-scripts start --daemon",
    "stop": "egg-scripts stop"
  }
}
```

现在，可以通过 `npm start` 和 `npm stop` 启停应用。

> 注意：Windows 系统下 `egg-scripts` 支持有限，详见 [#22](https://github.com/eggjs/egg-scripts/pull/22)。

### 启动命令

```bash
$ egg-scripts start --port=7001 --daemon --title=egg-server-showcase
```

示例支持参数如下：

- `--port=7001`：端口号，默认读取 `process.env.PORT`，未传递则使用内置端口 `7001`。
- `--daemon`：启用后台模式，不需 `nohup`，使用 Docker 时建议前台运行。
- `--env=prod`：运行环境，默认读取 `process.env.EGG_SERVER_ENV`，未传递则使用内置 `prod`。
- `--workers=2`：worker 数，默认创建与 CPU 核数等量的 app worker，利用 CPU 资源。
- `--title=egg-server-showcase`：便于 ps 进程时 grep，未设置默认为 `egg-server-${appname}`。
- `--framework=yadan`：使用[自定义框架](../advanced/framework.md)时，配置 `package.json` 的 `egg.framework` 或指定该参数。
- `--ignore-stderr`：忽略启动期错误。
- `--https.key`：HTTPS 密钥路径。
- `--https.cert`：HTTPS 证书路径。

[egg-cluster] 的所有 Options 支持透传，如 `--port` 等。

更多参数见 [egg-scripts] 和 [egg-cluster] 文档。

> 注意：`--workers` 默认由 `process.env.EGG_WORKERS` 或 `os.cpus().length` 设置，Docker 中 `os.cpus().length` 可能大于核数，值较大可能导致失败，需手动设置 `--workers`，详见 [#1431](https://github.com/eggjs/egg/issues/1431#issuecomment-573989059)。

#### 启动配置项

`config.{env}.js` 中可指定启动配置。

```js
// config/config.default.js

exports.cluster = {
  listen: {
    port: 7001,
    hostname: '127.0.0.1', // 不建议设置为 '0.0.0.0'，可能导致外部连接风险，请了解后使用
    // path: '/var/run/egg.sock',
  },
};
```

`path`、`port`、`hostname` 见 [server.listen](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback) 参数。`egg-scripts` 和 `egg.startCluster` 传入的 port 优先级高于此配置。

### 停止命令

```bash
$ egg-scripts stop [--title=egg-server]
```

该命令杀死 master 进程，并优雅退出 worker 和 agent。

支持参数：

- `--title=egg-server`：杀死指定 Egg 应用，未设置则终止所有 Egg 应用。

也可通过 `ps -eo "pid,command" | grep -- "--title=egg-server"` 查找 master 进程，并 `kill` 掉，不需 `kill -9`。
## 监控

我们还需要对服务进行性能监控、内存泄露分析、故障排除等。

业界常用的有：

- [Node.js 性能平台（Alinode）](https://www.aliyun.com/product/nodejs)
- [NSolid](https://nodesource.com/products/nsolid/)

### Node.js 性能平台（Alinode）

**注意**：Node.js 性能平台（Alinode）目前仅支持 macOS 和 Linux，不支持 Windows。

[Node.js 性能平台](https://www.aliyun.com/product/nodejs)是面向所有 Node.js 应用提供性能监控、安全提醒、故障排查、性能优化等服务的整体性解决方案。它提供完善的工具链和服务，协助开发者快速发现和定位线上问题。

#### 安装 Runtime

Alinode Runtime 可以直接替换掉 Node.js Runtime，对应版本参见[文档](https://help.aliyun.com/knowledge_detail/60811.html)。

全局安装方式参见[文档](https://help.aliyun.com/document_detail/60338.html)。

有时候，同时部署多个项目，期望多版本共存时，则可以把 Runtime 安装到当前项目：

```bash
$ npm i nodeinstall -g
$ nodeinstall --install-alinode ^3
```

[nodeinstall]会把对应版本的 `alinode` 安装到项目的 `node_modules` 目录下。

> 注意：打包机的操作系统和线上系统需保持一致，否则对应的 Runtime 不一定能正常运行。

#### 安装及配置

我们提供了[egg-alinode]来快速接入，无需安装 `agenthub` 等额外的常驻服务。

**安装依赖**：

```bash
$ npm i egg-alinode --save
```

**开启插件**：

```js
// config/plugin.js
exports.alinode = {
  enable: true,
  package: 'egg-alinode',
};
```

**配置**：

```js
// config/config.default.js
exports.alinode = {
  // 从 `Node.js 性能平台` 获取对应的接入参数
  appid: '<YOUR_APPID>',
  secret: '<YOUR_SECRET>',
};
```

### 启动应用

`npm scripts` 配置的 `start` 指令无需改变，通过 `egg-scripts` 即可。

启动命令需使用 `npm start`，因为 `npm scripts` 执行时会把 `node_module/.bin` 目录加入 `PATH`，故会优先使用当前项目执行的 Node 版本。

启动后会看到 master 日志包含以下内容：

```bash
$ [master] node version v8.9.4
$ [master] alinode version v3.8.4
$ [Tue Aug 06 2019 15:54:25 GMT+0800 (China Standard Time)] Connecting to wss://agentserver.node.aliyun.com:8080...
$ [Tue Aug 06 2019 15:54:26 GMT+0800 (China Standard Time)] agent register ok.
```

其中`agent register ok.`表示配置的 `egg-alinode` 正确连接上了 Node.js 性能平台服务器。

#### 访问控制台

控制台地址：[https://node.console.aliyun.com](https://node.console.aliyun.com)

[egg-cluster]: https://github.com/eggjs/egg-cluster
[egg-scripts]: https://github.com/eggjs/egg-scripts
[egg-alinode]: https://github.com/eggjs/egg-alinode
[pm2]: https://github.com/Unitech/pm2
[nodeinstall]: https://github.com/cnpm/nodeinstall
