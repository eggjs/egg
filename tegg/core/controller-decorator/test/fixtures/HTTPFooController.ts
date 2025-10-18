import { HTTPMethodEnum } from '@eggjs/tegg-types';
import type { EggContext, Next, IncomingHttpHeaders } from '@eggjs/tegg-types';

import {
  HTTPController,
  Context,
  Middleware,
  HTTPBody,
  HTTPParam,
  HTTPQueries,
  HTTPQuery,
  HTTPHeaders,
  HTTPMethod,
} from '../../src/index.ts';

async function middleware1(ctx: EggContext, next: Next) {
  console.log(ctx, next);
}

async function middleware2(ctx: EggContext, next: Next) {
  console.log(ctx, next);
}

async function middleware3(ctx: EggContext, next: Next) {
  console.log(ctx, next);
}

@HTTPController({
  path: '/foo',
})
@Middleware(middleware1)
export class FooController {
  static fileName = process.platform === 'win32' ? import.meta.filename.replaceAll('\\', '/') : import.meta.filename;

  @HTTPMethod({
    path: '/bar/:id',
    method: HTTPMethodEnum.POST,
  })
  @Middleware(middleware2)
  @Middleware(middleware3)
  async bar(
    @Context() ctx: EggContext,
    @HTTPBody() body: unknown,
    @HTTPQuery() query: Record<string, unknown>,
    @HTTPQueries() queries: Record<string, unknown[]>,
    @HTTPParam() id: string
  ) {
    console.log(ctx, body, query, queries, id);
  }
}

@HTTPController({
  path: '/foo/:fooId',
})
export class ControllerWithParam {
  static fileName = process.platform === 'win32' ? import.meta.filename.replaceAll('\\', '/') : import.meta.filename;

  @HTTPMethod({
    path: '/bar/:id',
    method: HTTPMethodEnum.GET,
  })
  async bar(
    @Context() ctx: EggContext,
    @HTTPParam() id: string,
    @HTTPParam() fooId: string,
    @HTTPHeaders() headers: IncomingHttpHeaders
  ) {
    console.log(ctx, id, fooId, headers);
  }
}

@HTTPController({
  controllerName: 'FxxController',
})
export class FoxController {
  @HTTPMethod({
    path: '/bar/:id',
    method: HTTPMethodEnum.POST,
  })
  @Middleware(middleware2)
  @Middleware(middleware3)
  async bar(
    @Context() ctx: EggContext,
    @HTTPBody() body: unknown,
    @HTTPQuery() query: Record<string, unknown>,
    @HTTPQueries() queries: Record<string, unknown[]>,
    @HTTPParam() id: string
  ) {
    console.log(ctx, body, query, queries, id);
  }
}

@HTTPController({
  protoName: 'FooController',
})
export class FxxController {
  @HTTPMethod({
    path: '/bar/:id',
    method: HTTPMethodEnum.POST,
  })
  @Middleware(middleware2)
  @Middleware(middleware3)
  async bar(
    @Context() ctx: EggContext,
    @HTTPBody() body: unknown,
    @HTTPQuery() query: Record<string, unknown>,
    @HTTPQueries() queries: Record<string, unknown[]>,
    @HTTPParam() id: string
  ) {
    console.log(ctx, body, query, queries, id);
  }
}

@HTTPController()
export class ParentController {}

@HTTPController()
export class ChildController extends ParentController {}

@HTTPController()
export class DefaultValueController {
  @HTTPMethod({
    path: '/default/:id',
    method: HTTPMethodEnum.GET,
  })
  @Middleware(middleware2)
  @Middleware(middleware3)
  async bar(
    @Context() ctx: EggContext,
    @HTTPParam() id = 233,
    @HTTPQuery() query: Record<string, unknown>,
    @HTTPQueries() queries: Record<string, unknown[]>
  ) {
    console.log(ctx, id, query, queries);
  }
}

@HTTPController()
export class Error1Controller {
  @HTTPMethod({
    path: '/error',
    method: HTTPMethodEnum.GET,
  })
  @Middleware(middleware2)
  @Middleware(middleware3)
  async bar(@Context() ctx: EggContext, id: number) {
    console.log(ctx, id);
  }
}

@HTTPController()
export class Error2Controller {
  @HTTPMethod({
    path: '/error',
    method: HTTPMethodEnum.GET,
  })
  @Middleware(middleware2)
  @Middleware(middleware3)
  async bar(@Context() ctx: EggContext, id = 233, @HTTPParam() id2: number = 233) {
    console.log(ctx, id, id2);
  }
}
