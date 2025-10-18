import { AsyncLocalStorage } from 'node:async_hooks';

import type { EggRuntimeContext } from '@eggjs/tegg-types';

import { ContextHandler } from '../../src/index.ts';

export class EggContextStorage {
  static storage = new AsyncLocalStorage<EggRuntimeContext>();

  static register() {
    ContextHandler.getContextCallback = () => {
      return EggContextStorage.storage.getStore();
    };
    ContextHandler.runInContextCallback = (context: EggRuntimeContext, fn: () => Promise<any>) => {
      return EggContextStorage.storage.run(context, fn);
    };
  }
}
