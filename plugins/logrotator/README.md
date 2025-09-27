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

LogRotator for egg. Rotate all file of `app.loggers` by default

## Install

```bash
npm i @eggjs/logrotator
```

## Usage

- `plugin.js`

```js
exports.logrotator = {
  enable: true,
  package: '@eggjs/logrotator',
};
```

- `config.default.js`

```js
// if any files need rotate by file size, config here
exports.logrotator = {
  filesRotateByHour: [], // list of files that will be rotated by hour
  hourDelimiter: '-', // rotate the file by hour use specified delimiter
  filesRotateBySize: [], // list of files that will be rotated by size
  maxFileSize: 50 * 1024 * 1024, // Max file size to judge if any file need rotate
  maxFiles: 10, // pieces rotate by size
  rotateDuration: 60000, // time interval to judge if any file need rotate
  maxDays: 31, // keep max days log files, default is `31`. Set `0` to keep all logs
  gzip: false, // use gzip compress logger on rotate file, default is `false`. Set `true` to enable
};
```

## Feature

By default, LogRotator will rotate all files of `app.loggers` at 00:00 everyday, the format is `.log.YYYY-MM-DD` (`egg-web.log.2016-09-30`).

### By Size

Rotate by size with config `filesRotateBySize`. when the file size is greater than `maxFileSize`, it will rename to `.log.1`.

If the file you renamed to is exists, it will increment by 1 (`.log.1` -> `.log.2`), until `maxFiles`. if it reaches the `maxFiles`, then overwrite `.log.${maxFiles}`.

Files in `filesRotateBySize` won't be rotated by day.

If `file` is relative path, then will normalize to `path.join(this.app.config.logger.dir, file)`.

### By Hour

Rotate by hour with config `filesRotateByHour`. rotate the file at 00 every hour, the format is `.log.YYYY-MM-DD-HH`.

Files in `filesRotateByHour` won't be rotated by day.

If `file` is relative path, then will normalize to `path.join(this.app.config.logger.dir, file)`.

## Customize

You can use `app.LogRotator` to customize.

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
    async task() {
      await rotator.rotate();
    },
  };
};

function getRotator(app) {
  class CustomRotator extends app.LogRotator {
    // return map that contains a pair of srcPath and targetPath
    // LogRotator will rename ksrcPath to targetPath
    async getRotateFiles() {
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

Define a method called `getRotateFiles`, return a map contains a pair of srcPath and targetPath.

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
