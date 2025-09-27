# @eggjs/logrotator

[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/logrotator.svg?style=flat)](https://nodejs.org/en/download/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/eggjs/security)

[npm-image]: https://img.shields.io/npm/v/@eggjs/logrotator.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/logrotator
[download-image]: https://img.shields.io/npm/dm/@eggjs/logrotator.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/logrotator

egg 的日志切割插件，默认会按照时间切割所有的 app.loggers。

## 配置

- `plugin.js`

```js
exports.logrotator = true;
```

- `config.default.js`

```js
// 如果有需要按照文件大小切割的日志，在这里配置
exports.logrotator = {
  filesRotateByHour: [], // 需要按小时切割的文件
  hourDelimiter: '-', // 按照小时切割的文件, 小时部分的分隔符.
  filesRotateBySize: [], // 需要按大小切割的文件，其他日志文件仍按照通常方式切割
  maxFileSize: 50 * 1024 * 1024, // 最大文件大小，默认为50m
  maxFiles: 10, // 按大小切割时，文件最大切割的份数
  rotateDuration: 60000, // 按大小切割时，文件扫描的间隔时间
  maxDays: 31, // 日志保留最久天数
};
```

## 功能说明

logrotator 默认在每日0点按照时间切割，会将 app.loggers 下所有的 logger 都进行切割，格式为 `.log.YYYY-MM-DD`，如 `egg-web.log.2016-09-30`。

### 按大小切割

可以配置 `filesRotateBySize` 文件列表按大小切割，当文件大于 `maxFileSize` 时进行切割，格式为 `.log.1`。

当已有切割文件时会将原文件自增 1，如 `.log.1` -> `.log.2`。当切割分数大于 `maxFiles` 时会覆盖最后一份。

配置了这个功能的文件不会再按默认切割。

如配置为相对路径，则默认会转换为 `path.join(this.app.config.logger.dir, file)`。

### 按小时切割

可以配置 `filesRotateBySize` 文件列表按小时切割，每小时0分开始切割，格式为 `.log.YYYY-MM-DD-HH`。

配置了这个功能的文件不会再按默认切割。

如配置为相对路径，则默认会转换为 `path.join(this.app.config.logger.dir, file)`。

## 自定义

你可以使用 `app.LogRotator` 来自定义切割。

```js
// app/schedule/custom.js
module.exports = app => {
  const rotator = getRotator(app);
  return {
    // https://github.com/eggjs/egg-schedule
    schedule: {
      type: 'worker', // only one worker run this task
      cron: '10 * * * *', // custom cron, or use interval
    },
    *task() {
      yield rotator.rotate();
    },
  };
};

function getRotator(app) {
  class CustomRotator extends app.LogRotator {
    // return map that contains a pair of srcPath and targetPath
    // LogRotator will rename srcPath to targetPath
    // 返回一个 map，其中包含 srcPath 和 targetPath，
    // LogRotator 会将 srcPath 重命名成 targetPath
    *getRotateFiles() {
      const files = new Map();
      const srcPath = '/home/admin/foo.log';
      const targetPath = '/home/admin/foo.log.2016.09.30';
      files.set(srcPath, { srcPath, targetPath });
      return files;
    }
  }
  return new CustomRotator({ app });
}
```

你只需要定义一个 getRotateFiles 方法，指定重命名的 map。

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
