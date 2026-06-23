import type { LifecycleContext, LifecycleObject } from '@eggjs/tegg-types';
import { TeggScope } from '@eggjs/tegg-types';

import { LifecycleUtil } from './LifycycleUtil.ts';

/**
 * Create a per-app {@link LifecycleUtil} facade backed by {@link TeggScope}.
 *
 * The returned object has the exact same shape/type as a `LifecycleUtil`, but
 * every property/method access transparently resolves the per-app instance from
 * the active {@link TeggScope} bag (lazily created on first use), falling back to
 * the process-default bag when no scope is active (single-app lazy default).
 *
 * This lets module-level lifecycle-util singletons (e.g. `EggPrototypeLifecycleUtil`)
 * become per-app WITHOUT changing any call site: hooks registered during one
 * app's boot land in that app's util, and concurrent apps never cross-fire.
 */
export function createScopedLifecycleUtil<T extends LifecycleContext, R extends LifecycleObject<T>>(
  slot: symbol,
  desc: string,
): LifecycleUtil<T, R> {
  const resolve = (): LifecycleUtil<T, R> => TeggScope.resolve(slot, () => new LifecycleUtil<T, R>(), desc);
  // The placeholder target keeps `instanceof LifecycleUtil` working; all real
  // reads/writes are forwarded to the per-app instance resolved from the scope.
  const placeholder = new LifecycleUtil<T, R>();
  return new Proxy(placeholder, {
    get(_target, prop) {
      const real = resolve();
      const value = Reflect.get(real as object, prop, real);
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(real) : value;
    },
    set(_target, prop, value) {
      return Reflect.set(resolve() as object, prop, value);
    },
    has(_target, prop) {
      return Reflect.has(resolve() as object, prop);
    },
  });
}
