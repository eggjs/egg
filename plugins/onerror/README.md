# @eggjs/onerror

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/onerror.svg?style=flat)](https://nodejs.org/en/download/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/eggjs/onerror)

[npm-image]: https://img.shields.io/npm/v/@eggjs/onerror.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/onerror
[snyk-image]: https://snyk.io/test/npm/@eggjs/onerror/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/onerror
[download-image]: https://img.shields.io/npm/dm/@eggjs/onerror.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/onerror

Default error handling plugin for egg.

## Install

```bash
npm i @eggjs/onerror
```

## Usage

`egg-onerror` is on by default in egg. But you still can configure its properties to fits your scenarios.

- `errorPageUrl: String or Function` - If user request html pages in production environment and unexpected error happened, it will redirect user to `errorPageUrl`.
- `accepts: Function` - detect user's request accept `json` or `html`.
- `all: Function` - customize error handler, if `all` present, negotiation will be ignored.
- `html: Function` - customize html error handler.
- `text: Function` - customize text error handler.
- `json: Function` - customize json error handler.
- `jsonp: Function` - customize jsonp error handler.

```js
// config.default.js
// errorPageUrl support function
exports.onerror = {
  errorPageUrl: (err, ctx) => ctx.errorPageUrl || '/500',
};

// an accept detect function that mark all request with `x-requested-with=XMLHttpRequest` header accepts json.
function accepts(ctx) {
  if (ctx.get('x-requested-with') === 'XMLHttpRequest') return 'json';
  return 'html';
}
```

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
