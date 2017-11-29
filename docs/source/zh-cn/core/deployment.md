title: 应用部署
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

服务器需要预装 Node.js，框架支持的 Node 版本为 `>= 8.0.0`。

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

> 注意：`egg-scripts` 不支持 Windows 系统。

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

更多参数可查看 [egg-scripts] 和 [egg-cluster] 文档。

#### 启动配置项

你也可以在 `config.{env}.js` 中配置指定启动配置。

```js
// config/config.default.js
exports.cluster = {
  listen: {
    port: 7001,
    hostname: '127.0.0.1',
    // path: '/var/run/egg.sock',
  }
}
```

`path`，`port`，`hostname` 均为 [server.listen](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback) 的参数，`egg-scripts` 和 `egg.startCluster` 方法传入的 port 优先级高于此配置。


### 停止命令

```bash
$ egg-scripts stop [--title=egg-server]
```

该命令将杀死 master 进程，并通知 worker 和 agent 优雅退出。

支持以下参数：
- `--title=egg-server` 用于杀死指定的 egg 应用，未传递则会 killapp。

你也可以直接通过 `ps -eo "pid,command" | grep "--type=egg-server"` 来找到 master 进程，并 `kill` 掉，无需 `kill -9`。


[egg-cluster]: https://github.com/eggjs/egg-cluster
[egg-scripts]: https://github.com/eggjs/egg-scripts
[pm2]: https://github.com/Unitech/pm2
