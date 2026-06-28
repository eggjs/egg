import { createScopedLifecycleUtil, lifecycleUtilFromBag, type LifecycleUtil } from '@eggjs/lifecycle';
import type { LoadUnit, LoadUnitLifecycleContext, TeggScopeBag } from '@eggjs/tegg-types';

const LOAD_UNIT_LIFECYCLE_UTIL_SLOT = Symbol('tegg:metadata:loadUnitLifecycleUtil');

export const LoadUnitLifecycleUtil: LifecycleUtil<LoadUnitLifecycleContext, LoadUnit> = createScopedLifecycleUtil<
  LoadUnitLifecycleContext,
  LoadUnit
>(LOAD_UNIT_LIFECYCLE_UTIL_SLOT, 'LoadUnitLifecycleUtil');

/** Resolve this app's load-unit lifecycle util directly from its bag (no active scope needed). */
export function loadUnitLifecycleUtilFromBag(bag: TeggScopeBag): LifecycleUtil<LoadUnitLifecycleContext, LoadUnit> {
  return lifecycleUtilFromBag(bag, LOAD_UNIT_LIFECYCLE_UTIL_SLOT);
}
