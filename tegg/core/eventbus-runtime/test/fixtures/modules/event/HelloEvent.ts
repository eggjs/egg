import { Event, type EventBus } from '@eggjs/eventbus-decorator';
import { AccessLevel, Inject, SingletonProto } from '@eggjs/core-decorator';

declare module '@eggjs/eventbus-decorator' {
  interface Events {
    hello: (hello: string) => void;
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class HelloProducer {
  @Inject()
  private readonly eventBus: EventBus;

  trigger() {
    this.eventBus.emit('hello', '01');
  }
}

@Event('hello')
export class HelloHandler {
  handle(hello: string) {
    console.log('hello, ', hello);
  }
}
