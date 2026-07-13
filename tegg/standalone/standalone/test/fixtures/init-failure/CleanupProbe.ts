import { InnerObjectProto, LifecycleDestroy, LifecycleInit } from '@eggjs/tegg';

@InnerObjectProto()
export class CleanupProbe {
  static initialized: CleanupProbe[] = [];
  static destroyed: CleanupProbe[] = [];

  @LifecycleInit()
  init(): void {
    CleanupProbe.initialized.push(this);
  }

  @LifecycleDestroy()
  destroy(): void {
    CleanupProbe.destroyed.push(this);
  }
}
