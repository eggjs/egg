import { BackgroundTaskHelper } from '@eggjs/background-task';
import {
  InjectContext,
  HTTPBody,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPParam,
  HTTPQuery,
  Inject,
  Middleware,
  type ModuleConfigs,
} from '@eggjs/tegg';

import { EventEchoService } from './EventEchoService.ts';
import { HelloService } from './HelloService.ts';

export const backgroundFlags: string[] = [];

async function markMiddleware(ctx: any, next: () => Promise<void>): Promise<void> {
  ctx.fromMiddleware = 'yes';
  await next();
}

@HTTPController({ path: '/hello' })
export class HelloController {
  @Inject()
  private readonly helloService: HelloService;

  @Inject()
  private readonly eventEchoService: EventEchoService;

  @Inject()
  private readonly backgroundTaskHelper: BackgroundTaskHelper;

  @Inject()
  private readonly moduleConfigs: ModuleConfigs;

  @Inject()
  private readonly config: Record<string, unknown>;

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/' })
  async index() {
    return { message: this.helloService.hello('tegg') };
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/users/:id' })
  async user(@HTTPParam({ name: 'id' }) id: string, @HTTPQuery({ name: 'role' }) role: string) {
    return { id, role: role ?? null };
  }

  @HTTPMethod({ method: HTTPMethodEnum.POST, path: '/echo' })
  async echo(@HTTPBody() body: Record<string, unknown>) {
    return { received: body };
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/raw' })
  async raw() {
    return new Response('raw-body', {
      status: 201,
      headers: { 'x-raw': '1' },
    });
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/middleware' })
  @Middleware(markMiddleware)
  async middleware(@InjectContext() ctx: any) {
    return { fromMiddleware: ctx.fromMiddleware ?? null };
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/event' })
  async event() {
    return { url: this.eventEchoService.requestUrl() };
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/module-config' })
  async moduleConfig() {
    return this.moduleConfigs.get('helloApp');
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/app-config' })
  async appConfig() {
    return this.config;
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/background' })
  async background() {
    this.backgroundTaskHelper.run(async () => {
      backgroundFlags.push('done');
    });
    return { started: true };
  }
}
