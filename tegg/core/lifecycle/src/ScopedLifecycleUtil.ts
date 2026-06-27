import type { LifecycleContext, LifecycleObject } from '@eggjs/tegg-types';
import { TeggScope, type TeggScopeBag } from '@eggjs/tegg-types';

import { LifecycleUtil } from './LifycycleUtil.ts';

/**
 * Get-or-create the concrete per-app {@link LifecycleUtil} stored at `slot` in a
 * specific bag. Used to **pin** a lifecycle util to a known app's bag
 * (`app._teggScopeBag`) without depending on the active async scope — e.g. the
 * `app.xxxLifecycleUtil` facades, so plugins can register hooks during boot
 * WITHOUT wrapping every call in `TeggScope.run(...)`.
 */
export function lifecycleUtilFromBag<T extends LifecycleContext, R extends LifecycleObject<T>>(
  bag: TeggScopeBag,
  slot: symbol,
): LifecycleUtil<T, R> {
  let util = bag.get(slot) as LifecycleUtil<T, R> | undefined;
  if (!util) {
    util = new LifecycleUtil<T, R>();
    bag.set(slot, util);
  }
  return util;
}

/**
 * Create a per-app {@link LifecycleUtil} facade backed by {@link TeggScope}.
 *
 * The returned object has the same shape/type as a `LifecycleUtil`, but every
 * method resolves the per-app instance from the active {@link TeggScope} bag (the
 * SAME instance {@link lifecycleUtilFromBag} returns for that bag). This lets
 * module-level lifecycle-util singletons (e.g. `EggPrototypeLifecycleUtil`)
 * become per-app WITHOUT changing any call site, so hooks fired deep in
 * metadata/runtime (where there is no `app` reference) hit the current app's util.
 *
 * It is an explicit delegating object (NOT a Proxy) — each call is one slot
 * resolve + a direct method call, with no per-access trap or bound-function
 * allocation.
 */
export function createScopedLifecycleUtil<T extends LifecycleContext, R extends LifecycleObject<T>>(
  slot: symbol,
  desc: string,
): LifecycleUtil<T, R> {
  const get = (): LifecycleUtil<T, R> => TeggScope.resolve(slot, () => new LifecycleUtil<T, R>(), desc);
  const facade: Pick<
    LifecycleUtil<T, R>,
    | 'registerLifecycle'
    | 'deleteLifecycle'
    | 'getLifecycleList'
    | 'registerObjectLifecycle'
    | 'deleteObjectLifecycle'
    | 'clearObjectLifecycle'
    | 'getObjectLifecycleList'
    | 'objectPreCreate'
    | 'objectPostCreate'
    | 'objectPreDestroy'
    | 'getLifecycleHook'
  > = {
    registerLifecycle: (lifecycle) => get().registerLifecycle(lifecycle),
    deleteLifecycle: (lifecycle) => get().deleteLifecycle(lifecycle),
    getLifecycleList: () => get().getLifecycleList(),
    registerObjectLifecycle: (obj, lifecycle) => get().registerObjectLifecycle(obj, lifecycle),
    deleteObjectLifecycle: (obj, lifecycle) => get().deleteObjectLifecycle(obj, lifecycle),
    clearObjectLifecycle: (obj) => get().clearObjectLifecycle(obj),
    getObjectLifecycleList: (obj) => get().getObjectLifecycleList(obj),
    objectPreCreate: (ctx, obj) => get().objectPreCreate(ctx, obj),
    objectPostCreate: (ctx, obj) => get().objectPostCreate(ctx, obj),
    objectPreDestroy: (ctx, obj) => get().objectPreDestroy(ctx, obj),
    getLifecycleHook: (hookName, proto) => get().getLifecycleHook(hookName, proto),
  };
  return facade as LifecycleUtil<T, R>;
}
