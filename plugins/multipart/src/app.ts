import type { Application, ILifecycleBoot } from 'egg';

import { normalizeOptions } from './lib/utils.ts';

export default class AppBootHook implements ILifecycleBoot {
  private readonly app;
  constructor(app: Application) {
    this.app = app;
  }

  configWillLoad() {
    this.app.config.multipart = normalizeOptions(this.app.config.multipart);
    const options = this.app.config.multipart;

    this.app.coreLogger.info('[@eggjs/multipart] %s mode enable', options.mode);
    if (options.mode === 'file' || options.fileModeMatch) {
      this.app.coreLogger.info(
        '[@eggjs/multipart] will save temporary files to %j, cleanup job cron: %j',
        options.tmpdir,
        options.cleanSchedule.cron
      );
      // enable multipart middleware
      this.app.config.coreMiddleware.push('multipart');
    }
  }
}
