import { Inject, InnerObjectProto, LifecycleDestroy, LifecycleInit } from '@eggjs/tegg';

import { CleanupProbe } from './CleanupProbe.ts';

@InnerObjectProto()
export class InitFailureInner {
  static attempts = 0;
  static destroyed = 0;

  @Inject()
  cleanupProbe: CleanupProbe;

  @LifecycleInit()
  init(): void {
    InitFailureInner.attempts++;
    throw new Error('expected init failure');
  }

  @LifecycleDestroy()
  destroy(): void {
    InitFailureInner.destroyed++;
  }
}
