import { Inject, SingletonProto } from '@eggjs/core-decorator';

import { EventBus, Event, IEventContext, EventContext } from '../../src/index.ts';

declare module '@eggjs/tegg' {
  interface Events {
    ctxEvent: (msg: string) => void;
  }
}

@SingletonProto()
export class EventContextProducer {
  @Inject()
  private readonly eventBus: EventBus;

  trigger() {
    this.eventBus.emit('ctxEvent', 'hello');
  }
}

@Event('ctxEvent')
export class EventContextHandler {
  handle(@EventContext() ctx: IEventContext, msg: string): void {
    console.log('ctx: ', ctx);
    console.log('msg: ', msg);
  }
}
