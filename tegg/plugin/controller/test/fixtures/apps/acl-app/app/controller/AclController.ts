import { Acl, HTTPController, HTTPMethod, HTTPMethodEnum } from '@eggjs/tegg';

@HTTPController()
export default class AclController {
  @Acl()
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/foo',
  })
  async foo() {
    return 'hello, foo';
  }

  @Acl('mock1')
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/bar',
  })
  async bar() {
    return 'hello, bar';
  }
}
