import { SingletonProto, Inject, EggObjectFactory } from '@eggjs/tegg';
import { Runner, AbstractEventHandler, FetchEventLike } from '@eggjs/tegg/standalone';
import { ContextHandler } from '@eggjs/tegg/helper';
import { ContextProtoProperty } from './constants.ts';

@Runner()
@SingletonProto()
export class ServiceWorkerRunner {
  @Inject({ name: 'standaloneEggObjectFactory' })
  private readonly eggObjectFactory: EggObjectFactory;

  async main(): Promise<unknown> {
    const requestContext = ContextHandler.getContext();
    if (!requestContext) {
      throw new Error('[tegg-standalone-framework] no request context in FetchRunner');
    }
    const event = requestContext.get(ContextProtoProperty.Event.contextKey) as FetchEventLike | undefined;
    if (!event) {
      throw new Error('[tegg-standalone-framework] no fetch event on context');
    }
    const handler = await this.eggObjectFactory.getEggObject(AbstractEventHandler, event.type);
    return await handler.handleEvent(event);
  }
}
