# @eggjs/eventbus-plugin

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/eventbus-plugin.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/eventbus-plugin.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/eventbus-plugin
[snyk-image]: https://snyk.io/test/npm/@eggjs/eventbus-plugin/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/eventbus-plugin
[download-image]: https://img.shields.io/npm/dm/@eggjs/eventbus-plugin.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/eventbus-plugin

## Usage

```js
// plugin.js
export.teggEventbus = {
  enable: true,
  package: '@eggjs/eventbus-plugin',
};
```

## Unittest

```ts
// test/fixtures/apps/event-app/app/event-module/HelloService
@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class HelloService {
  @Inject()
  private readonly eventBus: EventBus;

  hello() {
    this.eventBus.emit('hello', '01');
  }
}

// test/fixtures/apps/event-app/app/event-module/HelloLogger
@Event('helloEgg')
export class HelloLogger {
  handle(msg: string) {
    console.log('hello, ', msg);
  }
}

// test/event.test.ts
import assert from 'assert';
import path from 'path';
import mm from 'egg-mock';
import { HelloService } from './fixtures/apps/event-app/app/event-module/HelloService';
import { HelloLogger } from './fixtures/apps/event-app/app/event-module/HelloLogger';

describe('test/eventbus.test.ts', () => {
  let app;
  let ctx;

  afterEach(async () => {
    await app.destroyModuleContext(ctx);
    mm.restore();
  });

  before(async () => {
    app = mm.app();
    await app.ready();
  });

  after(() => {
    return app.close();
  });

  it('msg should work', async () => {
    ctx = await app.mockModuleContext();
    const helloService = await ctx.getEggObject(HelloService);
    let msg: string | undefined;
    // helloLogger is in child context, should mock the prototype
    mm(HelloLogger.prototype, 'handle', (m) => {
      msg = m;
    });
    const eventWaiter = await app.getEventWaiter();
    const helloEvent = eventWaiter.await('hello');
    helloService.hello();
    await helloEvent;
    assert(msg === '01');
  });
});
```
