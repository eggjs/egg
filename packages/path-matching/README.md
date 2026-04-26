# @eggjs/path-matching

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/@eggjs/path-matching.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/path-matching
[snyk-image]: https://snyk.io/test/npm/@eggjs/path-matching/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/path-matching/badge.svg?style=flat-square
[download-image]: https://img.shields.io/npm/dm/@eggjs/path-matching.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/path-matching

## Installation

```bash
npm install @eggjs/path-matching
```

## Usage

```ts
import { pathMatching } from '@eggjs/path-matching';

const options = {
  ignore: '/api', // string will use parsed by path-to-regexp
  // support regexp
  ignore: /^\/api/,
  // support function
  ignore: (ctx) => ctx.path.startsWith('/api'),
  // support Array
  ignore: [(ctx) => ctx.path.startsWith('/api'), /^\/foo$/, '/bar'],
  // support match or ignore
  match: '/api',
  // custom path-to-regexp module, default is `path-to-regexp@6`
  // pathToRegexpModule: customPathToRegexp,
};

const match = pathMatching(options);
assert.equal(match({ path: '/api' }), true);
assert.equal(match({ path: '/api/hello' }), true);
assert.equal(match({ path: '/api' }), true);
```

### options

- `match` {String | RegExp | Function | Array} - if request path hit `options.match`, will return `true`, otherwise will return `false`.
- `ignore` {String | RegExp | Function | Array} - if request path hit `options.ignore`, will return `false`, otherwise will return `true`.
- `pathToRegexpModule` {Object | Function} - custom path-to-regexp module. Default is `path-to-regexp@6`. Supports both `path-to-regexp@6` and `path-to-regexp@8+` formats.

`ignore` and `match` can not both be presented.
and if neither `ignore` nor `match` presented, the new function will always return `true`.

### License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
