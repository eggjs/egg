# `@eggjs/tegg-background-task`

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/tegg-background-task.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/tegg-background-task.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/tegg-background-task
[snyk-image]: https://snyk.io/test/npm/@eggjs/tegg-background-task/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/tegg-background-task
[download-image]: https://img.shields.io/npm/dm/@eggjs/tegg-background-task.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/tegg-background-task

## install

```sh
npm i --save @eggjs/tegg-background-task
```

## Usage

```ts
import { BackgroundTaskHelper } from '@eggjs/tegg-background-task';

@ContextProto()
export default class BackgroundService {
  @Inject()
  private readonly backgroundTaskHelper: BackgroundTaskHelper;

  async backgroundAdd() {
    this.backgroundTaskHelper.run(async () => {
      // do the background task
    });
  }
}
```

## Background

tegg release the request context after request is done. So use the `process.nextTick`, `setTimeout`, `setInterval` in request is not safe.
Please use the `backgroundTaskHelper`, the release process will wait all the background tasks are done.

## Timeout

The release process will wait tasks done, but not forever. The default timeout is 5s, if task will cost more than 5s, two ways to resolve

- use the `SingletonProto` to do the work, `SingletonProto` never release
- set longer timeout to `backgroundTaskHelper.timeout`
