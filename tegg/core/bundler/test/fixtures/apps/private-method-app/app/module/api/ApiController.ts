import { HTTPController, HTTPMethod, HTTPParam } from '@eggjs/controller-decorator';
import { Inject } from '@eggjs/core-decorator';
import { HTTPMethodEnum } from '@eggjs/tegg-types';

import type { OrderService } from './OrderService.ts';
import type { UserService } from './UserService.ts';

@HTTPController({
  path: '/api',
})
export class ApiController {
  @Inject()
  userService: UserService;

  @Inject()
  orderService: OrderService;

  /**
   * Delegates to a private method that accesses userService.
   * MethodAnalyzer must follow #loadUser() to detect userService access.
   */
  @HTTPMethod({
    path: '/profile/:id',
    method: HTTPMethodEnum.GET,
  })
  async getProfile(@HTTPParam() id: string): Promise<object> {
    return this.#loadUser(id);
  }

  /**
   * Delegates to a private method that accesses orderService.
   * MethodAnalyzer must follow #loadOrder() to detect orderService access.
   */
  @HTTPMethod({
    path: '/order/:id',
    method: HTTPMethodEnum.GET,
  })
  async getOrder(@HTTPParam() id: string): Promise<object> {
    return this.#loadOrder(id);
  }

  /**
   * Uses both services directly (no private methods).
   */
  @HTTPMethod({
    path: '/summary/:id',
    method: HTTPMethodEnum.GET,
  })
  async getSummary(@HTTPParam() id: string): Promise<object> {
    const user = await this.userService.find(id);
    const order = await this.orderService.find(id);
    return { user, order };
  }

  // Private helpers - accessed indirectly via public methods
  #loadUser(id: string): Promise<object> {
    return this.userService.find(id);
  }

  #loadOrder(id: string): Promise<object> {
    return this.orderService.find(id);
  }
}
