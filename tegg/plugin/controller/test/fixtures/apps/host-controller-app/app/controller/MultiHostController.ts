import { HTTPController, HTTPMethod, HTTPMethodEnum, Host } from '@eggjs/tegg';

@Host(['apple.eggjs.com', 'a.eggjs.com'])
@HTTPController({
  controllerName: 'MultiHostController',
  path: '/apps',
})
export class MultiHostController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/apple',
  })
  async apple() {
    return 'apple';
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/a',
  })
  async a() {
    return 'a';
  }
}
