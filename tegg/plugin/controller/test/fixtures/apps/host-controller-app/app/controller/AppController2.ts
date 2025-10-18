import { HTTPController, HTTPMethod, HTTPMethodEnum, Host } from '@eggjs/tegg';

@HTTPController({
  path: '/apps',
})
export class AppController2 {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/:id',
  })
  @Host('bar.eggjs.com')
  async get() {
    return 'bar';
  }
}
