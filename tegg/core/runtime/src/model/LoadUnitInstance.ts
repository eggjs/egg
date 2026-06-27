import { createScopedLifecycleUtil, lifecycleUtilFromBag, type LifecycleUtil } from '@eggjs/lifecycle';
import type { LoadUnitInstance, LoadUnitInstanceLifecycleContext, TeggScopeBag } from '@eggjs/tegg-types';

const LOAD_UNIT_INSTANCE_LIFECYCLE_UTIL_SLOT = Symbol('tegg:runtime:loadUnitInstanceLifecycleUtil');

export const LoadUnitInstanceLifecycleUtil: LifecycleUtil<LoadUnitInstanceLifecycleContext, LoadUnitInstance> =
  createScopedLifecycleUtil<LoadUnitInstanceLifecycleContext, LoadUnitInstance>(
    LOAD_UNIT_INSTANCE_LIFECYCLE_UTIL_SLOT,
    'LoadUnitInstanceLifecycleUtil',
  );

/** Resolve this app's load-unit-instance lifecycle util directly from its bag (no active scope needed). */
export function loadUnitInstanceLifecycleUtilFromBag(
  bag: TeggScopeBag,
): LifecycleUtil<LoadUnitInstanceLifecycleContext, LoadUnitInstance> {
  return lifecycleUtilFromBag(bag, LOAD_UNIT_INSTANCE_LIFECYCLE_UTIL_SLOT);
}
