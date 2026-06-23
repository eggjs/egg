import { createScopedLifecycleUtil, type LifecycleUtil } from '@eggjs/lifecycle';
import type { LoadUnitInstance, LoadUnitInstanceLifecycleContext } from '@eggjs/tegg-types';

const LOAD_UNIT_INSTANCE_LIFECYCLE_UTIL_SLOT = Symbol('tegg:runtime:loadUnitInstanceLifecycleUtil');

export const LoadUnitInstanceLifecycleUtil: LifecycleUtil<LoadUnitInstanceLifecycleContext, LoadUnitInstance> =
  createScopedLifecycleUtil<LoadUnitInstanceLifecycleContext, LoadUnitInstance>(
    LOAD_UNIT_INSTANCE_LIFECYCLE_UTIL_SLOT,
    'LoadUnitInstanceLifecycleUtil',
  );
