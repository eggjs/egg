---
title: Logger
order: 4
---

There is no doubt that logs are important part for monitoring application and debugging in Web development.

Built-in enterprise scaled logger, [egg-logger](https://github.com/eggjs/egg-logger), makes developer implement logging more easily than ever before.

Core features:

- Levels
- Universal logging, `.error()` will save `ERROR` level logs into a file for later debugging
- Logs from dispatch and runtime are separated
- Create your logger
- Multi-process logs
- Automatic sharding
- High Performance

## Location

- Log files are located in `${appInfo.root}/logs/${appInfo.name}` by default. For instance, `/home/admin/logs/example-app`.
- To avoid conflicts between environments and provide a more convenience way to manage logs, log files will be written into `logs` directory. For instance, `/path/to/example-app/logs/example-app`.

Change `dir` in logger:

```js
// config/config.${env}.js
exports.logger = {
  dir: '/path/to/your/custom/log/dir',
};
```

## Type of Logs

Egg offers a few loggers for different scenarios:

- appLogger `${appInfo.name}-web.log`，for example `example-app-web.log` stores logs from application, it will be used in general.
- coreLogger `egg-web.log`, logs from Egg's core and plugin.
- errorLogger `common-error.log` should not be invoked directly. However, `.error()` in every logger will redirect logs to it for debugging.
- agentLogger `egg-agent.log`, logs from agent process.

If you want to change names of above loggers, you can override them in config:

```js
// config/config.${env}.js
module.exports = (appInfo) => {
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

## Printing

### Context Logger

It's proper to log details in requests with context logger. The logger will append basics about requests to each log. For example, `[$userId/$ip/$traceId/${cost}ms $method $url]`.

```js
ctx.logger.debug('debug info');
ctx.logger.info('some request data: %j', ctx.request.body);
ctx.logger.warn('WARNING!!!!');

// .error will save information in call stack into errorLog file.
// Exceptions must be guaranteed to be Error or object extended from Error, which offers a trace of what functions were called.
ctx.logger.error(new Error('whoops'));
```

For developers who create frameworks or plugins, `ctx.coreLogger` is another option in Context Logger.

```js
ctx.coreLogger.info('info');
```

### App Logger

For developers who want to know more details about dispatch in Egg, they can easily use `App Logger` to make that happen:

```js
// app.js
module.exports = (app) => {
  app.logger.debug('debug info');
  app.logger.info('Latency: %d ms', Date.now() - start);
  app.logger.warn('warning!');

  app.logger.error(someErrorObj);
};
```

`app.coreLogger` in app is similar to `ctx.coreLogger` in context:

```js
// app.js
module.exports = (app) => {
  app.coreLogger.info('Latency: %d ms', Date.now() - start);
};
```

### Agent Logger

Agent also supports `agent.coreLogger` as the same feature to context and app above.

```js
// agent.js
module.exports = (agent) => {
  agent.logger.debug('debug info');
  agent.logger.info('Latency: %d ms', Date.now() - start);
  agent.logger.warn('warning!');

  agent.logger.error(someErrorObj);
};
```

For more about Agent, you can take a look at [Multi-process](./cluster-and-ipc.md).

## Encoding

The default encoding setting(`utf-8`) can be changed via `encoding` in config:

```js
// config/config.${env}.js
exports.logger = {
  encoding: 'gbk',
};
```

## Format

Use JSON as the output log format, make it easier to parse.

```js
// config/config.${env}.js
exports.logger = {
  outputJSON: true,
};
```

## Log Level

Logs are designed in 5 levels, including `NONE`, `DEBUG`, `INFO`, `WARN` and `ERROR`. For inspecting in development, they will also be written into files and printed into terminal as well.

### Levels

In production environment, Egg will only write logs with level `INFO` and higher, this means `NONE` and `DEBUG` information will be ignored in log files.

If you want to change logger's default output level, modify in the config as follow:

```js
// config/config.${env}.js
exports.logger = {
  level: 'DEBUG', // logs in all level will be written into files
};
```

Stop writing logs in all levels:

```js
// config/config.${env}.js
exports.logger = {
  level: 'NONE',
};
```

#### Debug Log in Production Environment

To avoid some plugin's DEBUG logs printing in the production environment causing performance problems, the production environment prohibits printing DEBUG-level logs by default. If there is a need to print DEBUG logs for debugging in the production environment, you need to set `allowDebugAtProd` configuration to `true`.

```js
// config/config.prod.js
exports.logger = {
  level: 'DEBUG',
  allowDebugAtProd: true,
};
```

### In Terminal

By default, Egg will only print out `INFO`, `WARN` and `ERROR` in terminal. (Notice: It only works on `local` and `unittest` env)

- `logger.consoleLevel`: The logger level in terminal. It defaults to `INFO`, though it defaults to `WARN` on both `local` and `unittest` environments.

Similarly, it can be changed in the following ways:

Print logs in all levels:

```js
// config/config.${env}.js
exports.logger = {
  consoleLevel: 'DEBUG',
};
```

Stop printing logs in all levels:

```js
// config/config.${env}.js
exports.logger = {
  consoleLevel: 'NONE',
};
```

- Base on performance considerations, console logger will be disabled after app ready at prod mode. however, you can enable it by config. (**Not Recommended**)

```js
// config/config.${env}.js
exports.logger = {
  disableConsoleAfterReady: false,
};
```

## Create Your Logger

### Customized

For common scenarios, **it's unnecessary to create new logger**, because too many loggers will make them hard to be managed for later debugging.

The logger you create can be declared in config:

```js
// config/config.${env}.js
const path = require('path');

module.exports = (appInfo) => {
  return {
    customLogger: {
      xxLogger: {
        file: path.join(appInfo.root, 'logs/xx.log'),
      },
    },
  };
};
```

Now, you can get loggers via `app.getLogger('xxLogger')` or `ctx.getLogger('xxLogger')`, and the logs printed from those loggers are similar to the ones from `coreLogger`.

### Custom logger formatter

```js
// config/config.${env}.js
const path = require('path');

module.exports = (appInfo) => {
  return {
    customLogger: {
      xxLogger: {
        file: path.join(appInfo.root, 'logs/xx.log'),
        formatter(meta) {
          return `[${meta.date}] ${meta.message}`;
        },
        // ctx logger
        contextFormatter(meta) {
          return `[${meta.date}] [${meta.ctx.method} ${meta.ctx.url}] ${meta.message}`;
        },
      },
    },
  };
};
```

### Advanced

Logs will be written into files by default. Further, they will also be printed into terminal in development. But what if we need to print those into another place? Creating customized transport can take you there.

Transport can be considered as a tunnel to transfer data in Egg. A logger contains multiple transports, for example the one by default contains `fileTransport` and `consoleTransport`.

For concrete scenario, we take `common-error.log` as an example, which not only printed into files, but also sent to another remote service. At first, we can create a new transport for sending logs to remote:

```js
const co = require('co');
const util = require('util');
const Transport = require('egg-logger').Transport;

class RemoteErrorTransport extends Transport {
  // Create log() to upload logs
  log(level, args) {
    let log;
    if (args[0] instanceof Error) {
      const err = args[0];
      log = util.format(
        '%s: %s\n%s\npid: %s\n',
        err.name,
        err.message,
        err.stack,
        process.pid,
      );
    } else {
      log = util.format(...args);
    }

    this.options.app
      .curl('http://url/to/remote/error/log/service/logs', {
        data: log,
        method: 'POST',
      })
      .catch(console.error);
  }
}

// Transport attached to errorLogger in app.js, makes logs sync to it once those are created.
app
  .getLogger('errorLogger')
  .set('remote', new RemoteErrorTransport({ level: 'ERROR', app }));
```

Performance is what we always consider as important part in our services so that logs will firstly be written into memory and transferred to remote later.

## Log Sharding

One common requirement you can find in enterprise logs is automatic log sharding, which offers a convenient way for management. Luckily, Egg takes [egg-logrotator](https://github.com/eggjs/egg-logrotator) as built-in solution to meet the need.

### Daily Sharding

This is the default way in Egg to cut the logs into files named by `.log.YYYY-MM-DD` at every `00:00`. For example, `example-app-web.log` will be cut into files as follow, `example-app-web.log.YYYY-MM-DD`.

### Size Sharding

The log file also can be cut into ones by size. For example, Egg will process `egg-web.log` when its size reach 2G:

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

Logs written into `filesRotateBySize` file will never be processed again by date.

### Hourly Sharding

There is another option that the log files can be divided into small ones by hour.

For example, we need to cut `common-error.log` by hour just like following implementation.

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

Logs written into `filesRotateByHour` file will never be processed again by date.

## Performance

Generally, requests are frequent events to Web services, so writing logs into disk after each event will cause more unexpected I/O. Egg takes following strategy to write logs:

> Logs will be firstly transferred into memory, and then Egg will asynchronously write them into files by second.

More about [egg-logger](https://github.com/eggjs/egg-logger) and [egg-logrotator](https://github.com/eggjs/egg-logrotator)。
