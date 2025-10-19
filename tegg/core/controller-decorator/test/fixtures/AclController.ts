import { HTTPMethodEnum } from '@eggjs/tegg-types';

import { Acl, HTTPController, HTTPMethod } from '../../src/index.ts';

@Acl('mock1')
@HTTPController()
export class AclController {
  @Acl('mock2')
  @HTTPMethod({
    path: '/foo',
    method: HTTPMethodEnum.GET,
  })
  async foo(): Promise<void> {
    console.log('hello,acl');
  }

  @HTTPMethod({
    path: '/bar',
    method: HTTPMethodEnum.GET,
  })
  async bar(): Promise<void> {
    console.log('hello,acl');
  }
}
