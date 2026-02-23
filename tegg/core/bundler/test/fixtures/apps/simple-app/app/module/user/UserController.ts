import { HTTPController, HTTPMethod, HTTPParam, HTTPQuery } from '@eggjs/controller-decorator';
import { Inject } from '@eggjs/core-decorator';
import { HTTPMethodEnum } from '@eggjs/tegg-types';

import type { AdminService } from './AdminService.ts';
import type { UserService } from './UserService.ts';

@HTTPController({
  path: '/api/users',
})
export class UserController {
  @Inject()
  userService: UserService;

  @Inject()
  adminService: AdminService;

  /**
   * Get a single user - only uses userService, NOT adminService.
   * This is the key test: getUser bundle should exclude AdminService.
   */
  @HTTPMethod({
    path: '/:id',
    method: HTTPMethodEnum.GET,
  })
  async getUser(@HTTPParam() id: string, @HTTPQuery() fields: string): Promise<object> {
    const user = await this.userService.getUser(id);
    return { user, fields };
  }

  /**
   * Admin action - uses BOTH userService and adminService.
   * This bundle should include both services.
   */
  @HTTPMethod({
    path: '/admin',
    method: HTTPMethodEnum.POST,
  })
  async adminAction(): Promise<object> {
    const user = await this.userService.getUser('admin');
    const result = await this.adminService.doAdminAction();
    return { user, result };
  }
}
