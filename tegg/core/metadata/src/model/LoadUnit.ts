import { createScopedLifecycleUtil, type LifecycleUtil } from '@eggjs/lifecycle';
import type { LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg-types';

const LOAD_UNIT_LIFECYCLE_UTIL_SLOT = Symbol('tegg:metadata:loadUnitLifecycleUtil');

export const LoadUnitLifecycleUtil: LifecycleUtil<LoadUnitLifecycleContext, LoadUnit> = createScopedLifecycleUtil<
  LoadUnitLifecycleContext,
  LoadUnit
>(LOAD_UNIT_LIFECYCLE_UTIL_SLOT, 'LoadUnitLifecycleUtil');
