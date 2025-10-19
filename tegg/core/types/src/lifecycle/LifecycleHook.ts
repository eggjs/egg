import type { IdenticalObject } from './IdenticalObject.ts';

export interface LifecycleContext {}

export interface LifecycleObject<T extends LifecycleContext> extends IdenticalObject {
  preLoad?(): Promise<void>;
  init?(ctx: T): Promise<void>;
  destroy?(ctx: T): Promise<void>;
}

export interface LifecycleHook<T extends LifecycleContext, R extends LifecycleObject<T>> {
  // called after obj constructor
  preCreate?(ctx: T, obj: R): Promise<void>;
  // called after all preCreate done and properties injected
  postCreate?(ctx: T, obj: R): Promise<void>;
  // call before destroy obj
  preDestroy?(ctx: T, obj: R): Promise<void>;
}
