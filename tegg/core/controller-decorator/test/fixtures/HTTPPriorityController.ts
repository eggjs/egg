import { HTTPMethodEnum } from '@eggjs/tegg-types';
import { HTTPController, HTTPMethod } from '../../src/index.js';

@HTTPController({
  path: '/foo',
})
export class PriorityController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/*',
  })
  async regexpMethod() {
    return Promise.resolve();
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/users/:id',
  })
  async paramMethod() {
    return Promise.resolve();
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/web/users/*',
  })
  async regexpMethod2() {
    return Promise.resolve();
  }
}

@HTTPController()
export class TooLongController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/:id1/:id2/:id3/:id4/:id5/:id6/:id7/:id8/:id9/:id10/:id11/:id12/:id13/:id14/:id15',
  })
  async tooLongMethod() {
    return Promise.resolve();
  }
}
