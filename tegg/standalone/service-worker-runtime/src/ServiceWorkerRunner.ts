import type { EggObjectFactory } from '@eggjs/dynamic-inject-runtime';
import { Inject, SingletonProto } from '@eggjs/tegg';
import { AbstractEventHandler, type MainRunner, Runner, type StandaloneEvent } from '@eggjs/tegg/standalone';

/** Dispatches the current event to its qualified handler. */
@Runner()
@SingletonProto()
export class ServiceWorkerRunner implements MainRunner<unknown> {
  @Inject()
  private readonly event: StandaloneEvent;

  @Inject()
  private readonly eggObjectFactory: EggObjectFactory;

  async main(): Promise<unknown> {
    const handler = await this.eggObjectFactory.getEggObject(AbstractEventHandler, this.event.type);
    return await handler.handleEvent(this.event);
  }
}
