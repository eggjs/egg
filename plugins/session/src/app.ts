import type { ILifecycleBoot, Application } from 'egg';

import { SessionConfig } from './config/config.default.ts';

export default class AppBoot implements ILifecycleBoot {
  private readonly app;

  constructor(app: Application) {
    this.app = app;
  }

  configWillLoad() {
    const app = this.app;
    SessionConfig.parse(app.config.session);

    if (!app.config.session.httpOnly) {
      app.coreLogger.warn(
        '[@eggjs/session]: please set `config.session.httpOnly` to true. It is very dangerous if session can read by client JavaScript.'
      );
    }
    app.config.coreMiddleware.push('session');
    // listen on session's events
    app.on('session:missed', ({ ctx, key }) => {
      ctx.coreLogger.warn('[session][missed] key(%s)', key);
    });
    app.on('session:expired', ({ ctx, key, value }) => {
      ctx.coreLogger.warn('[session][expired] key(%s) value(%j)', key, app.config.session.logValue ? value : '');
    });
    app.on('session:invalid', ({ ctx, key, value }) => {
      ctx.coreLogger.warn('[session][invalid] key(%s) value(%j)', key, app.config.session.logValue ? value : '');
    });
  }
}
