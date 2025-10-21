import '@eggjs/tracer/types';
import type { Context } from 'egg';
import {
  HTTPContext,
  HTTPBody,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPParam,
  HTTPQuery,
  HTTPHeaders,
  type IncomingHttpHeaders,
  Middleware,
  Inject,
} from '@eggjs/tegg';

import AppService from '../../modules/multi-module-service/AppService.js';
import App from '../../modules/multi-module-common/model/App.js';
import { countMw } from '../middleware/count_mw.js';

@HTTPController({
  path: '/apps',
})
@Middleware(countMw)
export class AppController {
  @Inject()
  appService: AppService;

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/:id',
  })
  async get(
    @HTTPContext() ctx: Context,
    @HTTPParam() id: string
  ): Promise<{
    traceId: string;
    app: App | null;
  }> {
    const traceId = await ctx.tracer.traceId;
    const app = await this.appService.findApp(id);
    return {
      traceId,
      app,
    };
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '',
  })
  async find(
    @HTTPContext() ctx: Context,
    @HTTPQuery() name: string
  ): Promise<{
    traceId: string;
    app: App | null;
  }> {
    const traceId = await ctx.tracer.traceId;
    const app = await this.appService.findApp(name);
    return {
      traceId,
      app,
    };
  }

  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: '',
  })
  async save(
    @HTTPContext() ctx: Context,
    @HTTPBody() app: App,
    @HTTPHeaders() headers: IncomingHttpHeaders
  ): Promise<{
    success: boolean;
    traceId: string;
    sessionId: string | undefined;
  }> {
    const traceId = await ctx.tracer.traceId;
    await this.appService.save(app);
    return {
      success: true,
      traceId,
      sessionId: headers['x-session-id'] as string | undefined,
    };
  }
}
