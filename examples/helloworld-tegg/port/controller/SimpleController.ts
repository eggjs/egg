import {
  HTTPController,
  HTTPHeaders,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPParam,
  HTTPRequest,
  HTTPCookies,
  type Cookies,
  HTTPContext,
  type Context,
  type IncomingHttpHeaders,
  type EggLogger,
  Inject,
} from 'egg';

@HTTPController()
export default class SimpleController {
  @Inject()
  private logger: EggLogger;

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
}
