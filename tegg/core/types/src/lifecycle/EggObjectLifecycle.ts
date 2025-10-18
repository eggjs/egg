import type { EggObject, EggObjectLifeCycleContext } from '../runtime/index.ts';

/**
 * lifecycle hook interface for egg object
 */
export interface EggObjectLifecycle {
  /**
   * call before project load
   */
  preLoad?(ctx: EggObjectLifeCycleContext): Promise<void>;
  /**
   * call after construct
   */
  postConstruct?(ctx: EggObjectLifeCycleContext, eggObj: EggObject): Promise<void>;

  /**
   * call before inject deps
   */
  preInject?(ctx: EggObjectLifeCycleContext, eggObj: EggObject): Promise<void>;

  /**
   * call after inject deps
   */
  postInject?(ctx: EggObjectLifeCycleContext, eggObj: EggObject): Promise<void>;

  /**
   * before object is ready
   */
  init?(ctx: EggObjectLifeCycleContext, eggObj: EggObject): Promise<void>;

  /**
   * call before destroy
   */
  preDestroy?(ctx: EggObjectLifeCycleContext, eggObj: EggObject): Promise<void>;

  /**
   * destroy the object
   */
  destroy?(ctx: EggObjectLifeCycleContext, eggObj: EggObject): Promise<void>;
}

export type LifecycleHookName = keyof EggObjectLifecycle;
