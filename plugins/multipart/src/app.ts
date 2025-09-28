import type { EggCore, ILifecycleBoot } from '@eggjs/core';
import { normalizeOptions } from './lib/utils.js';

export default class AppBootHook implements ILifecycleBoot {
  constructor(private app: EggCore) {}

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
