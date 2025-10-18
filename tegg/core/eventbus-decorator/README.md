# `@eggjs/eventbus-decorator`

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/eventbus-decorator.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/eventbus-decorator.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/eventbus-decorator
[snyk-image]: https://snyk.io/test/npm/@eggjs/eventbus-decorator/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/eventbus-decorator
[download-image]: https://img.shields.io/npm/dm/@eggjs/eventbus-decorator.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/eventbus-decorator

## Usage

### emit event

```ts
import { EventBus } from '@eggjs/eventbus-decorator';

// Define event first.
// Ts can check event and args type for you.
declare module '@eggjs/eventbus-decorator' {
  interface Events {
    hello: (msg: string) => Promise<void>;
  }
}

class Foo {
  @Inject()
  private readonly eventBus: EventBus;

  bar() {
    this.eventBus.emit('hello', '01');
  }
}
```

### cork events

Cache events in memory until uncork.

```ts
class Foo {
  @Inject()
  private readonly eventBus: ContextEventBus;

  bar() {
    this.eventBus.cork();
    // ...do something
    this.eventBus.emit('hello', '01');
    // ...do other things

    // emit all cached events
    this.eventBus.uncork();
  }
}
```

### handle event

```ts
@Event('hello')
export class Foo {
  async handle(msg: string): Promise<void> {
    console.log('msg: ', msg);
  }
}
```

### handle multiple event

```ts
@Event('hello')
@Event('hi')
export class Foo {
  async handle(msg: string): Promise<void> {
    console.log('msg: ', msg);
  }
}
```

### inject event context

inject event context if you want to know which event is being handled.
The context param must be the first param

```ts
@Event('hello')
@Event('hi')
export class Foo {
  async handle(@EventContext() ctx: IEventContext, msg: string): Promise<void> {
    console.log('eventName: ', ctx.eventName);
    console.log('msg: ', msg);
  }
}
```
