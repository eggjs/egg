# @eggjs/jsonp

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/jsonp.svg?style=flat)](https://nodejs.org/en/download/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)

[npm-image]: https://img.shields.io/npm/v/@eggjs/jsonp.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/jsonp
[snyk-image]: https://snyk.io/test/npm/@eggjs/jsonp/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/jsonp
[download-image]: https://img.shields.io/npm/dm/@eggjs/jsonp.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/jsonp

An egg plugin for jsonp support.

## Requirements

- egg >= 4.x

## Install

```bash
npm i @eggjs/jsonp
```

## Usage

```ts
// {app_root}/config/plugin.ts

export default {
  jsonp: {
    enable: true,
    package: '@eggjs/jsonp',
  },
};
```

## Configuration

- {String|Array} callback - jsonp callback method key, default to `[ '_callback', 'callback' ]`
- {Number} limit - callback method name's max length, default to `50`
- {Boolean} csrf - enable csrf check or not. default to false
- {String|RegExp|Array} whiteList - referrer white list

if whiteList's type is `RegExp`, referrer must match `whiteList`, pay attention to the first `^` and last `/`.

```ts
export default {
  jsonp: {
    whiteList: /^https?:\/\/test.com\//,
  },
};

// matchs referrer:
// https://test.com/hello
// http://test.com/
```

if whiteList's type is `String` and starts with `.`:

```ts
export default {
  jsonp: {
    whiteList: '.test.com',
  },
};

// matchs domain test.com:
// https://test.com/hello
// http://test.com/

// matchs subdomain
// https://sub.test.com/hello
// http://sub.sub.test.com/
```

if whiteList's type is `String` and not starts with `.`:

```ts
export default {
  jsonp: {
    whiteList: 'sub.test.com',
  },
};

// only matchs domain sub.test.com:
// https://sub.test.com/hello
// http://sub.test.com/
```

whiteList also can be an array:

```ts
export default {
  jsonp: {
    whiteList: ['.foo.com', '.bar.com'],
  },
};
```

see [config/config.default.ts](https://github.com/eggjs/jsonp/blob/master/src/config/config.default.ts) for more detail.

## API

- ctx.acceptJSONP - detect if response should be jsonp, readonly

## Example

In `app/router.ts`

```ts
// Create once and use in any router you want to support jsonp.
const jsonp = app.jsonp();

app.get('/default', jsonp, 'jsonp.index');
app.get('/another', jsonp, 'jsonp.another');

// Customize by create another jsonp middleware with specific configurations.
app.get('/customize', app.jsonp({ callback: 'fn' }), 'jsonp.customize');
```

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
