import type { EggContainer } from './EggContainer.ts';

export interface EggContextLifecycleContext {}

export interface EggRuntimeContext extends EggContainer<EggContextLifecycleContext> {
  // ctx get/set method
  get(key: string | symbol): any | undefined;
  set(key: string | symbol, val: any): void;
}
