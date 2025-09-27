# @eggjs/static

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/static.svg?style=flat)](https://nodejs.org/en/download/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)

[npm-image]: https://img.shields.io/npm/v/@eggjs/static.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/static
[snyk-image]: https://snyk.io/test/npm/@eggjs/static/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/static
[download-image]: https://img.shields.io/npm/dm/@eggjs/static.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/static

Static server plugin for egg, base on [@eggjs/koa-static-cache](https://github.com/eggjs/egg/tree/next/packages/koa-static-cache).

## Install

`@eggjs/static` is a plugin that has been built-in for egg. It is enabled by default.

## Configuration

`@eggjs/static` support all configurations in [@eggjs/koa-static-cache](https://github.com/eggjs/egg/tree/next/packages/koa-static-cache).
And with default configurations below:

- prefix: `'/public/'`
- dir: `path.join(appInfo.baseDir, 'app/public')`
- dynamic: `true`
- preload: `false`
- maxAge: `31536000` in prod env, `0` in other envs
- buffer: `true` in prod env, `false` in other envs

`@eggjs/static` provides one more option:

- maxFiles: the maximum value of cache items, only effective when dynamic is true, default is `1000`.

**All static files in `$baseDir/app/public` can be visited with prefix `/public`, and all the files are lazy loaded.**

- In non-production environment, assets won't be cached, your modification can take effect immediately.
- In production environment, `@eggjs/static` will cache the assets after visited, you need to restart the process to update the assets.
- Dir default is `$baseDir/app/public` but you can also define **multiple directory** by use `dir: [dir1, dir2, ...]` or `dir: [dir1, { prefix: '/static2', dir: dir2 }]`, static server will use all these directories.

```ts
// {app_root}/config/config.default.ts
export default {
  static: {
    // maxAge: 31536000,
  },
};
```

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
