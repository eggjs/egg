import type { ILifecycleBoot, EggApplicationCore } from 'egg';

import { isReady } from './app/extend/application.ts';

export class TracerBoot implements ILifecycleBoot {
  private readonly app;
  constructor(app: EggApplicationCore) {
    this.app = app;
  }

  async didLoad() {
    this.app[isReady] = true;
  }
}
