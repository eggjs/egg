import type { Context as EggContext } from 'egg';
import { Context, HTTPController, HTTPMethod, HTTPMethodEnum } from '@eggjs/tegg';

@HTTPController()
export class EdgeCaseController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/redirect',
  })
  async redirect(@Context() ctx: EggContext) {
    ctx.redirect('https://alipay.com');
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/empty',
  })
  async empty() {
    return;
  }
}
