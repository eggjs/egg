import { Inject, SingletonProto } from '@eggjs/core-decorator';

import { EventBus, Event } from '../../src/index.ts';

declare module '@eggjs/tegg' {
  interface Events {
    bar: (msg: number) => void;
  }
}

@SingletonProto()
export class BarProducer {
  @Inject()
  private readonly eventBus: EventBus;

  trigger() {
    this.eventBus.emit('bar', 'hello');
  }
}

@Event('bar')
export class BarHandler {
  handle(msg: string): void {
    console.log('msg: ', msg);
  }
}
