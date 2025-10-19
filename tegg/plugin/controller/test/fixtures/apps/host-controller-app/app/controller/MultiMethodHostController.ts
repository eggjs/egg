import { HTTPController, HTTPMethod, HTTPMethodEnum, Host } from '@eggjs/tegg';

@HTTPController({
  controllerName: 'MultiMethodHostController',
  path: '/apps',
})
export class MultiMethodHostController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/orange',
  })
  @Host(['orange.eggjs.com', 'o.eggjs.com'])
  async orange() {
    return 'orange';
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/juice',
  })
  @Host('juice.eggjs.com')
  async juice() {
    return 'juice';
  }
}
