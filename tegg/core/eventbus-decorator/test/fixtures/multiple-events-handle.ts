import { Inject, SingletonProto } from '@eggjs/core-decorator';

import { type EventBus, Event } from '../../src/index.ts';

declare module '@eggjs/tegg' {
  interface Events {
    hello: (msg: string) => void;
    hi: (msg: string) => void;
  }
}

@SingletonProto()
export class MultiProducer {
  @Inject()
  private readonly eventBus: EventBus;

  trigger() {
    this.eventBus.emit('hello', 'Ydream');
  }
}

@Event('hello')
@Event('hi')
export class MultiHandler {
  handle(msg: string): void {
    console.log('msg: ', msg);
  }
}
