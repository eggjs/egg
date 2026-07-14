import { Readable } from 'node:stream';

import { HTTPController, HTTPMethod, HTTPMethodEnum, InjectContext } from '@eggjs/tegg';

@HTTPController({ path: '/edge' })
export class EdgeController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/node-stream' })
  async nodeStream() {
    return Readable.from(['node-', 'readable']);
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/cookies' })
  async cookies() {
    const headers = new Headers();
    headers.append('set-cookie', 'a=1');
    headers.append('set-cookie', 'b=2');
    return new Response('ok', { headers });
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/immutable' })
  async immutable(@InjectContext() ctx: any) {
    // Response.redirect produces immutable headers; merging ctx.responseHeaders
    // onto it must not throw.
    ctx.responseHeaders.set('x-added', '1');
    return Response.redirect('http://localhost/dest', 302);
  }
}
