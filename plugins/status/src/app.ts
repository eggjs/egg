import assert from 'node:assert/strict';

import type { Application, ILifecycleBoot } from 'egg';

export default class AppBoot implements ILifecycleBoot {
  private readonly app;

  constructor(app: Application) {
    this.app = app;
  }

  configWillLoad(): void {
    const coreMiddleware = this.app.config.coreMiddleware;
    const index = coreMiddleware.indexOf('meta');
    assert(index >= 0, 'meta middleware not exists');
    coreMiddleware.splice(index + 1, 0, 'status');
  }
}
