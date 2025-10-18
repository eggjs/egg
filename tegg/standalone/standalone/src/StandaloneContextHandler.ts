import { AsyncLocalStorage } from 'node:async_hooks';

import { ContextHandler, type EggContext } from '@eggjs/tegg-runtime';

export class StandaloneContextHandler {
  static storage = new AsyncLocalStorage<EggContext>();

  static register() {
    ContextHandler.getContextCallback = () => {
      return StandaloneContextHandler.storage.getStore();
    };

    ContextHandler.runInContextCallback = (context, fn) => {
      return StandaloneContextHandler.storage.run(context, fn);
    };
  }
}
