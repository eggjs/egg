import { createScopedLifecycleUtil, type LifecycleUtil } from '@eggjs/lifecycle';
import type { EggRuntimeContext, EggContextLifecycleContext } from '@eggjs/tegg-types';

const EGG_CONTEXT_LIFECYCLE_UTIL_SLOT = Symbol('tegg:runtime:eggContextLifecycleUtil');

export const EggContextLifecycleUtil: LifecycleUtil<EggContextLifecycleContext, EggRuntimeContext> =
  createScopedLifecycleUtil<EggContextLifecycleContext, EggRuntimeContext>(
    EGG_CONTEXT_LIFECYCLE_UTIL_SLOT,
    'EggContextLifecycleUtil',
  );
