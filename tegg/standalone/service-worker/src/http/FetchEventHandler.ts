import { MiddlewareFuncWithRouter } from '@eggjs/router';
import { FetchEvent } from '@eggjs/tegg-types/standalone';
import {
  AccessLevel,
  Inject,
} from '@eggjs/tegg';
import { AbstractEventHandler, EventHandlerProto } from '@eggjs/tegg/standalone';
import { FetchRouter } from './FetchRouter.ts';
import { ServiceWorkerFetchContext } from './ServiceWorkerFetchContext.ts';
import { RootProtoManager } from '../controller/RootProtoManager.ts';
import { HTTPControllerRegister } from './HTTPControllerRegister.ts';
import { MCPControllerRegister } from '../mcp/MCPControllerRegister.ts';

@EventHandlerProto('fetch', { accessLevel: AccessLevel.PUBLIC })
export class FetchEventHandler extends AbstractEventHandler<FetchEvent, Response> {
  @Inject()
  private readonly fetchRouter: FetchRouter;

  @Inject()
  private readonly rootProtoManager: RootProtoManager;

  #routes: MiddlewareFuncWithRouter<FetchRouter>;
  #initialized = false;

  private async initRoutes() {
    if (!this.#initialized) {
      HTTPControllerRegister.instance?.doRegister(this.rootProtoManager);
      await MCPControllerRegister.instance?.doRegister();
      this.#routes = this.fetchRouter.middleware();
      this.#initialized = true;
    }
  }

  async handleEvent(event: FetchEvent): Promise<Response> {
    await this.initRoutes();
    const ctx = new ServiceWorkerFetchContext({ event });
    try {
      await this.#routes(ctx, async () => { /**/ });
      if (ctx.response) {
        return ctx.response;
      }

      return new Response(null, { status: 404 });
    } catch (e) {
      console.error('handle event failed:', e);
      return new Response(e.message, { status: 500 });
    }
  }
}
