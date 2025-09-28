import { debuglog } from 'node:util';
import type { ILifecycleBoot, EggApplicationCore } from 'egg';

import { isReady } from './app/extend/application.ts';

const debug = debuglog('egg/tracer/boot');

export class TracerBoot implements ILifecycleBoot {
  private readonly app;
  constructor(app: EggApplicationCore) {
    this.app = app;
  }

  async didLoad() {
    debug('didLoad %o', this.app.type);
    this.app[isReady] = true;
  }
}
