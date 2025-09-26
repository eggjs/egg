# eggjs/koa-static-cache

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/koa-static-cache.svg?style=flat)](https://nodejs.org/en/download/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)

[npm-image]: https://img.shields.io/npm/v/@eggjs/koa-static-cache.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/koa-static-cache
[snyk-image]: https://snyk.io/test/npm/@eggjs/koa-static-cache/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/koa-static-cache
[download-image]: https://img.shields.io/npm/dm/@eggjs/koa-static-cache.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/koa-static-cache

Static cache middleware for koa.

Differences between this library and other libraries such as [static](https://github.com/koajs/static):

- There is no directory or `index.html` support.
- You may optionally store the data in memory - it streams by default.
- Caches the assets on initialization - you need to restart the process to update the assets.(can turn off with options.preload = false)
- Uses MD5 hash sum as an ETag.
- Uses `.gz` files if present on disk, like nginx gzip_static module

> Forked from https://github.com/koajs/static-cache, refactor with TypeScript to support CommonJS and ESM both.

## Installation

```bash
npm install @eggjs/koa-static-cache
```

## API

### staticCache([options])

```js
const path = require('path');
const { staticCache } = require('@eggjs/koa-static-cache');

app.use(
  staticCache(path.join(__dirname, 'public'), {
    maxAge: 365 * 24 * 60 * 60,
  })
);
```

- `options.dir` (str) - the directory you wish to serve, default to `process.cwd`.
- `options.maxAge` (int) - cache control max age for the files, `0` by default.
- `options.cacheControl` (str) - optional cache control header. Overrides `options.maxAge`.
- `options.buffer` (bool) - store the files in memory instead of streaming from the filesystem on each request.
- `options.gzip` (bool) - when request's accept-encoding include gzip, files will compressed by gzip.
- `options.usePrecompiledGzip` (bool) - try use gzip files, loaded from disk, like nginx gzip_static
- `options.alias` (obj) - object map of aliases. See below.
- `options.prefix` (str) - the url prefix you wish to add, default to `''`.
- `options.dynamic` (bool) - dynamic load file which not cached on initialization.
- `options.filter` (function | array) - filter files at init dir, for example - skip non build (source) files. If array set - allow only listed files
- `options.preload` (bool) - caches the assets on initialization or not, default to `true`. always work together with `options.dynamic`.
- `options.files` (obj) - optional files object. See below.

### Aliases

For example, if you have this `alias` object:

```js
const options = {
  alias: {
    '/favicon.png': '/favicon-32.png',
  },
};
```

Then requests to `/favicon.png` will actually return `/favicon-32.png` without redirects or anything.
This is particularly important when serving [favicons](https://github.com/audreyr/favicon-cheat-sheet) as you don't want to store duplicate images.

### Files

You can pass in an optional files object.
This allows you to do two things:

#### Combining directories into a single middleware

Instead of doing:

```js
app.use(staticCache('/public/js'));
app.use(staticCache('/public/css'));
```

You can do this:

```js
const files = {};

// Mount the middleware
app.use(staticCache('/public/js', {}, files));

// Add additional files
staticCache('/public/css', {}, files);
```

The benefit is that you'll have one less function added to the stack as well as doing one hash lookup instead of two.

#### Editing the files object

For example, if you want to change the max age of `/package.json`, you can do the following:

```js
const files = {};

app.use(
  staticCache(
    '/public',
    {
      maxAge: 60 * 60 * 24 * 365,
    },
    files
  )
);

files['/package.json'].maxAge = 60 * 60 * 24 * 30;
```

#### Using a LRU cache to avoid OOM when dynamic mode enabled

You can pass in a lru cache instance which has tow methods: `get(key)` and `set(key, value)`.

```js
const LRU = require('lru-cache');
const files = new LRU({ max: 1000 });

app.use(
  staticCache({
    dir: '/public',
    dynamic: true,
    files,
  })
);
```

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
