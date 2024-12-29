import { AsyncLocalStorage } from 'node:async_hooks';
import { ContextDelegation } from '../app/extend/context.js';

declare module '@eggjs/core' {
  // add EggApplicationCore overrides types
  interface EggCore {
    inspect(): any;
    get currentContext(): ContextDelegation | undefined;
    ctxStorage: AsyncLocalStorage<ContextDelegation>;
  }
}
