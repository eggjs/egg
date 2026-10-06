import assert from 'node:assert';

import { TeggScope } from '@eggjs/tegg-types';
import type { EggRuntimeContext } from '@eggjs/tegg-types';

type runInContextCallback<R = any> = (context: EggRuntimeContext, fn: () => Promise<R>) => Promise<R>;

interface ContextCallbacks {
  getContextCallback?: () => EggRuntimeContext | undefined;
  runInContextCallback?: runInContextCallback;
}

const CONTEXT_CALLBACK_SLOT = Symbol('tegg:runtime:contextCallback');

/**
 * The per-app request-context callbacks (read + run bridges). Each app installs
 * its own (capturing its ctxStorage / currentContext) into its TeggScope bag, so
 * concurrent apps no longer clobber a single process-global pair. With no active
 * scope it resolves to the single process-default bag (single-app / tests).
 */
function callbacks(): ContextCallbacks {
  return TeggScope.resolve(CONTEXT_CALLBACK_SLOT, () => ({}) as ContextCallbacks, 'ContextHandler.callbacks');
}

export class ContextHandler {
  static get getContextCallback(): (() => EggRuntimeContext | undefined) | undefined {
    return callbacks().getContextCallback;
  }

  static set getContextCallback(cb: () => EggRuntimeContext | undefined) {
    callbacks().getContextCallback = cb;
  }

  static get runInContextCallback(): runInContextCallback | undefined {
    return callbacks().runInContextCallback;
  }

  static set runInContextCallback(cb: runInContextCallback) {
    callbacks().runInContextCallback = cb;
  }

  static getContext(): EggRuntimeContext | undefined {
    // No installed callback means there is no active app/request context to
    // read (e.g. a singleton service or detached logger called outside any
    // scope). That is a valid "no context" state, so resolve to undefined
    // instead of throwing — matching the pre-scoping global behavior where the
    // process-wide callback stayed set after boot. Multi-app escape detection
    // is handled by the TeggScope fuse on `callbacks()`, not by this assert.
    const cb = callbacks().getContextCallback;
    return cb ? cb() : undefined;
  }

  static run<R = any>(context: EggRuntimeContext, fn: () => Promise<R>): Promise<R> {
    const cb = callbacks().runInContextCallback;
    assert(cb, 'runInContextCallback not set');
    return cb(context, fn);
  }
}
