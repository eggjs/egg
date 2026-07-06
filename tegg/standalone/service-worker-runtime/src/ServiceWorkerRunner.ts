import type { EggObjectFactory } from '@eggjs/dynamic-inject-runtime';
import { Inject, SingletonProto } from '@eggjs/tegg';
import { AbstractEventHandler, type MainRunner, Runner } from '@eggjs/tegg/standalone';

/**
 * The standalone service worker entry runner: resolve the event handler
 * implementation by `event.type` and dispatch. Protocol packages contribute
 * handlers via `@EventHandlerProto('<type>')`.
 */
@Runner()
@SingletonProto()
export class ServiceWorkerRunner implements MainRunner<unknown> {
  @Inject()
  private readonly event: Event;

  @Inject()
  private readonly eggObjectFactory: EggObjectFactory;

  async main(): Promise<unknown> {
    const handler = await this.eggObjectFactory.getEggObject(AbstractEventHandler, this.event.type);
    return await handler.handleEvent(this.event);
  }
}
