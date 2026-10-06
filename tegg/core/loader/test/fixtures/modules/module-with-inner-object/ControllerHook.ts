import { Inject, LoadUnitLifecycleProto } from '@eggjs/core-decorator';

import type { FetchRouter } from './FetchRouter.ts';

@LoadUnitLifecycleProto()
export class ControllerHook {
  @Inject()
  fetchRouter: FetchRouter;

  async postCreate(): Promise<void> {
    return;
  }
}
