---
title: 应用部署
order: 3
---

在[本地开发](./development.md)时，我们使用 `egg-bin dev` 来启动服务，但是在部署应用的时候不可以这样使用。因为 `egg-bin dev` 会针对本地开发做很多处理，而生产运行需要一个更加简单稳定的方式。所以本章主要讲解如何部署你的应用。

一般从源码代码到真正运行，我们会拆分成构建和部署两步，可以做到**一次构建多次部署**。

## 构建

JavaScript 语言本身不需要编译的，构建过程主要是下载依赖。但如果使用 TypeScript 或者 Babel 支持 ES6 以上的特性，那就必须要这一步了。

一般安装依赖会指定 `NODE_ENV=production` 或 `npm install --production` 只安装 dependencies 的依赖。因为 devDependencies 中的模块过大而且在生产环境不会使用，安装后也可能遇到未知问题。

```bash
$ cd baseDir
$ npm install --production
$ tar -zcvf ../release.tgz .
```

构建完成后打包成 tgz 文件，部署的时候解压启动就可以了。

增加构建环节才能做到真正的**一次构建多次部署**，理论上代码没有改动的时候是不需要再次构建的，可以用原来的包进行部署，这有着不少好处：

- 构建依赖的环境和运行时是有差异的，所以不要污染运行时环境。
- 可以减少发布的时间，而且易回滚，只需要把原来的包重新启动即可。

## 部署

服务器需要预装 Node.js，框架支持的 Node 版本为 `>= 14.20.0`。

框架内置了 [egg-cluster] 来启动 [Master 进程](./cluster-and-ipc.md#master)，Master 有足够的稳定性，不再需要使用 [pm2] 等进程守护模块。

同时，框架也提供了 [egg-scripts] 来支持线上环境的运行和停止。

首先，我们需要把 `egg-scripts` 模块作为 `dependencies` 引入：

```bash
$ npm i egg-scripts --save
```

添加 `npm scripts` 到 `package.json`：

```json
{
  "scripts": {
    "start": "egg-scripts start --daemon",
    "stop": "egg-scripts stop"
  }
}
```

这样我们就可以通过 `npm start` 和 `npm stop` 命令启动或停止应用。

> 注意：`egg-scripts` 对 Windows 系统的支持有限，参见 [#22](https://github.com/eggjs/egg-scripts/pull/22)。

### 启动命令

```bash
$ egg-scripts start --port=7001 --daemon --title=egg-server-showcase
```

如上示例，支持以下参数：

- `--port=7001` 端口号，默认会读取环境变量 `process.env.PORT`，如未传递将使用框架内置端口 `7001`。
- `--daemon` 是否允许在后台模式，无需 `nohup`。若使用 Docker 建议直接前台运行。
- `--env=prod` 框架运行环境，默认会读取环境变量 `process.env.EGG_SERVER_ENV`， 如未传递将使用框架内置环境 `prod`。
- `--workers=2` 框架 worker 线程数，默认会创建和 CPU 核数相当的 app worker 数，可以充分的利用 CPU 资源。
- `--title=egg-server-showcase` 用于方便 ps 进程时 grep 用，默认为 `egg-server-${appname}`。
- `--framework=yadan` 如果应用使用了[自定义框架](../advanced/framework.md)，可以配置 `package.json` 的 `egg.framework` 或指定该参数。
- `--ignore-stderr` 忽略启动期的报错。
- `--https.key` 指定 HTTPS 所需密钥文件的完整路径。
- `--https.cert` 指定 HTTPS 所需证书文件的完整路径。

- 所有 [egg-cluster] 的 Options 都支持透传，如 `--port` 等。

更多参数可查看 [egg-scripts] 和 [egg-cluster] 文档。

#### 启动配置项

你也可以在 `config.{env}.js` 中配置指定启动配置。

```js
// config/config.default.js

exports.cluster = {
  listen: {
    port: 7001,
    hostname: '127.0.0.1', // 不建议设置 hostname 为 '0.0.0.0'，它将允许来自外部网络和来源的连接，请在知晓风险的情况下使用
    // path: '/var/run/egg.sock',
  },
};
```

`path`，`port`，`hostname` 均为 [server.listen](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback) 的参数，`egg-scripts` 和 `egg.startCluster` 方法传入的 port 优先级高于此配置。

### 停止命令

```bash
$ egg-scripts stop [--title=egg-server]
```

该命令将杀死 master 进程，并通知 worker 和 agent 优雅退出。

支持以下参数：

- `--title=egg-server` 用于杀死指定的 egg 应用，未传递则会终止所有的 Egg 应用。

你也可以直接通过 `ps -eo "pid,command" | grep -- "--title=egg-server"` 来找到 master 进程，并 `kill` 掉，无需 `kill -9`。

## 监控

我们还需要对服务进行性能监控，内存泄露分析，故障排除等。

业界常用的有：

- [Node.js 性能平台（alinode）](https://www.aliyun.com/product/nodejs)
- [NSolid](https://nodesource.com/products/nsolid/)

### Node.js 性能平台（alinode）

**注意：** Node.js 性能平台 (alinode) 目前仅支持 macOS 和 Linux，不支持 Windows。

[Node.js 性能平台](https://www.aliyun.com/product/nodejs) 是面向所有 Node.js 应用提供 `性能监控、安全提醒、故障排查、性能优化` 等服务的整体性解决方案，提供完善的工具链和服务，协助开发者快速发现和定位线上问题。

#### 安装 Runtime

AliNode Runtime 可以直接替换掉 Node.js Runtime，对应版本参见[文档](https://help.aliyun.com/knowledge_detail/60811.html)。

全局安装方式参见[文档](https://help.aliyun.com/document_detail/60338.html)。

有时候，同时部署多个项目，期望多版本共存时，则可以把 Runtime 安装到当前项目：

```bash
$ npm i nodeinstall -g
$ nodeinstall --install-alinode ^3
```

[nodeinstall] 会把对应版本的 `alinode` 安装到项目的 `node_modules` 目录下。

> 注意：打包机的操作系统和线上系统需保持一致，否则对应的 Runtime 不一定能正常运行。

#### 安装及配置

我们提供了 [egg-alinode] 来快速接入，无需安装 `agenthub` 等额外的常驻服务。

**安装依赖：**

```bash
$ npm i egg-alinode --save
```

**开启插件：**

```js
// config/plugin.js
exports.alinode = {
  enable: true,
  package: 'egg-alinode',
};
```

**配置：**

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

其中 `agent register ok.` 表示配置的 `egg-alinode` 正确连接上了 Node.js 性能平台服务器。

#### 访问控制台

控制台地址：[https://node.console.aliyun.com](https://node.console.aliyun.com)

[egg-cluster]: https://github.com/eggjs/egg-cluster
[egg-scripts]: https://github.com/eggjs/egg-scripts
[egg-alinode]: https://github.com/eggjs/egg-alinode
[pm2]: https://github.com/Unitech/pm2
[nodeinstall]: https://github.com/cnpm/nodeinstall
