---
title: 日志
order: 4
---

日志对于 Web 开发的重要性毋庸置疑，它对于监控应用的运行状态、问题排查等都有非常重要的意义。

框架内置了强大的企业级日志支持，由 [egg-logger](https://github.com/eggjs/egg-logger) 模块提供。

主要特性包括：

- 日志分级。
- 统一错误日志：所有 logger 中使用 `.error()` 打印的 `ERROR` 级别日志都会打印到统一的错误日志文件中，便于追踪。
- 启动日志和运行日志分离。
- 自定义日志。
- 多进程日志。
- 自动切割日志。
- 高性能。

## 日志路径

- 所有日志文件默认都放在 `${appInfo.root}/logs/${appInfo.name}` 路径下，例如 `/home/admin/logs/example-app`。
- 在本地开发环境（env: local）和单元测试环境（env: unittest）中，为避免冲突和集中管理，日志会打印在项目目录下的 logs 目录，例如 `/path/to/example-app/logs/example-app`。

如果想自定义日志路径：

```js
// config/config.${env}.js
exports.logger = {
  dir: '/path/to/your/custom/log/dir',
};
```

## 日志分类

框架内置了几种日志，分别在不同的场景下使用：

- appLogger `${appInfo.name}-web.log`，例如 `example-app-web.log`，应用相关日志，供应用开发者使用的日志。我们在绝大多数情况下都在使用它。
- coreLogger `egg-web.log`：框架内核、插件日志。
- errorLogger `common-error.log`：实际上一般不会直接使用它，任何 logger 的 `.error()` 调用输出的日志都会重定向到这里，重点通过查看此日志定位异常。
- agentLogger `egg-agent.log`：agent 进程日志，框架和使用到 agent 进程执行任务的插件会打印一些日志到这里。

如果想自定义以上日志文件名称，可以在 config 文件中覆盖默认值：

```js
// config/config.${env}.js
module.exports = appInfo => {
  return {
    logger: {
      appLogName: `${appInfo.name}-web.log`,
      coreLogName: 'egg-web.log',
      agentLogName: 'egg-agent.log',
      errorLogName: 'common-error.log',
    },
  };
};
```

## 如何打印日志

### Context Logger

如果我们在处理请求时需要打印日志，这时候使用 Context Logger 用于记录 Web 行为相关的日志。

每行日志会自动记录当前请求的一些基本信息，如 `[$userId/$ip/$traceId/${cost}ms $method $url]`。

```js
ctx.logger.debug('debug info');
ctx.logger.info('some request data: %j', ctx.request.body);
ctx.logger.warn('警告！');

// 错误日志记录，直接会将错误日志的完整堆栈信息记录下来，并且输出到 errorLog 中
// 为了保证异常可追踪，必须保证所有抛出的异常都是 Error 类型，因为只有 Error 类型才会带上堆栈信息，定位到问题。
ctx.logger.error(new Error('whoops'));
```

对于框架开发者和插件开发者，还可以使用 `ctx.coreLogger`。

例如：

```js
ctx.coreLogger.info('info');
```

### App Logger

如果我们想做一些应用级别的日志记录，如记录启动阶段的一些数据信息，可以通过 App Logger 来完成。

```js
// app.js
module.exports = app => {
  app.logger.debug('debug info');
  app.logger.info('启动耗时 %d ms', Date.now() - start);
  app.logger.warn('警告！');

  app.logger.error(someErrorObj);
};
```

对于框架和插件开发者，还可以使用 `app.coreLogger`。

```js
// app.js
module.exports = app => {
  app.coreLogger.info('启动耗时 %d ms', Date.now() - start);
};
```

### Agent Logger

在开发框架和插件时有时会需要在 Agent 进程运行代码，这时使用 `agent.coreLogger`。

```js
// agent.js
module.exports = agent => {
  agent.logger.debug('debug info');
  agent.logger.info('启动耗时 %d ms', Date.now() - start);
  agent.logger.warn('警告！');

  agent.logger.error(someErrorObj);
};
```

如需详细了解 Agent 进程，请参考[多进程模型](./cluster-and-ipc.md)。
## 日志文件编码

默认编码为 `utf-8`，可通过下面的方式进行覆盖：

```js
// config/config.${env}.js
exports.logger = {
  encoding: 'gbk',
};
```

## 日志文件格式

设置输出格式为 JSON，方便日志监控系统分析。

```js
// config/config.${env}.js
exports.logger = {
  outputJSON: true,
};
```

## 日志级别

日志分为 `NONE`、`DEBUG`、`INFO`、`WARN` 和 `ERROR` 5 个级别。

日志打印到文件中的同时，为了方便开发，也会同时打印到终端中。

### 文件日志级别

默认只会输出 `INFO` 及以上（即 `WARN` 和 `ERROR`）的日志到文件中。

可以通过下面的方式配置输出到文件中的日志级别：

- 打印所有级别的日志到文件中：

```js
// config/config.${env}.js
exports.logger = {
  level: 'DEBUG',
};
```

- 关闭所有输出到文件的日志：

```js
// config/config.${env}.js
exports.logger = {
  level: 'NONE',
};
```

#### 生产环境下打印 debug 日志

为了避免一些插件的调试日志在生产环境中打印导致性能问题，生产环境默认禁止打印 `DEBUG` 级别的日志。如果确实有需求在生产环境中打印 `DEBUG` 日志进行调试，需要打开 `allowDebugAtProd` 配置项。

```js
// config/config.prod.js
exports.logger = {
  level: 'DEBUG',
  allowDebugAtProd: true,
};
```

### 终端日志级别

默认只会输出 `INFO` 及以上（即 `WARN` 和 `ERROR`）的日志到终端中。这些日志默认只在 `local` 和 `unittest` 环境下打印到终端。

可以通过下面的方式配置输出到终端的日志级别：

- 打印所有级别的日志到终端：

```js
// config/config.${env}.js
exports.logger = {
  consoleLevel: 'DEBUG',
};
```

- 关闭所有输出到终端的日志：

```js
// config/config.${env}.js
exports.logger = {
  consoleLevel: 'NONE',
};
```

- 基于性能考虑，在正式环境下，默认会关闭终端日志输出。如有需要，可以通过下面的配置进行开启（**不推荐**）：

```js
// config/config.${env}.js
exports.logger = {
  disableConsoleAfterReady: false,
};
```
## 自定义日志

### 增加自定义日志

一般应用无需配置自定义日志，因为日志打太多或太分散都会导致关注度分散，反而难以管理和难以排查发现问题。

如果确实有这样的需求，可以参照下面的配置：

```js
// config/config.${env}.js
const path = require('path');

module.exports = appInfo => {
  return {
    customLogger: {
      xxLogger: {
        file: path.join(appInfo.root, 'logs/xx.log')
      }
    }
  };
};
```

你可以通过 `app.getLogger('xxLogger')` 或 `ctx.getLogger('xxLogger')` 获取自定义日志对象。最终打印的日志格式和 coreLogger 类似。

### 自定义日志格式

```js
// config/config.${env}.js
const path = require('path');

module.exports = appInfo => {
  return {
    customLogger: {
      xxLogger: {
        file: path.join(appInfo.root, 'logs/xx.log'),
        formatter(meta) {
          return `[${meta.date}] ${meta.message}`;
        },
        contextFormatter(meta) {
          return `[${meta.date}] [${meta.ctx.method} ${meta.ctx.url}] ${meta.message}`;
        }
      }
    }
  };
};
```

### 高级自定义日志

日志默认是打印到日志文件中，同时在本地开发时也会打印到终端。但有时，我们需要将日志打印到其他媒介，比如需要将错误日志打印到 `common-error.log` 的同时，上报给第三方服务。

首先，我们定义一个日志的传输通道（transport），该通道代表第三方日志服务。

```js
const util = require('util');
const Transport = require('egg-logger').Transport;

class RemoteErrorTransport extends Transport {
  // 定义 log 方法。在此方法中，将日志上报给远端服务。
  log(level, args) {
    let log;
    if (args[0] instanceof Error) {
      const err = args[0];
      log = util.format(
        '%s: %s\n%s\npid: %s\n',
        err.name,
        err.message,
        err.stack,
        process.pid
      );
    } else {
      log = util.format(...args);
    }

    this.options.app.curl('http://url/to/remote/error/log/service/logs', {
      data: log,
      method: 'POST'
    })
    .catch(console.error);
  }
}

// 在 app.js 中给 errorLogger 添加 transport，这样每条日志就会同时打印到这个 transport。
app.getLogger('errorLogger').set('remote', new RemoteErrorTransport({ level: 'ERROR', app }));
```

上述代码示例中，虽然比较简单，但是在实际使用时需要考虑性能问题。通常采取先暂存至内存，再定时上传的策略，以此优化性能。
## 日志切割

企业级日志一个最常见的需求之一是对日志进行自动切割，以方便管理。框架对日志切割的支持由 [egg-logrotator](https://github.com/eggjs/egg-logrotator) 插件提供。

### 按天切割

这是框架的默认日志切割方式，在每日 `00:00` 按照 `.log.YYYY-MM-DD` 文件名进行切割。

以 appLog 为例，当前写入的日志为 `example-app-web.log`，当凌晨 `00:00` 时，会对日志进行切割，把过去一天的日志按 `example-app-web.log.YYYY-MM-DD` 的格式切割为单独的文件。

### 按文件大小切割

我们也可以选择按照文件大小进行切割。例如，当文件超过 2G 时进行切割。

举个例子，我们需要把 `egg-web.log` 按照大小进行切割：

```js
// config/config.${env}.js
const path = require('path');

module.exports = (appInfo) => {
  return {
    logrotator: {
      filesRotateBySize: [
        path.join(appInfo.root, 'logs', appInfo.name, 'egg-web.log'),
      ],
      maxFileSize: 2 * 1024 * 1024 * 1024,
    },
  };
};
```

添加到 `filesRotateBySize` 的日志文件将不再按天进行切割。

### 按小时切割

我们还可以选择按小时切割，这和默认的按天切割很相似，只是频率变成了每小时。

比如，我们希望把 `common-error.log` 按小时进行切割：

```js
// config/config.${env}.js
const path = require('path');

module.exports = (appInfo) => {
  return {
    logrotator: {
      filesRotateByHour: [
        path.join(appInfo.root, 'logs', appInfo.name, 'common-error.log'),
      ],
    },
  };
};
```

添加到 `filesRotateByHour` 的日志文件也将不再按天切割。

## 性能

通常，Web 访问是高频访问，每次输出日志直接写磁盘会导致频繁的磁盘 IO 操作。为了提升性能，我们采取的文件日志写入策略是：

> 日志同步写入内存，异步每隔一段时间（默认 1 秒）进行刷盘。

更多细节，请参考 [egg-logger](https://github.com/eggjs/egg-logger) 和 [egg-logrotator](https://github.com/eggjs/egg-logrotator)。
