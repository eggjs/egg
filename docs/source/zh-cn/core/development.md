# 本地开发

为了提升研发体验，我们提供了便捷的方式在本地进行开发、调试、单元测试等。

在这里我们需要使用到 [egg-bin](https://github.com/eggjs/egg-bin) 模块（只在本地开发和单元测试使用，如果线上请参考 [部署](../advanced/deployment.md)）。

首先，我们需要把 `egg-bin` 模块作为 `devDependencies` 引入到 `package.json`：

```json
{
  "devDependencies": {
    "egg-bin": "^1.0.0"
  }
}
```

## 启动应用

本地启动应用进行开发活动，当我们修改代码并保存后，应用会自动重启实时生效。

### 添加命令

添加便捷命令到 `scripts`：

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

这里主要讲解工具部分的使用，更多关于单元测试的内容请参考 [这里](./unittest.md)。

### 添加命令

添加便捷命令到 `scripts`：

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

运行 `npm test` 时会自动执行 test 目录下的以 `.test.js` 结尾的文件（[glob](http://web.npm.alibaba-inc.com/package/glob) 匹配规则`test/**/*.test.js`）。

我们在编写用例时往往想单独执行正在编写的用例，可以通过以下方式指定特定用例文件：

```bash
TESTS=test/x.test.js npm test
```

支持 [glob](http://web.npm.alibaba-inc.com/package/glob) 规则。

### 指定 reporter

mocha 支持多种形式的 reporter，默认使用 `spec` reporter。

我们也可以手动指定 reporter：

```bash
TEST_REPORTER=doc npm test
```

### 用例超时时间

默认执行超时时间为 30 秒。我们也可以手动指定超时时间(单位毫秒)：

```bash
TEST_TIMEOUT=2000 npm test
```

## 覆盖率

通过 [istanbul](https://github.com/gotwarlost/istanbul) 支持单元测试覆盖率。

### 添加命令

添加便捷命令到 `scripts`：

```json
{
  "scripts": {
    "cov": "egg-bin cov"
  }
}
```

这样我们就可以通过 `npm run cov` 命令运行单元测试覆盖率。


### 环境配置

和 `test` 命令一样，`cov` 命令执行时，应用也是以 `env: unittest` 启动的，读取的配置也是 `config.default.js` 和 `config.unittest.js` 合并的结果。

### 忽略指定文件

对于某些不需要跑测试覆盖率的文件，可以通过 `COV_EXCLUDES` 环境变量指定：

```json
{
  "scripts": {
    "cov": "COV_EXCLUDES=app/plugins/c* egg-bin cov"
  }
}
```

## 调试

### 使用 egg-bin 调试

#### 添加命令

添加便捷命令到 `scripts`：

```json
{
  "scripts": {
    "debug": "egg-bin debug"
  }
}
```

这样我们就可以通过 `npm run debug` 命令调试应用。

#### 环境配置

执行 `debug` 命令时，应用也是以 `env: local` 启动的，读取的配置是 `config.default.js` 和 `config.local.js` 合并的结果。

#### 开始调试

找到你需要设置断点的文件，设置一个断点，访问一下，就进入断点调试了。

![image](https://cloud.githubusercontent.com/assets/456108/21814737/38ed8f04-d795-11e6-93c4-1de9f1d432c8.png)

### 使用 logger 模块调试

框架内置了[日志](./logger.md)功能，使用 `logger.debug()` 输出调试信息，__推荐在应用代码中使用它。__

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

[debug](https://www.npmjs.com/package/debug) 模块是 node 社区广泛使用的 debug 工具，很多模块都使用它模块打印调试信息，egg 社区也广泛采用这一机制打印 debug 信息，__推荐在框架和插件开发中使用它。__

我们可以通过 `DEBUG` 环境变量选择开启指定的调试代码，方便观测执行过程。

（调试模块和日志模块不要混淆，而且日志模块也有很多功能，这里所说的日志都是调试信息。）

开启所有模块的日志：

```bash
DEBUG=* npm run dev
```

开启指定模块的日志：

```bash
DEBUG=egg* npm run dev
```

单元测试也可以用 `DEBUG=* npm test` 来查看测试用例运行的详细日志。

## 更多

如果想了解更多本地开发相关的内容，例如为你的团队定制一个本地开发工具，请参考 [egg-bin](https://github.com/eggjs/egg-bin)。
