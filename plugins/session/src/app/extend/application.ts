import assert from 'node:assert';
import { EggCore } from '@eggjs/core';
import type { SessionConfig } from '../../config/config.default.js';

export type SessionStore = Required<SessionConfig>['store'];

export type SessionStoreOrAppSessionStoreClass =
  | SessionStore
  | {
      new (app: Application): SessionStore;
    };

export default class Application extends EggCore {
  /**
   * set session external store
   *
   * ```js
   * app.sessionStore = {
   *   get(key): Promise<unknown>,
   *   set(key, data): Promise<void>,
   *   destroy(key): Promise<void>,
   * };
   *
   * app.sessionStore = class SessionStore {
   *   constructor(app) {
   *   }
   *   get(key): Promise<unknown>,
   *   set(key, data): Promise<void>,
   *   destroy(key): Promise<void>,
   * }
   * ```
   * @param {Class|Object} store session store class or instance
   */
  set sessionStore(store: SessionStoreOrAppSessionStoreClass | null | undefined) {
    if (this.config.session.store && this.config.env !== 'unittest') {
      this.coreLogger.warn('[@eggjs/session] sessionStore already exists and will be overwrite');
    }

    // support this.sessionStore = null to disable external store
    if (!store) {
      this.config.session.store = undefined;
      this.coreLogger.info('[@eggjs/session] sessionStore is disabled');
      return;
    }

    if (typeof store === 'function') {
      store = new store(this);
    }
    assert(typeof store.get === 'function', 'store.get must be function');
    assert(typeof store.set === 'function', 'store.set must be function');
    assert(typeof store.destroy === 'function', 'store.destroy must be function');
    this.config.session.store = store;
  }

  /**
   * get sessionStore instance
   */
  get sessionStore(): SessionStore | undefined {
    return this.config.session.store;
  }
}
