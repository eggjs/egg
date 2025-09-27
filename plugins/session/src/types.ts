import type { SessionConfig } from './config/config.default.js';
import type { SessionStoreOrAppSessionStoreClass, SessionStore } from './app/extend/application.js';

declare module '@eggjs/core' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    session: SessionConfig;
  }

  interface EggCore {
    // add EggCore instance property
    set sessionStore(store: SessionStoreOrAppSessionStoreClass | null | undefined);
    get sessionStore(): SessionStore | undefined;
  }
}
