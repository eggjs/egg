import { Event, type EventBus, EventContext, type IEventContext } from '@eggjs/eventbus-decorator';
import { AccessLevel, Inject, SingletonProto } from '@eggjs/core-decorator';

declare module '@eggjs/eventbus-decorator' {
  interface Events {
    foo: (msg: string) => void;
    bar: (msg: string) => void;
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class MultiWithContextProducer {
  @Inject()
  private readonly eventBus: EventBus;

  foo() {
    this.eventBus.emit('foo', '123');
  }

  bar() {
    this.eventBus.emit('bar', '321');
  }
}

@Event('foo')
@Event('bar')
export class MultiWithContextHandler {
  static eventName: string;
  static msg: string;
  async handle(@EventContext() ctx: IEventContext, msg: string) {
    MultiWithContextHandler.eventName = ctx.eventName;
    MultiWithContextHandler.msg = msg;
  }
}
