import { createScopedLifecycleUtil, lifecycleUtilFromBag, type LifecycleUtil } from '@eggjs/lifecycle';
import type { EggObject, EggObjectLifeCycleContext, TeggScopeBag } from '@eggjs/tegg-types';

const EGG_OBJECT_LIFECYCLE_UTIL_SLOT = Symbol('tegg:runtime:eggObjectLifecycleUtil');

export const EggObjectLifecycleUtil: LifecycleUtil<EggObjectLifeCycleContext, EggObject> = createScopedLifecycleUtil<
  EggObjectLifeCycleContext,
  EggObject
>(EGG_OBJECT_LIFECYCLE_UTIL_SLOT, 'EggObjectLifecycleUtil');

/** Resolve this app's egg-object lifecycle util directly from its bag (no active scope needed). */
export function eggObjectLifecycleUtilFromBag(bag: TeggScopeBag): LifecycleUtil<EggObjectLifeCycleContext, EggObject> {
  return lifecycleUtilFromBag(bag, EGG_OBJECT_LIFECYCLE_UTIL_SLOT);
}
