import { HTTPController, HTTPMethod, HTTPMethodEnum } from '@eggjs/tegg';

@HTTPController()
export default class FooTeggController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello',
  })
  async hello() {
    return 'hello, tegg';
  }
}
