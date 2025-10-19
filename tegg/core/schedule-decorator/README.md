# `@eggjs/tegg-schedule-decorator`

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/tegg-schedule-decorator.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/tegg-schedule-decorator.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/tegg-schedule-decorator
[snyk-image]: https://snyk.io/test/npm/@eggjs/tegg-schedule-decorator/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/tegg-schedule-decorator
[download-image]: https://img.shields.io/npm/dm/@eggjs/tegg-schedule-decorator.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/tegg-schedule-decorator

## Install

```shell
npm i --save @eggjs/tegg-schedule-decorator
```

## Define schedule subscriber

```ts
import { Schedule } from '@eggjs/tegg';

// use number to define schedule interval
@Schedule<IntervalParams>({
  type: ScheduleType.WORKER,
  scheduleData: {
    // run every 100ms
    interval: 100,
  },
})
export class FooSubscriber {
  @Inject()
  private readonly logger: EggLogger;

  async subscribe() {
    this.logger.info('schedule called');
  }
}

// use cron to define schedule interval
@Schedule<CronParams>({
  type: ScheduleType.WORKER,
  scheduleData: {
    cron: '0 0 3 * * *',
  },
})
export class FooSubscriber {
  @Inject()
  private readonly logger: EggLogger;

  async subscribe() {
    this.logger.info('schedule called');
  }
}
```
