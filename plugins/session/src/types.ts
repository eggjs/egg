import type { SessionConfig } from './config/config.default.ts';
import type { SessionStoreOrAppSessionStoreClass, SessionStore } from './app/extend/application.ts';

declare module 'egg' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    session: SessionConfig;
  }

  interface Application {
    // add Application instance property
    set sessionStore(store: SessionStoreOrAppSessionStoreClass | null | undefined);
    get sessionStore(): SessionStore | undefined;
  }
}
