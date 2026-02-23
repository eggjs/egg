import { HTTPController, HTTPMethod, HTTPParam } from '@eggjs/controller-decorator';
import { Inject } from '@eggjs/core-decorator';
import { HTTPMethodEnum } from '@eggjs/tegg-types';

import type { OrderService } from './OrderService.ts';

@HTTPController({
  path: '/orders',
})
export class OrderController {
  @Inject()
  orderService: OrderService;

  /**
   * Dep chain: OrderController -> OrderService -> MetricsService
   * MetricsService is the Advice-like service that does cross-cutting concerns.
   * The bundler must include the full transitive chain.
   */
  @HTTPMethod({
    path: '/:id',
    method: HTTPMethodEnum.GET,
  })
  async getOrder(@HTTPParam() id: string): Promise<object> {
    return this.orderService.getOrder(id);
  }

  /**
   * No service access — pure method, empty dep bundle.
   */
  @HTTPMethod({
    path: '/ping',
    method: HTTPMethodEnum.GET,
  })
  async ping(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}
