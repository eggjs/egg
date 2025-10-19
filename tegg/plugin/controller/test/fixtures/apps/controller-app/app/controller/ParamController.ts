import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPParam } from '@eggjs/tegg';

@HTTPController({
  path: '/foo/:fooId',
})
export class ParamController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/bar/:barId',
  })
  async get(@HTTPParam() barId: string, @HTTPParam() fooId: string) {
    return {
      fooId,
      barId,
    };
  }
}
