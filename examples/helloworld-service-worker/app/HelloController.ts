import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPQuery, Inject } from '@eggjs/tegg';

import { HelloService } from './HelloService.ts';

@HTTPController({ path: '/hello' })
export class HelloController {
  @Inject()
  private readonly helloService: HelloService;

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/' })
  async hello(@HTTPQuery({ name: 'name' }) name: string) {
    return { message: this.helloService.hello(name ?? 'service worker') };
  }
}
