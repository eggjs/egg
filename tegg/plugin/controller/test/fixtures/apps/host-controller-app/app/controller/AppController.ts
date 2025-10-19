import { HTTPController, HTTPMethod, HTTPMethodEnum, Host } from '@eggjs/tegg';

@Host('foo.eggjs.com')
@HTTPController({
  controllerName: 'AppController',
  path: '/apps',
})
export class AppController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/:id',
  })
  async get() {
    return 'foo';
  }
}
