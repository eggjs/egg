import assert from 'node:assert/strict';
import {
  HTTPController,
  HTTPHeaders,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPParam,
  HTTPRequest,
  HTTPCookies,
  Cookies,
  HTTPContext,
  Context,
  IncomingHttpHeaders,
  Logger,
  Inject,
} from 'egg';
import { Tracer } from '@eggjs/tracer';

import { Foo } from '../../biz/Foo.ts';
@HTTPController()
export default class SimpleController {
  @Inject()
  private logger: Logger;

  @Inject()
  private foo: Foo;

  @Inject()
  private tracer: Tracer;

  // declare a `GET /api/hello/:name` interface
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/hello/:name' })
  async hello(@HTTPParam() name: string) {
    return {
      message: `hello ${name}`,
    };
  }

  // curl http://localhost:7001/api/hello -H 'X-Custom: custom'
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/headers' })
  async getHeaders(@HTTPHeaders() headers: IncomingHttpHeaders) {
    const custom = headers['x-custom'];
    this.logger.info('request headers: %j', headers);
    return {
      message: `hello ${custom}`,
    };
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/request' })
  async getRequest(@HTTPRequest() request: Request, @HTTPCookies() cookies: Cookies) {
    return {
      message: `hello ${request.method} ${request.url}`,
      cookies: cookies.get('test', { signed: false }),
    };
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/context' })
  async getContext(@HTTPContext() ctx: Context) {
    return {
      message: `hello ${ctx.request.method} ${ctx.request.url}`,
    };
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/foo' })
  async getFoo(@HTTPContext() ctx: Context) {
    this.logger.info('traceId: %s', ctx.traceId);
    this.logger.info('tracer: %s', ctx.tracer.traceId);
    this.logger.info('tracer: %s', this.tracer.traceId);
    assert.equal(ctx.traceId, this.tracer.traceId);
    assert.equal(ctx.tracer, this.tracer);
    return {
      message: `hello, bar: ${await this.foo.bar()}`,
      data: await this.foo.fetch(),
    };
  }
}
