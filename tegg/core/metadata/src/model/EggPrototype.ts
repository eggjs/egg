import { defineScopedLifecycleUtil } from '@eggjs/lifecycle';
import type { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/tegg-types';

/**
 * Per-app prototype lifecycle util, backed by TeggScope. Hooks registered during
 * one app's boot stay isolated to that app under concurrent multi-app.
 */
export const [EggPrototypeLifecycleUtil, eggPrototypeLifecycleUtilFromBag] = defineScopedLifecycleUtil<
  EggPrototypeLifecycleContext,
  EggPrototype
>(Symbol('tegg:metadata:eggPrototypeLifecycleUtil'), 'EggPrototypeLifecycleUtil');
