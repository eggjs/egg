import { ContextProto, Inject, SingletonProto } from '@eggjs/core-decorator';

import { type AppCache } from './AppCache.ts';

@ContextProto()
export class CountService {
  @Inject()
  appCache: AppCache;

  async getCount(): Promise<number> {
    return this.appCache.getCount();
  }
}

@SingletonProto()
export class SingletonCountService {
  @Inject()
  appCache: AppCache;

  async getCount(): Promise<number> {
    return this.appCache.getCount();
  }
}
