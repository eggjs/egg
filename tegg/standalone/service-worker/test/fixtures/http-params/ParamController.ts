import {
  HTTPBody,
  HTTPController,
  HTTPHeaders,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPParam,
  HTTPQueries,
  HTTPQuery,
  HTTPRequest,
  Request,
} from '@eggjs/tegg';

@HTTPController()
export class ParamController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/query' })
  async hello(@HTTPQuery() name: string, @HTTPQueries() type: string[]) {
    return {
      name,
      type,
    };
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/find/:id' })
  async find(@HTTPParam() id: string) {
    return {
      id,
    };
  }

  @HTTPMethod({ method: HTTPMethodEnum.POST, path: '/echo/body' })
  async echoBody(@HTTPBody() body: object) {
    if (body.constructor.name === 'FormData') {
      const res = {};
      for (const [ key, value ] of (body as FormData).entries()) {
        res[key] = value;
      }
      return { type: 'formData', body: res };
    }
    return { body };
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/headers' })
  async headers(@HTTPHeaders() headers: Record<string, string>) {
    return {
      headers,
    };
  }

  @HTTPMethod({ method: HTTPMethodEnum.POST, path: '/request' })
  async request(@Request() req: HTTPRequest) {
    return {
      url: req.url,
      method: req.method,
      customHeaders: req.headers.get('x-custom'),
      body: await req.json(),
    };
  }
}
