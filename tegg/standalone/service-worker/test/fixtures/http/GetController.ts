import { HTTPMethodEnum, HTTPController, HTTPMethod, HTTPQuery } from '@eggjs/tegg';

@HTTPController()
export class GetController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/hello' })
  async hello() {
    return 'hello';
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/null-body' })
  async nullBody(@HTTPQuery() nil: string) {
    return nil ? null : undefined;
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/response' })
  async response() {
    return new Response('full response', {
      status: 500,
      headers: {
        'content-type': 'text/plain',
        'x-custom-header': 'custom-value',
      },
    });
  }
}
