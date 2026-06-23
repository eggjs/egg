import { createScopedLifecycleUtil, type LifecycleUtil } from '@eggjs/lifecycle';
import type { EggObject, EggObjectLifeCycleContext } from '@eggjs/tegg-types';

const EGG_OBJECT_LIFECYCLE_UTIL_SLOT = Symbol('tegg:runtime:eggObjectLifecycleUtil');

export const EggObjectLifecycleUtil: LifecycleUtil<EggObjectLifeCycleContext, EggObject> = createScopedLifecycleUtil<
  EggObjectLifeCycleContext,
  EggObject
>(EGG_OBJECT_LIFECYCLE_UTIL_SLOT, 'EggObjectLifecycleUtil');
