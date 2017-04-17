title: 本地开发
---

为了提升研发体验，我们提供了便捷的方式在本地进行开发、调试、单元测试等。

在这里我们需要使用到 [egg-bin] 模块（只在本地开发和单元测试使用，如果线上请参考 [部署](../advanced/deployment.md)）。

首先，我们需要把 `egg-bin` 模块作为 `devDependencies` 引入：

```bash
$ npm i egg-bin --save-dev
```

## 启动应用

本地启动应用进行开发活动，当我们修改代码并保存后，应用会自动重启实时生效。

### 添加命令

添加 `npm scripts` 到 `package.json`：

```json
{
  "scripts": {
    "dev": "egg-bin dev"
  }
}
```

这样我们就可以通过 `npm run dev` 命令启动应用。

### 环境配置

本地启动的应用是以 `env: local` 启动的，读取的配置也是 `config.default.js` 和 `config.local.js` 合并的结果。

### 指定端口

本地启动应用默认监听 7001 端口，可指定其他端口，例如：

```json
{
  "scripts": {
    "dev": "egg-bin dev --port 7001"
  }
}
```

## 单元测试

这里主要讲解工具部分的使用，更多关于单元测试的内容请参考[这里](./unittest.md)。

### 添加命令

添加 `npm scripts` 到 `package.json`：

```json
{
  "scripts": {
    "test": "egg-bin test"
  }
}
```

这样我们就可以通过 `npm test` 命令运行单元测试。

### 环境配置

测试用例执行时，应用是以 `env: unittest` 启动的，读取的配置也是 `config.default.js` 和 `config.unittest.js` 合并的结果。

### 运行特定用例文件

运行 `npm test` 时会自动执行 test 目录下的以 `.test.js` 结尾的文件（默认 [glob] 匹配规则 `test/**/*.test.js` ）。

我们在编写用例时往往想单独执行正在编写的用例，可以通过以下方式指定特定用例文件：

```bash
$ TESTS=test/x.test.js npm test
```

支持 [glob] 规则。

### 指定 reporter

Mocha 支持多种形式的 reporter，默认使用 `spec` reporter。

可以手动设置 `TEST_REPORTER` 环境变量来指定 reporter，例如使用 `dot`：

```bash
$ TEST_REPORTER=dot npm test
```

![image](https://cloud.githubusercontent.com/assets/156269/21849809/a6fe6df8-d842-11e6-8507-20da63bc8b62.png)

### 指定用例超时时间

默认执行超时时间为 30 秒。我们也可以手动指定超时时间（单位毫秒），例如设置为 5 秒：

```bash
$ TEST_TIMEOUT=5000 npm test
```

### 通过 argv 方式传参

`egg-bin test` 除了环境变量方式，也支持直接传参，支持 mocha 的所有参数，参见：[mocha usage](https://mochajs.org/#usage) 。

```bash
$ # npm 传递参数需额外加一个 `--`，参见 https://docs.npmjs.com/cli/run-script
$ npm test -- --help
$
$ # 等同于 `TESTS=test/**/test.js npm test`，受限于 bash，最好加上双引号
$ npm test "test/**/test.js"
$
$ # 等同于 `TEST_REPORTER=dot npm test`
$ npm test -- --reporter=dot
$
$ # 支持 mocha 的参数，如 grep / require 等
$ npm test -- -t 30000 --grep="should GET"
```

## 代码覆盖率

egg-bin 已经内置了 [istanbul](https://github.com/gotwarlost/istanbul) 来支持单元测试自动生成代码覆盖率报告。

添加 `npm scripts` 到 `package.json`：

```json
{
  "scripts": {
    "cov": "egg-bin cov"
  }
}
```

这样我们就可以通过 `npm run cov` 命令运行单元测试覆盖率。

```bash
$ egg-bin cov

  test/controller/home.test.js
    GET /
      ✓ should status 200 and get the body
    POST /post
      ✓ should status 200 and get the request body

  ...

  16 passing (1s)

=============================== Coverage summary ===============================
Statements   : 100% ( 41/41 )
Branches     : 87.5% ( 7/8 )
Functions    : 100% ( 10/10 )
Lines        : 100% ( 41/41 )
================================================================================
```

还可以通过 `open coverage/lcov-report/index.html` 打开完整的 HTML 覆盖率报告。

![image](https://cloud.githubusercontent.com/assets/156269/21845201/a9a85ab6-d82c-11e6-8c24-5e85f352be4a.png)

### 环境配置

和 `test` 命令一样，`cov` 命令执行时，应用也是以 `env: unittest` 启动的，读取的配置也是 `config.default.js` 和 `config.unittest.js` 合并的结果。

### 忽略指定文件

对于某些不需要跑测试覆盖率的文件，可以通过 `COV_EXCLUDES` 环境变量指定：

```bash
$ COV_EXCLUDES=app/plugins/c* npm run cov
$ # 或者传参方式
$ npm run cov -- --x=app/plugins/c*
```

## 调试

### 使用 egg-bin 调试

#### 添加命令

添加 `npm scripts` 到 `package.json`：

```json
{
  "scripts": {
    "debug": "egg-bin debug"
  }
}
```

这样我们就可以通过 `npm run debug` 命令通过 `V8 Inspector port` 调试应用。

#### 环境配置

执行 `debug` 命令时，应用也是以 `env: local` 启动的，读取的配置是 `config.default.js` 和 `config.local.js` 合并的结果。

#### 开始调试

找到你需要设置断点的文件，设置一个断点，访问一下，就进入断点调试了。

![image](https://cloud.githubusercontent.com/assets/456108/21814737/38ed8f04-d795-11e6-93c4-1de9f1d432c8.png)

### 使用 logger 模块调试

框架内置了[日志](./logger.md) 功能，使用 `logger.debug()` 输出调试信息，**推荐在应用代码中使用它。**

```js
// controller
this.logger.debug('current user: %j', this.user);

// service
this.ctx.logger.debug('debug info from service');

// app/init.js
app.logger.debug('app init');
```

通过 `config.logger.level` 来配置打印到文件的日志级别，通过 `config.logger.consoleLevel` 配置打印到终端的日志级别。

### 使用 debug 模块调试

[debug](https://www.npmjs.com/package/debug) 模块是 Node.js 社区广泛使用的 debug 工具，很多模块都使用它模块打印调试信息，Egg 社区也广泛采用这一机制打印 debug 信息，**推荐在框架和插件开发中使用它。**

我们可以通过 `DEBUG` 环境变量选择开启指定的调试代码，方便观测执行过程。

（调试模块和日志模块不要混淆，而且日志模块也有很多功能，这里所说的日志都是调试信息。）

开启所有模块的日志：

```bash
$ DEBUG=* npm run dev
```

开启指定模块的日志：

```bash
$ DEBUG=egg* npm run dev
```

单元测试也可以用 `DEBUG=* npm test` 来查看测试用例运行的详细日志。

### 使用 WebStorm 进行调试

添加 `npm scripts` 到 `package.json`：

```json
{
  "scripts": {
    "debug": "egg-bin dev $NODE_DEBUG_OPTION"
  }
}
```

> 目前 WebStorm 还不支持 `--inspect` 故不能使用 `egg-bin debug`，暂时使用 `egg-bin dev --debug` 的方式。

使用 WebStorm 的 npm 调试启动即可：

![](https://cloud.githubusercontent.com/assets/227713/24495078/9bf8aaa2-1566-11e7-8dbd-2def56f904d3.png)

### 使用 [VSCode](https://code.visualstudio.com/) 进行调试

由于在开发阶段，当我们修改代码并保存后，应用会自动重启 worker。但是每次 worker 的更新都会使得调试端口发生变化，而 [VSCode](https://code.visualstudio.com/) 是需要 [attach](https://code.visualstudio.com/docs/nodejs/nodejs-debugging#_attaching-to-nodejs) 到固定的调试端口的。于是我们启用了一个叫 `proxyworker` 的代理服务，worker 的调试信息会被代理到这个服务上。这样 [VSCode](https://code.visualstudio.com/) 通过固定 [attach](https://code.visualstudio.com/docs/nodejs/nodejs-debugging#_attaching-to-nodejs) 到 proxyworker 来调试 worker 了。

下面是安装使用步骤:

##### 1. 安装 [egg-development-proxyworker](https://github.com/eggjs/egg-development-proxyworker) 插件

```bash
npm i egg-development-proxyworker --save
```

##### 2. 启动插件

```js
// config/plugin.js
exports.proxyworker = {
  enable: true,
  package: 'egg-development-proxyworker',
};

// config/config.default.js
// 如果10086被占用，你可以通过这个配置指定其他的端口号
exports.proxyworker = {
  port: 10086,
};
```

##### 3. 在 .vscode/launch.json 添加调试配置:
```js
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Egg",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceRoot}",
      "runtimeExecutable": "npm",
      "windows": {
        "runtimeExecutable": "npm.cmd"
      },
      "runtimeArgs": [
        "run", "dev", "--", "--debug"
      ],
      "port": 5858
    },
    {
      "name": "Attach Agent",
      "type": "node",
      "request": "attach",
      "port": 5856
    },
    {
      "name": "Attach Worker",
      "type": "node",
      "request": "attach",
      "restart": true,
      "port": 10086
    }
  ],
  "compounds": [
    {
      "name": "Debug Egg",
      "configurations": ["Launch Egg", "Attach Agent", "Attach Worker"]
    }
  ]
}
```

##### 4. 开始调试

在 [VSCode](https://code.visualstudio.com/) 中，切换到调试页面。选择 Debug Egg 配置进行启动。

## 更多

如果想了解更多本地开发相关的内容，例如为你的团队定制一个本地开发工具，请参考 [egg-bin]。

[glob]: https://www.npmjs.com/package/glob
[egg-bin]: https://github.com/eggjs/egg-bin
