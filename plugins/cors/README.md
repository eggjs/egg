# @eggjs/cors

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/cors.svg?style=flat)](https://nodejs.org/en/download/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)

[npm-image]: https://img.shields.io/npm/v/@eggjs/cors.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/cors
[snyk-image]: https://snyk.io/test/npm/@eggjs/cors/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/cors
[download-image]: https://img.shields.io/npm/dm/@eggjs/cors.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/cors

[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS) plugin for egg, based on [@koa/cors](https://github.com/koajs/cors).

## Install

```bash
$ npm i @eggjs/cors --save
```

## Usage

```js
// {app_root}/config/plugin.ts
exports.cors = {
  enable: true,
  package: '@eggjs/cors',
};
```

`egg-cors` works internally with [egg-security](https://github.com/eggjs/egg-security). By defining the property of `domainWhiteList` on object `security`, you have successfully informed the framework to whitelist the passed domains.

When you make a request from client side, **egg** should return an `Access-Control-Allow-Origin` response header with the domain that you passed in along with the payload and status code _200_.

```js
exports.security = {
  domainWhiteList: ['http://localhost:4200'],
};
```

## Configuration

Support all configurations in [@koa/cors](https://github.com/koajs/cors).

```js
// {app_root}/config/config.default.js
exports.cors = {
  // {string|Function} origin: '*',
  // {string|Array} allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH'
};
```

If the `origin` is set, the plugin will follow it to set the `Access-Control-Allow-Origin` and ignore the `security.domainWhiteList`. Otherwise, the `security.domainWhiteList` which is default will take effect as described above.

## Security

Only in safe domain list support CORS when security plugin enabled.

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)

<!-- GITCONTRIBUTOR_START -->

## Contributors

| [<img src="https://avatars.githubusercontent.com/u/227713?v=4" width="100px;"/><br/><sub><b>atian25</b></sub>](https://github.com/atian25)<br/> | [<img src="https://avatars.githubusercontent.com/u/985607?v=4" width="100px;"/><br/><sub><b>dead-horse</b></sub>](https://github.com/dead-horse)<br/> | [<img src="https://avatars.githubusercontent.com/u/156269?v=4" width="100px;"/><br/><sub><b>fengmk2</b></sub>](https://github.com/fengmk2)<br/> | [<img src="https://avatars.githubusercontent.com/u/3139237?v=4" width="100px;"/><br/><sub><b>brickyang</b></sub>](https://github.com/brickyang)<br/> |    [<img src="https://avatars.githubusercontent.com/u/3297859?v=4" width="100px;"/><br/><sub><b>sinchang</b></sub>](https://github.com/sinchang)<br/>    | [<img src="https://avatars.githubusercontent.com/u/2842176?v=4" width="100px;"/><br/><sub><b>XadillaX</b></sub>](https://github.com/XadillaX)<br/> |
| :---------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------: |
| [<img src="https://avatars.githubusercontent.com/u/1148428?v=4" width="100px;"/><br/><sub><b>mattma</b></sub>](https://github.com/mattma)<br/>  |  [<img src="https://avatars.githubusercontent.com/u/20397245?v=4" width="100px;"/><br/><sub><b>SoraYama</b></sub>](https://github.com/SoraYama)<br/>  | [<img src="https://avatars.githubusercontent.com/u/9161488?v=4" width="100px;"/><br/><sub><b>Yelmor</b></sub>](https://github.com/Yelmor)<br/>  |  [<img src="https://avatars.githubusercontent.com/u/6895141?v=4" width="100px;"/><br/><sub><b>angela-1</b></sub>](https://github.com/angela-1)<br/>  | [<img src="https://avatars.githubusercontent.com/u/1763067?v=4" width="100px;"/><br/><sub><b>waitingsong</b></sub>](https://github.com/waitingsong)<br/> |

This project follows the git-contributor [spec](https://github.com/xudafeng/git-contributor), auto updated at `Mon Dec 11 2023 13:25:00 GMT+0800`.

<!-- GITCONTRIBUTOR_END -->
