import {
  HTTPController,
  HTTPHeaders,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPParam,
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
}
