import { HTTPBody, HTTPController, HTTPMethod, HTTPParam, HTTPQuery } from '@eggjs/controller-decorator';
import { Inject } from '@eggjs/core-decorator';
import { HTTPMethodEnum } from '@eggjs/tegg-types';

import type { FooService } from '../foo/FooService.ts';

@HTTPController({
  path: '/bar',
})
export class BarController {
  // Cross-module injection: FooService is from the foo module
  @Inject()
  fooService: FooService;

  /**
   * Fetches a user via FooService (cross-module dep).
   * Bundle should include FooService + FooRepository (transitive).
   */
  @HTTPMethod({
    path: '/users/:id',
    method: HTTPMethodEnum.GET,
  })
  async fetchUser(@HTTPParam() id: string, @HTTPQuery() fields: string): Promise<object> {
    const user = await this.fooService.getUser(id);
    return { user, fields };
  }

  /**
   * Creates a user via FooService.
   * Bundle should also include FooService + FooRepository.
   */
  @HTTPMethod({
    path: '/users',
    method: HTTPMethodEnum.POST,
  })
  async createUser(@HTTPBody() body: { id: string; name: string }): Promise<void> {
    await this.fooService.createUser(body);
  }

  /**
   * Health check - no service access at all.
   * Bundle should have empty deps.
   */
  @HTTPMethod({
    path: '/health',
    method: HTTPMethodEnum.GET,
  })
  async healthCheck(): Promise<{ status: string }> {
    return { status: 'ok' };
  }
}
