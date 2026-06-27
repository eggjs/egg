import { AccessLevel, Event, type EventBus, Inject, SingletonProto } from '@eggjs/tegg';

import { CounterService } from './CounterService.ts';

declare module '@eggjs/eventbus-decorator' {
  interface Events {
    counterEvent: (delta: number) => void;
  }
}

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class CounterProducer {
  @Inject()
  private readonly eventBus: EventBus;

  emit(delta: number): void {
    this.eventBus.emit('counterEvent', delta);
  }
}

/**
 * Runs in the EventBus event context. Under multi-app, doEmit re-establishes the
 * EMITTING app's scope, so this handler must resolve the EMITTING app's
 * CounterService — never the other app's.
 */
@Event('counterEvent')
export class CounterEventHandler {
  @Inject()
  private readonly counterService: CounterService;

  async handle(delta: number): Promise<void> {
    this.counterService.onEvent(delta);
  }
}
