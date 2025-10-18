import { SingletonProto } from '@eggjs/core-decorator';

import type { ICache, CacheValue } from './Cache.ts';

@SingletonProto({
  name: 'cache',
})
export default class SingletonCache implements ICache {
  private map = new Map();

  get(key: string): CacheValue {
    const val = this.map.get(key);
    return {
      val,
      from: 'singleton',
    };
  }

  set(key: string, val: string) {
    this.map.set(key, val);
  }
}
