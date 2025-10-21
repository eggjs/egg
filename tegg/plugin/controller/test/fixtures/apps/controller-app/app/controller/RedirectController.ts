import type { Context } from 'egg';
import { HTTPContext, HTTPController, HTTPMethod, HTTPMethodEnum } from '@eggjs/tegg';

@HTTPController()
export class EdgeCaseController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/redirect',
  })
  async redirect(@HTTPContext() ctx: Context): Promise<void> {
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
