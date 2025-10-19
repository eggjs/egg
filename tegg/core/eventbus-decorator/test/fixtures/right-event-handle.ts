import { Inject, SingletonProto } from '@eggjs/core-decorator';

import { EventBus, Event } from '../../src/index.ts';

declare module '@eggjs/tegg' {
  interface Events {
    foo: (msg: string) => void;
  }
}

@SingletonProto()
export class FooProducer {
  @Inject()
  private readonly eventBus: EventBus;

  trigger() {
    this.eventBus.emit('foo', 'hello');
  }
}

@Event('foo')
export class FooHandler {
  handle(msg: string): void {
    console.log('msg: ', msg);
  }
}
