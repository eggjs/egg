import type { EggCore, ILifecycleBoot } from '@eggjs/core';

export class Boot implements ILifecycleBoot {
  constructor(private readonly app: EggCore) {}

  async didLoad() {
    // reload logger to new fd after rotating
    this.app.messenger.on('log-reload', () => {
      this.app.loggers.reload();
      this.app.coreLogger.info('[@eggjs/logrotator] %s logger reload: got log-reload message', this.app.type);
    });
  }
}
