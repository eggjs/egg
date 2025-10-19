# @eggjs/tegg-schedule-plugin

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/tegg-schedule-plugin.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/tegg-schedule-plugin.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/tegg-schedule-plugin
[snyk-image]: https://snyk.io/test/npm/@eggjs/tegg-schedule-plugin/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/tegg-schedule-plugin
[download-image]: https://img.shields.io/npm/dm/@eggjs/tegg-schedule-plugin.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/tegg-schedule-plugin

使用注解的方式来开发 egg 中的 schedule

## Install

```shell
npm i --save @eggjs/tegg-schedule-plugin
```

## Config

```js
// config/plugin.js
exports.teggSchedule = {
  package: '@eggjs/tegg-schedule-plugin',
  enable: true,
};
```
