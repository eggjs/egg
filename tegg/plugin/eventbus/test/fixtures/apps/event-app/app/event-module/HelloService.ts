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

  cork(): void {
    this.eventBus.cork();
  }

  uncork(): void {
    this.eventBus.uncork();
  }

  hello(): void {
    this.eventBus.emit('helloEgg', '01');
  }

  hi(): void {
    this.eventBus.emit('hiEgg', 'Ydream');
  }

  traceTest(): void {
    this.eventBus.emit('trace');
  }
}
