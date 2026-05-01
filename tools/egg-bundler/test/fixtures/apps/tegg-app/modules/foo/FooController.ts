import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPQuery, Inject } from '@eggjs/tegg';

import { FooService } from './FooService.js';

@HTTPController({
  path: '/tegg',
})
export class FooController {
  @Inject()
  fooService!: FooService;

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello',
  })
  async hello(@HTTPQuery() name?: string): Promise<{ message: string }> {
    return {
      message: this.fooService.hello(name || 'world'),
    };
  }
}
