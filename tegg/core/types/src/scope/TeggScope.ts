import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The per-app scope "bag": a type-free container keyed by per-package symbols.
 *
 * Each tegg package defines its own slot {@link symbol} and its own concrete
 * fallback, and reads/writes ONLY its own slot. No package imports another
 * package's slot — the bag is the single shared, type-agnostic carrier. The
 * aggregating "TeggRuntime" convenience that knows the concrete types lives in a
 * higher layer (plugin/tegg, standalone Runner) where importing metadata +
 * runtime is legal; it builds the bag and wraps boot/request in
 * {@link TeggScope.run}.
 */
export type TeggScopeBag = Map<symbol, unknown>;

const als = new AsyncLocalStorage<TeggScopeBag>();

/**
 * Number of explicitly-established app scopes currently alive in the process.
 * Incremented by every tegg app/Runner at boot ({@link TeggScope.registerScope})
 * and decremented at close ({@link TeggScope.unregisterScope}).
 *
 * Drives the strict-mode escape fuse: while MORE THAN ONE app is alive (true
 * multi-app), falling back to the process-default bag is treated as a scope
 * escape bug. With a single app (or none) the silent lazy default is kept so
 * existing single-app code and tests are unaffected.
 */
let explicitScopeCount = 0;

/**
 * Process-wide default bag, used when no ALS scope is active. In single-app mode
 * this IS the app's effective storage (the lazy default). Created on demand so
 * every fallback slot lands in the SAME bag and stays cross-consistent (e.g. a
 * factory created in the default bag references the lifecycle util also in the
 * default bag). Tests may install/reset it explicitly.
 */
let defaultBag: TeggScopeBag | undefined;

function isProduction(): boolean {
  // Follow the egg/tegg convention: prefer EGG_SERVER_ENV, then NODE_ENV.
  const serverEnv = process.env.EGG_SERVER_ENV;
  if (serverEnv) {
    return serverEnv === 'prod';
  }
  return process.env.NODE_ENV === 'production';
}

function reportEscape(desc: string): void {
  const err = new Error(
    `[tegg] TeggScope escaped to the process-default bag under multi-app mode (${desc}). ` +
      'A per-app scope was expected but none is active — the access likely happened ' +
      'outside TeggScope.run(app scope, ...). This would cross-talk between apps.',
  );
  if (!isProduction()) {
    throw err;
  }
  // Production: do not crash a running service; surface loudly instead.
  // eslint-disable-next-line no-console
  console.warn(err.stack);
}

/**
 * Type-free, lowest-level async scope container for tegg multi-app isolation.
 *
 * It owns ONLY the AsyncLocalStorage, the scope counter, and the strict-mode
 * escape fuse. It knows nothing about concrete factories/managers — those are
 * resolved by each package via {@link TeggScope.resolve} / {@link TeggScope.getOr}
 * against its own slot.
 */
export class TeggScope {
  /** The bag for the currently active async scope, if any. */
  static current(): TeggScopeBag | undefined {
    return als.getStore();
  }

  /** Run `fn` with `bag` as the active scope. Synchronous or async `fn`. */
  static run<R>(bag: TeggScopeBag, fn: () => R): R {
    return als.run(bag, fn);
  }

  /** Create a fresh, empty per-app bag. */
  static createBag(): TeggScopeBag {
    return new Map();
  }

  /** Mark that an explicit per-app scope has been established (boot). */
  static registerScope(): void {
    explicitScopeCount++;
  }

  /** Mark that a previously-established per-app scope has been torn down (close). */
  static unregisterScope(): void {
    if (explicitScopeCount > 0) {
      explicitScopeCount--;
    }
  }

  /** True when more than one app scope is alive — genuine multi-app mode. */
  static get isMultiApp(): boolean {
    return explicitScopeCount > 1;
  }

  /** Number of live explicit app scopes. */
  static get scopeCount(): number {
    return explicitScopeCount;
  }

  /**
   * Resolve a lazily-materialized per-app singleton (factory / manager / cache).
   *
   * - inside a scope: lazily create via `create()` and memoize in the active bag;
   * - no scope: lazily create+memoize in the single process-default bag
   *   (single-app lazy default). Under multi-app, hitting the default bag is
   *   reported as an escape (dev throw / prod warn).
   *
   * `create()` may reference sibling slots' static facades (e.g. `X.instance`);
   * because they resolve against the SAME bag, cross-slot dependencies stay
   * consistent in both scoped and default modes.
   */
  static resolve<T>(slot: symbol, create: () => T, desc: string): T {
    // Single `getStore()`; the in-scope path (the common case) never reaches the
    // escape check. Single-app never escapes (isMultiApp is false).
    const bag = als.getStore();
    if (bag) {
      return TeggScope.#getOrCreate(bag, slot, create);
    }
    if (TeggScope.isMultiApp) {
      reportEscape(desc);
    }
    return TeggScope.#getOrCreate((defaultBag ??= new Map()), slot, create);
  }

  /**
   * Read a "set later, may be undefined" slot (e.g. globalGraph, context
   * callbacks). The active bag (scoped, or the single process-default bag) is the
   * source of truth; `legacy()` only supplies the initial value before any set.
   */
  static getOr<T>(slot: symbol, legacy: () => T | undefined, desc: string): T | undefined {
    const bag = als.getStore();
    if (bag) {
      return bag.has(slot) ? (bag.get(slot) as T) : legacy();
    }
    if (TeggScope.isMultiApp) {
      reportEscape(desc);
    }
    const d = (defaultBag ??= new Map());
    return d.has(slot) ? (d.get(slot) as T) : legacy();
  }

  /**
   * Write a slot into the active bag (scoped, or the single process-default bag).
   * Always succeeds; returns true for symmetry with earlier call sites.
   */
  static set(slot: symbol, value: unknown): boolean {
    TeggScope.#activeBag().set(slot, value);
    return true;
  }

  /**
   * @internal Install an explicit process-default bag (test harnesses that run
   * outside any {@link TeggScope.run}). Lets deprecated static accesses resolve
   * to the same per-test bag.
   */
  static _setDefaultBag(bag: TeggScopeBag | undefined): void {
    defaultBag = bag;
  }

  /** @internal Reset the process-default bag (e.g. between tests). */
  static _resetDefaultBag(): void {
    defaultBag = undefined;
  }

  /** @internal The current process-default bag, if any. */
  static _getDefaultBag(): TeggScopeBag | undefined {
    return defaultBag;
  }

  /**
   * The active bag: the current ALS scope's bag, or the single lazily-created
   * process-default bag when no scope is active. Routing every no-scope fallback
   * (resolve / getOr / set / context callbacks) through ONE bag keeps all slots
   * mutually consistent in single-app / test paths.
   */
  static #activeBag(): TeggScopeBag {
    const store = als.getStore();
    if (store) {
      return store;
    }
    if (!defaultBag) {
      defaultBag = new Map();
    }
    return defaultBag;
  }

  static #getOrCreate<T>(bag: TeggScopeBag, slot: symbol, create: () => T): T {
    if (!bag.has(slot)) {
      bag.set(slot, create());
    }
    return bag.get(slot) as T;
  }
}
