import type { Application, ILifecycleBoot } from 'egg';

export class Boot implements ILifecycleBoot {
  private readonly app;
  constructor(app: Application) {
    this.app = app;
  }

  async didLoad() {
    // reload logger to new fd after rotating
    this.app.messenger.on('log-reload', () => {
      this.app.loggers.reload();
      this.app.coreLogger.info('[@eggjs/logrotator] %s logger reload: got log-reload message', this.app.type);
    });
  }
}
