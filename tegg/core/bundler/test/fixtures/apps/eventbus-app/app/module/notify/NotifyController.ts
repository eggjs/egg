import { HTTPController, HTTPMethod, HTTPParam } from '@eggjs/controller-decorator';
import { Inject } from '@eggjs/core-decorator';
import { HTTPMethodEnum } from '@eggjs/tegg-types';

import type { NotifierService } from './NotifierService.ts';

@HTTPController({
  path: '/notify',
})
export class NotifyController {
  @Inject()
  notifierService: NotifierService;

  /**
   * This method's dep chain: NotifyController -> NotifierService -> UserService
   * NotifierService also injects EventBus (framework built-in), which must be
   * silently skipped during dep resolution (findInjectProto returns null for it).
   */
  @HTTPMethod({
    path: '/user/:id',
    method: HTTPMethodEnum.POST,
  })
  async notifyUser(@HTTPParam() id: string): Promise<void> {
    await this.notifierService.notifyUser(id);
  }
}
