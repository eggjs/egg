import type { AsyncLocalStorage } from 'node:async_hooks';
import type EggContext from '../app/extend/context.js';
import type { EggLogger } from 'egg-logger';

declare module '@eggjs/core' {
  // add EggApplicationCore overrides types
  interface EggCore {
    inspect(): any;
    get currentContext(): EggContext | undefined;
    ctxStorage: AsyncLocalStorage<EggContext>;
    get logger(): EggLogger;
    get coreLogger(): EggLogger;
    getLogger(name: string): EggLogger;
  }
}
