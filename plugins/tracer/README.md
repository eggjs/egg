# @eggjs/tracer

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/tracer.svg?style=flat)](https://nodejs.org/en/download/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/eggjs/security)

[npm-image]: https://img.shields.io/npm/v/@eggjs/tracer.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/tracer
[snyk-image]: https://snyk.io/test/npm/@eggjs/tracer/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/tracer
[download-image]: https://img.shields.io/npm/dm/@eggjs/tracer.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/tracer

tracer plugin for egg.

## Install

```bash
npm i @eggjs/tracer
```

## Usage

Enable tracer plugin:

```js
// config/plugin.js
exports.tracer = {
  enable: true,
  package: '@eggjs/tracer',
};
```

### Build my own tracer

```js
// my_tracer.js
const { Tracer } = require('@eggjs/tracer');

const counter = 0;

class MyTracer extends Tracer {
  get traceId() {
    return `${counter++}-${Date.now()}-${process.pid}`;
  }
}
module.exports = MyTracer;
```

Change the config to use `MyTracer`:

```js
// config/config.default.js
exports.tracer = {
  Class: require('path/to/my_tracer.js'),
};
```

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
