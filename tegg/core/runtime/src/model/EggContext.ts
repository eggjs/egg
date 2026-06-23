import { createScopedLifecycleUtil, lifecycleUtilFromBag, type LifecycleUtil } from '@eggjs/lifecycle';
import type { EggRuntimeContext, EggContextLifecycleContext, TeggScopeBag } from '@eggjs/tegg-types';

const EGG_CONTEXT_LIFECYCLE_UTIL_SLOT = Symbol('tegg:runtime:eggContextLifecycleUtil');

export const EggContextLifecycleUtil: LifecycleUtil<EggContextLifecycleContext, EggRuntimeContext> =
  createScopedLifecycleUtil<EggContextLifecycleContext, EggRuntimeContext>(
    EGG_CONTEXT_LIFECYCLE_UTIL_SLOT,
    'EggContextLifecycleUtil',
  );

/** Resolve this app's egg-context lifecycle util directly from its bag (no active scope needed). */
export function eggContextLifecycleUtilFromBag(
  bag: TeggScopeBag,
): LifecycleUtil<EggContextLifecycleContext, EggRuntimeContext> {
  return lifecycleUtilFromBag(bag, EGG_CONTEXT_LIFECYCLE_UTIL_SLOT);
}
