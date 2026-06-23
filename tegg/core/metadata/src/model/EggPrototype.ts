import { createScopedLifecycleUtil, type LifecycleUtil } from '@eggjs/lifecycle';
import type { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/tegg-types';

const EGG_PROTOTYPE_LIFECYCLE_UTIL_SLOT = Symbol('tegg:metadata:eggPrototypeLifecycleUtil');

/**
 * Per-app prototype lifecycle util, backed by TeggScope. Hooks registered during
 * one app's boot stay isolated to that app under concurrent multi-app.
 */
export const EggPrototypeLifecycleUtil: LifecycleUtil<EggPrototypeLifecycleContext, EggPrototype> =
  createScopedLifecycleUtil<EggPrototypeLifecycleContext, EggPrototype>(
    EGG_PROTOTYPE_LIFECYCLE_UTIL_SLOT,
    'EggPrototypeLifecycleUtil',
  );
