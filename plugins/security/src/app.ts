import type { ILifecycleBoot, EggCore } from '@eggjs/core';
import { preprocessConfig } from './lib/utils.js';
import { SecurityConfig } from './config/config.default.js';

export default class AppBoot implements ILifecycleBoot {
  private readonly app;

  constructor(app: EggCore) {
    this.app = app;
  }

  configWillLoad() {
    const app = this.app;
    app.config.coreMiddleware.push('securities');
    // parse config and check if config is legal
    const parsed = SecurityConfig.parse(app.config.security);
    if (typeof app.config.security.csrf === 'boolean') {
      // support old config: `config.security.csrf = false`
      app.config.security.csrf = parsed.csrf;
    }

    if (app.config.security.csrf.enable) {
      const { ignoreJSON } = app.config.security.csrf;
      if (ignoreJSON) {
        app.deprecate('[@eggjs/security/app] `config.security.csrf.ignoreJSON` is not safe now, please disable it.');
      }
    }

    preprocessConfig(app.config.security);
  }
}
