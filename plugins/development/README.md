# @eggjs/development

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/development.svg?style=flat)](https://nodejs.org/en/download/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)

[npm-image]: https://img.shields.io/npm/v/@eggjs/development.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/development
[snyk-image]: https://snyk.io/test/npm/@eggjs/development/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/development
[download-image]: https://img.shields.io/npm/dm/@eggjs/development.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/development

This is an egg plugin for local development, under development environment enabled by default, and closed under other environment.

`@eggjs/development` has been built-in for egg. It is enabled by default.

## Requirements

- egg >= 4.x

## Configuration

see [config/config.default.ts](https://github.com/eggjs/egg/blob/master/plugins/development/src/config/config.default.ts) for more detail.

## Features

- Under development environment, Output request log in STDOUT, statistic and output all key parts time-consuming;
- Watch file changes, and reload application；

### About Reload

Under the following directory (including subdirectories) will watch file changes under development environment by default, trigger an Egg development environment server reload:

- ${app_root}/app
- ${app_root}/config
- ${app_root}/mocks
- ${app_root}/mocks_proxy
- ${app_root}/app.js

> set `config.development.overrideDefault` to `true` to skip defaults merge.

Under the following directory (including subdirectories) will ignore file changes under development environment by default:

- ${app_root}/app/view
- ${app_root}/app/assets
- ${app_root}/app/public
- ${app_root}/app/web

> set `config.development.overrideIgnore` to `true` to skip defaults merge.

Developer can use `config.reloadPattern`([multimatch](https://github.com/sindresorhus/multimatch)) to control whether to reload.

```ts
// config/config.default.ts
export default = {
  development: {
    // don't reload when css fileChanged
    // https://github.com/sindresorhus/multimatch
    reloadPattern: ['**', '!**/*.css'],
  },
};
```

### Loader Trace

You can view loader trace for performance issue from `http://127.0.0.1:7001/__loader_trace__`

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
