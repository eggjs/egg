# @eggjs/tegg-orm-plugin

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/tegg-orm-plugin.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/tegg-orm-plugin.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/tegg-orm-plugin
[snyk-image]: https://snyk.io/test/npm/@eggjs/tegg-orm-plugin/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/tegg-orm-plugin
[download-image]: https://img.shields.io/npm/dm/@eggjs/tegg-orm-plugin.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/tegg-orm-plugin

使用注解的方式来开发 egg 中的 orm

## Install

```shell
npm i --save @eggjs/tegg-orm-plugin
```

## Config

```js
// config/plugin.js
exports.teggOrm = {
  package: '@eggjs/tegg-orm-plugin',
  enable: true,
};
```
