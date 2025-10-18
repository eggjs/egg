import { Context as EggContext } from 'egg';
import { Context, HTTPController, HTTPMethod, HTTPMethodEnum, HTTPParam } from '@eggjs/tegg';

@HTTPController()
export class AppController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/apps/:id',
  })
  async get(@Context() ctx: EggContext, @HTTPParam() id: string) {
    const traceId = ctx.tracer.traceId;
    return {
      traceId,
      app: 'mock-app:' + id,
    };
  }
}
