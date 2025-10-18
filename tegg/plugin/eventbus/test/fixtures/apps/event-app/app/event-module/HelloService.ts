import { AccessLevel, ContextProto, Inject, type ContextEventBus } from '@eggjs/tegg';

declare module '@eggjs/tegg' {
  interface Events {
    helloEgg: (msg: string) => void;
    hiEgg: (msg: string) => void;
    trace: () => void;
  }
}

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class HelloService {
  @Inject()
  private readonly eventBus: ContextEventBus;

  cork() {
    this.eventBus.cork();
  }

  uncork() {
    this.eventBus.uncork();
  }

  hello() {
    this.eventBus.emit('helloEgg', '01');
  }

  hi() {
    this.eventBus.emit('hiEgg', 'Ydream');
  }

  traceTest() {
    this.eventBus.emit('trace');
  }
}
